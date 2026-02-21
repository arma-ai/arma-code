"""
Tests for JWT logout + token blacklist functionality.

Since python-jose is not installed in the isolated test environment, we stub
it in conftest.py. These tests verify the *blacklist logic* (Redis
store/lookup, fail-open on Redis unavailability) rather than the JWT
encode/decode internals (those are covered by integration tests when the full
deps are available).
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# ── Make sure conftest stubs are applied before any app import ──────────────
# (conftest.py runs before this file, so sys.modules already has jose stub)
import app.core.security as _sec


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def in_memory_redis():
    """AsyncMock Redis backed by an in-memory dict."""
    store: dict = {}

    redis = AsyncMock()

    async def _setex(key, ttl, val):
        store[key] = val

    async def _get(key):
        return store.get(key)

    redis.setex = _setex
    redis.get = _get
    redis.ping = AsyncMock(return_value=True)

    return redis, store


# ── create_access_token / decode_access_token ────────────────────────────────

class TestCreateAccessToken:
    """Verify that create_access_token embeds required claims."""

    def test_token_is_string(self):
        """create_access_token must return a string (even when jose is stubbed)."""
        # With stubbed jose, jwt.encode returns the MagicMock default, which is
        # truthy. We just verify it returns something without raising.
        token = _sec.create_access_token({"sub": "user-1"})
        assert token is not None

    def test_jti_is_uuid_added_to_payload(self):
        """The jti claim must be injected as a UUID4 string."""
        captured = {}

        def fake_encode(payload, *args, **kwargs):
            captured.update(payload)
            return "stubtoken"

        with patch.object(_sec.jwt, "encode", side_effect=fake_encode):
            _sec.create_access_token({"sub": "user-1"})

        assert "jti" in captured
        # UUID4 = 36 chars (8-4-4-4-12)
        assert len(captured["jti"]) == 36

    def test_iat_claim_added(self):
        """The iat (issued-at) claim must be present."""
        captured = {}

        def fake_encode(payload, *args, **kwargs):
            captured.update(payload)
            return "stubtoken"

        with patch.object(_sec.jwt, "encode", side_effect=fake_encode):
            _sec.create_access_token({"sub": "user-2"})

        assert "iat" in captured

    def test_each_call_produces_unique_jti(self):
        """Two consecutive tokens must have different jtis."""
        jtis = []

        def fake_encode(payload, *args, **kwargs):
            jtis.append(payload.get("jti"))
            return "stubtoken"

        with patch.object(_sec.jwt, "encode", side_effect=fake_encode):
            _sec.create_access_token({"sub": "user-3"})
            _sec.create_access_token({"sub": "user-3"})

        assert len(jtis) == 2
        assert jtis[0] != jtis[1]


# ── blacklist_token ───────────────────────────────────────────────────────────

class TestBlacklistToken:
    """Verify blacklist_token stores the token's jti in Redis."""

    @pytest.mark.asyncio
    async def test_blacklist_stores_jti_key(self, in_memory_redis):
        redis, store = in_memory_redis

        # Make decode return a valid payload with a known jti
        import time
        fake_payload = {
            "sub": "user-1",
            "jti": "test-jti-12345",
            "exp": int(time.time()) + 3600,
        }
        with patch.object(_sec.jwt, "decode", return_value=fake_payload), \
             patch.object(_sec, "_redis_client", redis):
            result = await _sec.blacklist_token("any.token.value")

        assert result is True
        matching = [k for k in store if "test-jti-12345" in k]
        assert len(matching) == 1

    @pytest.mark.asyncio
    async def test_blacklist_returns_false_for_invalid_token(self, in_memory_redis):
        redis, store = in_memory_redis

        # Simulate decode failure — _sec.JWTError is our conftest stub exception class
        with patch.object(_sec.jwt, "decode", side_effect=_sec.JWTError("bad")), \
             patch.object(_sec, "_redis_client", redis):
            result = await _sec.blacklist_token("bad.token")

        assert result is False

    @pytest.mark.asyncio
    async def test_blacklist_returns_false_when_redis_none(self):
        """If Redis is unavailable, fail-open: return False, don't raise."""
        import time
        fake_payload = {
            "sub": "user-1",
            "jti": "test-jti-xyz",
            "exp": int(time.time()) + 3600,
        }
        with patch.object(_sec.jwt, "decode", return_value=fake_payload), \
             patch.object(_sec, "_redis_client", None), \
             patch.object(_sec, "get_redis", AsyncMock(return_value=None)):
            result = await _sec.blacklist_token("any.token")

        assert result is False


# ── is_token_blacklisted ──────────────────────────────────────────────────────

class TestIsTokenBlacklisted:
    """Verify is_token_blacklisted correctly queries Redis."""

    @pytest.mark.asyncio
    async def test_returns_false_for_clean_token(self, in_memory_redis):
        redis, store = in_memory_redis

        import time
        fake_payload = {
            "sub": "user-2",
            "jti": "clean-jti-abc",
            "exp": int(time.time()) + 3600,
        }
        with patch.object(_sec.jwt, "decode", return_value=fake_payload), \
             patch.object(_sec, "_redis_client", redis):
            result = await _sec.is_token_blacklisted("any.token")

        assert result is False

    @pytest.mark.asyncio
    async def test_returns_true_after_blacklisting(self, in_memory_redis):
        redis, store = in_memory_redis

        import time
        fake_payload = {
            "sub": "user-3",
            "jti": "revoked-jti-789",
            "exp": int(time.time()) + 3600,
        }
        with patch.object(_sec.jwt, "decode", return_value=fake_payload), \
             patch.object(_sec, "_redis_client", redis):
            # Blacklist first
            await _sec.blacklist_token("any.token")
            # Then check
            result = await _sec.is_token_blacklisted("any.token")

        assert result is True

    @pytest.mark.asyncio
    async def test_returns_true_for_invalid_token(self, in_memory_redis):
        """A token that fails decoding is treated as revoked for safety."""
        redis, store = in_memory_redis

        with patch.object(_sec.jwt, "decode", side_effect=_sec.JWTError("invalid")), \
             patch.object(_sec, "_redis_client", redis):
            result = await _sec.is_token_blacklisted("garbage.token.value")

        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_when_redis_unavailable(self):
        """If Redis is down, fail-open: don't block the user."""
        import time
        fake_payload = {
            "sub": "user-4",
            "jti": "some-jti",
            "exp": int(time.time()) + 3600,
        }
        with patch.object(_sec.jwt, "decode", return_value=fake_payload), \
             patch.object(_sec, "_redis_client", None), \
             patch.object(_sec, "get_redis", AsyncMock(return_value=None)):
            result = await _sec.is_token_blacklisted("any.token")

        assert result is False

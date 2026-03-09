"""
Shared test fixtures for EduPlatform backend tests.
"""
import asyncio
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ──────────────────────────────────────────────
# Stub out packages that are only available inside Docker / prod env.
# This MUST happen before any app module is imported.
# ──────────────────────────────────────────────
def _make_stub(name: str) -> MagicMock:
    stub = MagicMock()
    stub.__name__ = name
    return stub

_OPTIONAL_MODULES = [
    "pgvector",
    "pgvector.sqlalchemy",
    "psycopg2",
    "psycopg2.extras",
    "celery",
    "celery.utils",
    "celery.utils.log",
    # JWT / auth dependencies (not installed in test env)
    "jose",
    "jose.exceptions",
    # Password hashing (not installed in test env)
    "passlib",
    "passlib.context",
    # Async Redis (not installed in test env)
    "redis",
    "redis.asyncio",
]
for _mod in _OPTIONAL_MODULES:
    if _mod not in sys.modules:
        sys.modules[_mod] = _make_stub(_mod)

# pgvector.sqlalchemy.Vector must be callable (used as Column type)
sys.modules["pgvector.sqlalchemy"].Vector = MagicMock(return_value=None)

# ── jose stubs ─────────────────────────────────────────────────────────────
# JWTError must be a real exception class so `except JWTError` works.
class _JWTError(Exception):
    pass

sys.modules["jose"].JWTError = _JWTError
sys.modules["jose"].jwt = MagicMock()
sys.modules["jose"].jwt.encode = MagicMock(return_value="stub.jwt.token")
sys.modules["jose"].jwt.decode = MagicMock(return_value={"sub": "test", "jti": "stub-jti"})

# ── passlib stubs ──────────────────────────────────────────────────────────
_CryptContext = MagicMock()
_CryptContext.return_value.verify = MagicMock(return_value=True)
_CryptContext.return_value.hash = MagicMock(return_value="hashed_password")
sys.modules["passlib.context"].CryptContext = _CryptContext

# ── redis stubs ─────────────────────────────────────────────────────────────
sys.modules["redis.asyncio"].from_url = MagicMock(return_value=AsyncMock())


# ──────────────────────────────────────────────
# Configure Python path
# ──────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ──────────────────────────────────────────────
# Mock settings fixture (used by most tests)
# ──────────────────────────────────────────────
@pytest.fixture
def mock_settings():
    """Provide a mock settings object with default test values."""
    settings_mock = MagicMock()
    settings_mock.OPENAI_API_KEY = "test-key-123"
    settings_mock.LLM_MODEL = "gpt-4o"
    settings_mock.LLM_MODEL_MINI = "gpt-4o-mini"
    settings_mock.EMBEDDING_MODEL = "text-embedding-3-large"
    settings_mock.EMBEDDING_DIMENSIONS = 3072
    settings_mock.EMBEDDING_CHUNK_SIZE = 500
    settings_mock.REDIS_URL = "redis://localhost:6379/0"
    settings_mock.SECRET_KEY = "test-secret-key-for-tests"
    settings_mock.JWT_SECRET_KEY = "test-jwt-secret-key"
    settings_mock.JWT_ALGORITHM = "HS256"
    settings_mock.ACCESS_TOKEN_EXPIRE_MINUTES = 60
    settings_mock.EDGE_TTS_VOICE_RU_FEMALE = "ru-RU-SvetlanaNeural"
    settings_mock.EDGE_TTS_VOICE_RU_MALE = "ru-RU-DmitryNeural"
    settings_mock.EDGE_TTS_VOICE_EN_FEMALE = "en-US-AriaNeural"
    settings_mock.EDGE_TTS_VOICE_EN_MALE = "en-US-GuyNeural"
    settings_mock.TAVILY_API_KEY = ""
    return settings_mock


@pytest.fixture
def mock_openai_client():
    """Provide a mock OpenAI async client."""
    client = AsyncMock()

    # Mock chat completions
    chat_response = MagicMock()
    chat_response.choices = [MagicMock()]
    chat_response.choices[0].message.content = "Test AI response"
    client.chat.completions.create = AsyncMock(return_value=chat_response)

    # Mock embeddings
    embed_response = MagicMock()
    embed_item = MagicMock()
    embed_item.embedding = [0.1] * 3072
    embed_response.data = [embed_item]
    client.embeddings.create = AsyncMock(return_value=embed_response)

    return client


@pytest.fixture
def mock_redis():
    """Provide a mock Redis client."""
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.setex = AsyncMock()
    redis.ping = AsyncMock()
    return redis

"""Security utilities: password hashing, JWT creation/decoding, token blacklist."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import redis.asyncio as aioredis
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Redis client for token blacklist (lazy init)
_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> Optional[aioredis.Redis]:
    """Get (or create) the shared async Redis connection."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=3,
            )
            await _redis_client.ping()
        except Exception:
            _redis_client = None
    return _redis_client


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Return the bcrypt hash of *password*."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token.

    A unique ``jti`` (JWT ID) claim is embedded so the token can be
    individually invalidated (blacklisted) on logout without waiting for
    the natural expiry.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "jti": str(uuid.uuid4()),   # unique token ID for blacklisting
        "iat": datetime.now(timezone.utc),   # issued-at
    })
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT; returns the payload dict or *None* on failure."""
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


# ── Token blacklist ──────────────────────────────────────────────────────────

_BLACKLIST_PREFIX = "jwt_blacklist:"


async def blacklist_token(token: str) -> bool:
    """Add *token* to the Redis blacklist until its natural expiry.

    Returns True on success, False if Redis is unavailable (fail-open so
    that a Redis outage does not prevent logout from appearing to work).
    """
    redis = await get_redis()
    if redis is None:
        return False

    payload = decode_access_token(token)
    if payload is None:
        return False

    jti: str = payload.get("jti", "")
    exp: int = payload.get("exp", 0)
    if not jti or not exp:
        return False

    ttl = max(int(exp - datetime.now(timezone.utc).timestamp()), 1)
    await redis.setex(f"{_BLACKLIST_PREFIX}{jti}", ttl, "1")
    return True


async def is_token_blacklisted(token: str) -> bool:
    """Return True if *token*'s JTI is in the Redis blacklist."""
    redis = await get_redis()
    if redis is None:
        return False

    payload = decode_access_token(token)
    if payload is None:
        return True  # invalid token → treat as blacklisted

    jti: str = payload.get("jti", "")
    if not jti:
        return False

    result = await redis.get(f"{_BLACKLIST_PREFIX}{jti}")
    return result is not None

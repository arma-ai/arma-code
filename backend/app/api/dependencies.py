"""API dependencies for dependency injection."""

from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.core.config import settings
from app.core.security import verify_password, is_token_blacklisted  # noqa: F401 (re-exported)
# Bug fix #1.4: Use single session dependency from session.py
from app.infrastructure.database.session import get_async_session as get_db
from app.infrastructure.database.models.user import User
from app.schemas.user import TokenData


# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency for getting current authenticated user from JWT token.

    Performs three checks:
      1. Token signature / expiry via JWT decode.
      2. Redis blacklist check (token invalidated on logout).
      3. User exists and is found in the database.

    Args:
        credentials: HTTP Bearer token credentials
        db: Database session

    Returns:
        User: Authenticated user

    Raises:
        HTTPException 401: If token is invalid, blacklisted, or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    # ── 1. Decode JWT ────────────────────────────────────────────────────────
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            raise credentials_exception

        token_data = TokenData(user_id=user_id, email=payload.get("email", ""))
    except JWTError:
        raise credentials_exception

    # ── 2. Redis blacklist check (token invalidated by logout) ───────────────
    if await is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── 3. Database lookup ───────────────────────────────────────────────────
    result = await db.execute(
        select(User).where(User.id == token_data.user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency for getting current active user.

    Args:
        current_user: Current authenticated user

    Returns:
        User: Active user

    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


async def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency for getting current superuser.

    Args:
        current_user: Current authenticated user

    Returns:
        User: Superuser

    Raises:
        HTTPException: If user is not a superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges"
        )
    return current_user


async def verify_material_owner(
    material_id: UUID,
    current_user: User,
    db: AsyncSession
) -> bool:
    """
    Helper function to verify if current user owns a material.

    Args:
        material_id: Material ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        bool: True if user owns the material

    Raises:
        HTTPException: If material not found or user doesn't own it
    """
    from app.infrastructure.database.models.material import Material

    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()

    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )

    if material.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges to access this material"
        )

    return True

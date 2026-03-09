"""Authentication endpoints."""

import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.dependencies import get_db, get_current_active_user
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    blacklist_token,
)
from app.infrastructure.database.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.schemas.common import MessageResponse

logger = logging.getLogger(__name__)

# Rate limiter (uses client IP as key)
limiter = Limiter(key_func=get_remote_address)
_bearer = HTTPBearer()

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user and return JWT token.

    Args:
        request: FastAPI request (used for rate limiting)
        user_data: User registration data
        db: Database session

    Returns:
        Token: JWT access token

    Raises:
        HTTPException: If email already registered
    """
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        is_oauth=False
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(
        "User registered",
        extra={"user_id": str(new_user.id), "email": new_user.email}
    )

    # Create access token
    access_token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email}
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Login user and return JWT token.

    Args:
        request: FastAPI request (used for rate limiting)
        credentials: User login credentials
        db: Database session

    Returns:
        Token: JWT access token

    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == credentials.email)
    )
    user = result.scalar_one_or_none()

    # Verify credentials
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )

    logger.info(
        "User logged in",
        extra={"user_id": str(user.id), "request_id": getattr(request.state, "request_id", "-")}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user information.

    Args:
        current_user: Current authenticated user

    Returns:
        UserResponse: Current user data
    """
    return current_user


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    current_user: User = Depends(get_current_active_user),
):
    """
    Log out the current user by revoking their JWT token.

    The token's ``jti`` claim is stored in Redis with TTL equal to the
    token's remaining lifetime.  Subsequent requests with the same token
    will receive HTTP 401.

    Args:
        request: FastAPI request
        credentials: Bearer token from Authorization header
        current_user: Validated current user (ensures token was valid)

    Returns:
        MessageResponse: Confirmation message
    """
    token = credentials.credentials
    success = await blacklist_token(token)

    if success:
        logger.info(
            "User logged out — token blacklisted",
            extra={
                "user_id": str(current_user.id),
                "request_id": getattr(request.state, "request_id", "-"),
            }
        )
    else:
        # Redis unavailable — log the warning but still return success to client
        logger.warning(
            "Token blacklist failed (Redis unavailable); logout may not fully invalidate token",
            extra={"user_id": str(current_user.id)}
        )

    return {"message": "Successfully logged out"}

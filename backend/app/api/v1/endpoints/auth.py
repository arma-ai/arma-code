"""Authentication endpoints."""

import logging
from datetime import timedelta, datetime
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
from app.core.email import generate_verification_code, send_verification_code
from app.infrastructure.database.models.user import User
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, Token, UserUpdate,
    ChangePasswordRequest, VerificationCodeRequest, ResendCodeRequest,
    VerificationResponse, ChangeEmailRequest, VerifyNewEmailRequest,
    ChangePasswordWithCodeRequest, ReverificationRequired,
    DeleteAccountRequest,
)
from app.schemas.common import MessageResponse

logger = logging.getLogger(__name__)

# Rate limiter (uses client IP as key)
limiter = Limiter(key_func=get_remote_address)
_bearer = HTTPBearer()

router = APIRouter()


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user and send verification code.

    Args:
        request: FastAPI request (used for rate limiting)
        user_data: User registration data
        db: Database session

    Returns:
        MessageResponse: Confirmation that verification code was sent

    Raises:
        HTTPException: If email already registered
    """
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        # User exists but not verified — update their data and resend code
        existing_user.hashed_password = get_password_hash(user_data.password)
        existing_user.full_name = user_data.full_name
        existing_user.verification_code = generate_verification_code()
        existing_user.verification_code_expires_at = datetime.utcnow() + timedelta(minutes=10)
        await db.commit()

        send_verification_code(existing_user.email, existing_user.verification_code)
        return {"message": "Verification code sent. Please check your email."}

    # Create new user (not yet verified)
    hashed_password = get_password_hash(user_data.password)
    verification_code = generate_verification_code()
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        is_oauth=False,
        is_email_verified=False,
        verification_code=verification_code,
        verification_code_expires_at=datetime.utcnow() + timedelta(minutes=10),
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Send verification code
    send_verification_code(new_user.email, verification_code)

    logger.info(
        "User registered, verification code sent",
        extra={"user_id": str(new_user.id), "email": new_user.email}
    )

    return {"message": "Verification code sent. Please check your email."}


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

    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email first.",
            headers={"X-Verification-Required": "true"},
        )

    # Check if re-verification is needed (24 hours)
    from datetime import timedelta
    if user.last_verified_at:
        time_since_verified = datetime.utcnow() - user.last_verified_at
        if time_since_verified > timedelta(hours=24):
            # Generate new code and request re-verification
            user.verification_code = generate_verification_code()
            user.verification_code_expires_at = datetime.utcnow() + timedelta(minutes=10)
            await db.commit()
            send_verification_code(user.email, user.verification_code)

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Re-verification required. A new code has been sent to your email.",
                headers={"X-Reverification-Required": "true"},
            )

    # Update last_verified_at on successful login
    user.last_verified_at = datetime.utcnow()
    await db.commit()

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


@router.post("/verify-email", response_model=VerificationResponse)
@limiter.limit("10/minute")
async def verify_email(
    request: Request,
    verification_data: VerificationCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify email with the code sent to the user's email.

    Args:
        request: FastAPI request (used for rate limiting)
        verification_data: Email and verification code
        db: Database session

    Returns:
        VerificationResponse: JWT token after successful verification

    Raises:
        HTTPException: If user not found, code invalid, or code expired
    """
    # Find user
    result = await db.execute(
        select(User).where(User.email == verification_data.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )

    # Check if code matches
    if user.verification_code != verification_data.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    # Check if code expired
    if user.verification_code_expires_at and user.verification_code_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )

    # Mark as verified
    user.is_email_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    user.last_verified_at = datetime.utcnow()
    await db.commit()

    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    logger.info(
        "Email verified",
        extra={"user_id": str(user.id), "email": user.email}
    )

    return VerificationResponse(
        access_token=access_token,
        token_type="bearer",
        message="Email verified successfully"
    )


@router.post("/resend-code", response_model=MessageResponse)
@limiter.limit("5/minute")
async def resend_verification_code(
    request: Request,
    resend_data: ResendCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Resend verification code to user's email.

    Args:
        request: FastAPI request (used for rate limiting)
        resend_data: Email to resend code to
        db: Database session

    Returns:
        MessageResponse: Confirmation message
    """
    result = await db.execute(
        select(User).where(User.email == resend_data.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )

    # Generate new code
    user.verification_code = generate_verification_code()
    user.verification_code_expires_at = datetime.utcnow() + timedelta(minutes=10)
    await db.commit()

    send_verification_code(user.email, user.verification_code)

    logger.info(
        "Verification code resent",
        extra={"user_id": str(user.id), "email": user.email}
    )

    return {"message": "Verification code resent. Please check your email."}


@router.post("/me/change-email", response_model=MessageResponse)
@limiter.limit("3/minute")
async def request_email_change(
    request: Request,
    email_data: ChangeEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Request to change email. Verifies current password and sends code to the NEW email.
    """
    # Verify current password
    if not current_user.hashed_password or not verify_password(
        email_data.current_password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Check if new email is already taken
    result = await db.execute(
        select(User).where(User.email == email_data.new_email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Store pending email and send code
    current_user.pending_email = email_data.new_email
    current_user.verification_code = generate_verification_code()
    current_user.verification_code_expires_at = datetime.utcnow() + timedelta(minutes=10)
    await db.commit()

    send_verification_code(email_data.new_email, current_user.verification_code)

    return {"message": "Verification code sent to your new email."}


@router.post("/me/verify-new-email", response_model=UserResponse)
async def verify_new_email(
    verification_data: VerifyNewEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Verify new email with code and complete the email change.

    Args:
        verification_data: Verification code
        db: Database session
        current_user: Current authenticated user

    Returns:
        UserResponse: Updated user data
    """
    if not current_user.pending_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending email change. Request one first."
        )

    if current_user.verification_code != verification_data.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    if current_user.verification_code_expires_at and current_user.verification_code_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )

    # Complete email change
    old_email = current_user.email
    current_user.email = current_user.pending_email
    current_user.pending_email = None
    current_user.verification_code = None
    current_user.verification_code_expires_at = None
    current_user.last_verified_at = datetime.utcnow()
    await db.commit()

    logger.info(
        "Email changed",
        extra={"user_id": str(current_user.id), "old_email": old_email, "new_email": current_user.email}
    )

    # Rebuild response
    from app.core.config import settings as app_settings
    from app.schemas.subscription import SubscriptionResponse

    response = UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        is_oauth=current_user.is_oauth,
        oauth_provider=current_user.oauth_provider,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )

    if app_settings.BILLING_BYPASS:
        response.subscription = SubscriptionResponse(
            plan_tier="pro", status="active",
            current_period_end=None, cancel_at_period_end=False,
        )
    else:
        from app.domain.services.subscription_service import get_or_create_subscription
        sub = await get_or_create_subscription(current_user.id, db)
        response.subscription = SubscriptionResponse(
            plan_tier=sub.plan_tier.value if hasattr(sub.plan_tier, 'value') else sub.plan_tier,
            status=sub.status.value if hasattr(sub.status, 'value') else sub.status,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
        )
    return response


@router.post("/me/request-password-change", response_model=MessageResponse)
@limiter.limit("3/minute")
async def request_password_change(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Send a verification code to the user's email for password change.

    Args:
        request: FastAPI request (used for rate limiting)
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Confirmation that code was sent
    """
    # Generate new code
    current_user.verification_code = generate_verification_code()
    current_user.verification_code_expires_at = datetime.utcnow() + timedelta(minutes=10)
    await db.commit()

    send_verification_code(current_user.email, current_user.verification_code)

    return {"message": "Verification code sent to your email."}


@router.post("/me/change-password-with-code", response_model=MessageResponse)
async def change_password_with_code(
    password_data: ChangePasswordWithCodeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Change password with email verification code (no current password needed).

    Args:
        password_data: New password and verification code
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Confirmation message
    """
    if current_user.verification_code != password_data.verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    if current_user.verification_code_expires_at and current_user.verification_code_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )

    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.verification_code = None
    current_user.verification_code_expires_at = None
    current_user.last_verified_at = datetime.utcnow()
    await db.commit()

    logger.info("Password changed with email verification", extra={"user_id": str(current_user.id)})

    return {"message": "Password changed successfully"}


@router.post("/me/request-account-deletion", response_model=MessageResponse)
@limiter.limit("3/minute")
async def request_account_deletion(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Send a verification code to the user's email for account deletion.

    Args:
        request: FastAPI request (used for rate limiting)
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Confirmation that code was sent
    """
    # Generate new code
    current_user.verification_code = generate_verification_code()
    current_user.verification_code_expires_at = datetime.utcnow() + timedelta(minutes=10)
    await db.commit()

    send_verification_code(current_user.email, current_user.verification_code)

    return {"message": "Verification code sent to your email."}


@router.post("/me/delete-account", response_model=MessageResponse)
async def delete_account(
    delete_data: DeleteAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete the current user's account. Requires password and verification code.

    Args:
        delete_data: Current password and verification code
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Confirmation message

    Raises:
        HTTPException: If password is incorrect or code is invalid
    """
    # Verify current password
    if not current_user.hashed_password or not verify_password(
        delete_data.current_password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Verify code
    if current_user.verification_code != delete_data.verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    if current_user.verification_code_expires_at and current_user.verification_code_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )

    # Delete user data in correct order using ORM delete statements
    from sqlalchemy import delete
    from app.infrastructure.database.models.project import Project
    from app.infrastructure.database.models.material import Material
    from app.infrastructure.database.models.subscription import Subscription
    from app.infrastructure.database.models.quiz_attempt import QuizAttempt

    user_id = current_user.id
    user_email = current_user.email

    # 1. Delete all projects (cascade handles content, messages, progress, materials)
    await db.execute(delete(Project).where(Project.owner_id == user_id))

    # 2. Delete remaining materials (those without project)
    await db.execute(delete(Material).where(Material.user_id == user_id))

    # 3. Delete subscription
    await db.execute(delete(Subscription).where(Subscription.user_id == user_id))

    # 4. Delete quiz attempts
    await db.execute(delete(QuizAttempt).where(QuizAttempt.user_id == user_id))

    # 5. Finally delete the user
    await db.delete(current_user)
    await db.commit()

    logger.info(
        "Account deleted",
        extra={"user_id": str(user_id), "email": user_email}
    )

    return {"message": "Account deleted successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user information with subscription data.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        UserResponse: Current user data with subscription
    """
    from app.core.config import settings as app_settings
    from app.schemas.subscription import SubscriptionResponse

    # Build response manually to avoid lazy-loading the subscription relationship
    response = UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        is_oauth=current_user.is_oauth,
        oauth_provider=current_user.oauth_provider,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )

    if app_settings.BILLING_BYPASS:
        # Local dev: fake pro subscription so everything is unlocked
        response.subscription = SubscriptionResponse(
            plan_tier="pro",
            status="active",
            current_period_end=None,
            cancel_at_period_end=False,
        )
    else:
        from app.domain.services.subscription_service import get_or_create_subscription

        sub = await get_or_create_subscription(current_user.id, db)
        response.subscription = SubscriptionResponse(
            plan_tier=sub.plan_tier.value if hasattr(sub.plan_tier, 'value') else sub.plan_tier,
            status=sub.status.value if hasattr(sub.status, 'value') else sub.status,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
        )
    return response


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


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update current user profile (full_name and/or email).

    Args:
        user_data: Fields to update
        db: Database session
        current_user: Current authenticated user

    Returns:
        UserResponse: Updated user data
    """
    # Check if email is being changed and is not already taken
    if user_data.email and user_data.email != current_user.email:
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_data.email

    if user_data.full_name is not None:
        current_user.full_name = user_data.full_name

    await db.commit()
    await db.refresh(current_user)

    logger.info(
        "User profile updated",
        extra={"user_id": str(current_user.id)}
    )

    # Rebuild response with subscription
    from app.core.config import settings as app_settings
    from app.schemas.subscription import SubscriptionResponse

    response = UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        is_oauth=current_user.is_oauth,
        oauth_provider=current_user.oauth_provider,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )

    if app_settings.BILLING_BYPASS:
        response.subscription = SubscriptionResponse(
            plan_tier="pro",
            status="active",
            current_period_end=None,
            cancel_at_period_end=False,
        )
    else:
        from app.domain.services.subscription_service import get_or_create_subscription

        sub = await get_or_create_subscription(current_user.id, db)
        response.subscription = SubscriptionResponse(
            plan_tier=sub.plan_tier.value if hasattr(sub.plan_tier, 'value') else sub.plan_tier,
            status=sub.status.value if hasattr(sub.status, 'value') else sub.status,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
        )
    return response



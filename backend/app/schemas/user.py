import re

from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator
from datetime import datetime
from uuid import UUID
from typing import Optional

from app.schemas.common import BaseSchema, TimestampSchema
from app.schemas.subscription import SubscriptionResponse


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "full_name": "John Doe",
                "password": "StrongPassword1"
            }
        }
    )


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "password": "strongpassword123"
            }
        }
    )


class UserResponse(TimestampSchema):
    """Schema for user response."""
    id: UUID
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    is_oauth: bool
    oauth_provider: Optional[str] = None
    updated_at: datetime
    subscription: Optional[SubscriptionResponse] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
                "full_name": "John Doe",
                "is_active": True,
                "is_superuser": False,
                "is_oauth": False,
                "oauth_provider": None,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
    )


class UserUpdate(BaseModel):
    """Schema for updating user."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: Optional[str]) -> Optional[str]:
        """Validate password strength when updating (Bug #1.2)."""
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "Jane Doe",
                "email": "newemail@example.com"
            }
        }
    )


class Token(BaseModel):
    """Token response."""
    access_token: str
    token_type: str = "bearer"

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }
    )


class TokenData(BaseModel):
    """Token payload data."""
    user_id: UUID
    email: str


class ChangePasswordRequest(BaseModel):
    """Schema for changing password."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_password": "OldPassword1",
                "new_password": "NewStrongPassword1"
            }
        }
    )


class VerificationCodeRequest(BaseModel):
    """Schema for verifying email with code."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "code": "123456"
            }
        }
    )


class ResendCodeRequest(BaseModel):
    """Schema for resending verification code."""
    email: EmailStr

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com"
            }
        }
    )


class VerificationResponse(BaseModel):
    """Response after verification."""
    access_token: str
    token_type: str = "bearer"
    message: str = "Email verified successfully"

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "message": "Email verified successfully"
            }
        }
    )


class ChangeEmailRequest(BaseModel):
    """Request to change email (sends code to new email)."""
    new_email: EmailStr
    current_password: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "new_email": "newemail@example.com",
                "current_password": "CurrentPassword1"
            }
        }
    )


class VerifyNewEmailRequest(BaseModel):
    """Verify new email with code."""
    code: str = Field(..., min_length=6, max_length=6)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "code": "123456"
            }
        }
    )


class ChangePasswordWithCodeRequest(BaseModel):
    """Change password with email verification code."""
    new_password: str = Field(..., min_length=8, max_length=100)
    verification_code: str = Field(..., min_length=6, max_length=6)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "new_password": "NewStrongPassword1",
                "verification_code": "123456"
            }
        }
    )


class ReverificationRequired(BaseModel):
    """Response when re-verification is required."""
    requires_reverification: bool = True
    message: str = "Please verify your email again to continue"
    email: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "requires_reverification": True,
                "message": "Please verify your email again to continue",
                "email": "user@example.com"
            }
        }
    )


class DeleteAccountRequest(BaseModel):
    """Request to delete account with password and verification code."""
    current_password: str
    verification_code: str = Field(..., min_length=6, max_length=6)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_password": "CurrentPassword1",
                "verification_code": "123456"
            }
        }
    )

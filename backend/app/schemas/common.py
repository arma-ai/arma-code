from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID


class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    model_config = ConfigDict(from_attributes=True)


class TimestampSchema(BaseSchema):
    """Schema with timestamp fields."""
    created_at: datetime


class PaginationParams(BaseModel):
    """Pagination parameters."""
    skip: int = 0
    limit: int = 100

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "skip": 0,
                "limit": 100
            }
        }
    )


class PaginatedResponse(BaseModel):
    """Generic paginated response."""
    total: int
    skip: int
    limit: int
    items: list

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "Operation completed successfully"
            }
        }
    )


class ErrorResponse(BaseModel):
    """Error response."""
    detail: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": "Error description"
            }
        }
    )

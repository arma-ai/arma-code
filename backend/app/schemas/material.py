from pydantic import BaseModel, HttpUrl, ConfigDict, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict, Any
from enum import Enum

from app.schemas.common import BaseSchema, TimestampSchema


class MaterialType(str, Enum):
    """Material type enum."""
    PDF = "pdf"
    YOUTUBE = "youtube"


class ProcessingStatus(str, Enum):
    """Processing status enum."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MaterialBase(BaseModel):
    """Base material schema."""
    title: str = Field(..., min_length=1, max_length=200)
    type: MaterialType


class MaterialCreate(MaterialBase):
    """Schema for creating a material."""
    # For PDF uploads, file will be handled separately via multipart/form-data
    # For YouTube, we need the URL
    source: Optional[str] = Field(None, description="YouTube URL for youtube type")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Introduction to Python",
                "type": "youtube",
                "source": "https://www.youtube.com/watch?v=xyz123"
            }
        }
    )


class MaterialUpdate(BaseModel):
    """Schema for updating a material."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Updated Title"
            }
        }
    )


class MaterialSummaryResponse(TimestampSchema):
    """Schema for material summary response."""
    id: UUID
    material_id: UUID
    summary: str


class MaterialNotesResponse(TimestampSchema):
    """Schema for material notes response."""
    id: UUID
    material_id: UUID
    notes: str


class MaterialResponse(TimestampSchema):
    """Schema for material list response."""
    id: UUID
    user_id: UUID
    title: str
    type: MaterialType
    processing_status: ProcessingStatus
    processing_progress: int
    processing_error: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    source: Optional[str] = None
    # Podcast fields
    podcast_script: Optional[List[Dict[str, str]]] = None
    podcast_audio_url: Optional[str] = None
    # Presentation fields
    presentation_status: Optional[str] = None
    presentation_url: Optional[str] = None
    presentation_embed_url: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "title": "Introduction to Python",
                "type": "youtube",
                "processing_status": "completed",
                "processing_progress": 100,
                "processing_error": None,
                "file_name": None,
                "file_size": None,
                "source": "https://www.youtube.com/watch?v=xyz123",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
    )


class MaterialDetailResponse(MaterialResponse):
    """Schema for detailed material response with content."""
    full_text: Optional[str] = None
    rich_content: Optional[Dict[str, Any]] = None
    summary: Optional[MaterialSummaryResponse] = None
    notes: Optional[MaterialNotesResponse] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "title": "Introduction to Python",
                "type": "youtube",
                "processing_status": "completed",
                "processing_progress": 100,
                "processing_error": None,
                "file_name": None,
                "file_size": None,
                "source": "https://www.youtube.com/watch?v=xyz123",
                "full_text": "Python is a high-level programming language...",
                "rich_content": {"headings": [], "sections": []},
                "summary": None,
                "notes": None,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
    )


class MaterialProcessingUpdate(BaseModel):
    """Schema for updating material processing status."""
    processing_status: ProcessingStatus
    processing_progress: int = Field(..., ge=0, le=100)
    processing_error: Optional[str] = None
    full_text: Optional[str] = None
    rich_content: Optional[Dict[str, Any]] = None


class TutorMessageRequest(BaseModel):
    """Schema for tutor chat message request."""
    message: str = Field(..., min_length=1, max_length=5000)
    context: str = Field(default="chat", pattern="^(chat|selection)$")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "Can you explain this concept in simpler terms?",
                "context": "chat"
            }
        }
    )


class TutorMessageResponse(TimestampSchema):
    """Schema for tutor message response."""
    id: UUID
    material_id: UUID
    role: str
    content: str
    context: str

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "material_id": "123e4567-e89b-12d3-a456-426614174001",
                "role": "assistant",
                "content": "Sure! Let me explain...",
                "context": "chat",
                "created_at": "2024-01-01T00:00:00"
            }
        }
    )


class TutorChatHistoryResponse(BaseModel):
    """Schema for tutor chat history response."""
    messages: List[TutorMessageResponse]
    total: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "messages": [],
                "total": 0
            }
        }
    )

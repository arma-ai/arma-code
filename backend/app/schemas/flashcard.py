from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from uuid import UUID
from typing import List

from app.schemas.common import BaseSchema, TimestampSchema


class FlashcardBase(BaseModel):
    """Base flashcard schema."""
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)


class FlashcardCreate(FlashcardBase):
    """Schema for creating a flashcard."""
    material_id: UUID

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "material_id": "123e4567-e89b-12d3-a456-426614174000",
                "question": "What is Python?",
                "answer": "Python is a high-level programming language..."
            }
        }
    )


class FlashcardResponse(BaseSchema, TimestampSchema):
    """Schema for flashcard response."""
    id: UUID
    material_id: UUID
    question: str
    answer: str

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "material_id": "123e4567-e89b-12d3-a456-426614174001",
                "question": "What is Python?",
                "answer": "Python is a high-level programming language...",
                "created_at": "2024-01-01T00:00:00"
            }
        }
    )


class FlashcardListResponse(BaseModel):
    """Schema for flashcard list response."""
    flashcards: List[FlashcardResponse]
    total: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "flashcards": [],
                "total": 0
            }
        }
    )


class FlashcardUpdate(BaseModel):
    """Schema for updating a flashcard."""
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "question": "What is Python?",
                "answer": "Updated answer..."
            }
        }
    )

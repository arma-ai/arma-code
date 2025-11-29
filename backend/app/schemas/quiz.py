from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime
from uuid import UUID
from typing import List, Literal

from app.schemas.common import BaseSchema, TimestampSchema


class QuizQuestionBase(BaseModel):
    """Base quiz question schema."""
    question: str = Field(..., min_length=1)
    option_a: str = Field(..., min_length=1)
    option_b: str = Field(..., min_length=1)
    option_c: str = Field(..., min_length=1)
    option_d: str = Field(..., min_length=1)
    correct_option: Literal['a', 'b', 'c', 'd']

    @field_validator('correct_option')
    @classmethod
    def validate_correct_option(cls, v):
        if v not in ['a', 'b', 'c', 'd']:
            raise ValueError('correct_option must be one of: a, b, c, d')
        return v


class QuizQuestionCreate(QuizQuestionBase):
    """Schema for creating a quiz question."""
    material_id: UUID

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "material_id": "123e4567-e89b-12d3-a456-426614174000",
                "question": "What is Python?",
                "option_a": "A snake",
                "option_b": "A programming language",
                "option_c": "A framework",
                "option_d": "A database",
                "correct_option": "b"
            }
        }
    )


class QuizQuestionResponse(BaseSchema, TimestampSchema):
    """Schema for quiz question response (without correct answer)."""
    id: UUID
    material_id: UUID
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "material_id": "123e4567-e89b-12d3-a456-426614174001",
                "question": "What is Python?",
                "option_a": "A snake",
                "option_b": "A programming language",
                "option_c": "A framework",
                "option_d": "A database",
                "created_at": "2024-01-01T00:00:00"
            }
        }
    )


class QuizQuestionWithAnswerResponse(QuizQuestionResponse):
    """Schema for quiz question response with correct answer (for admin/results)."""
    correct_option: Literal['a', 'b', 'c', 'd']

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "material_id": "123e4567-e89b-12d3-a456-426614174001",
                "question": "What is Python?",
                "option_a": "A snake",
                "option_b": "A programming language",
                "option_c": "A framework",
                "option_d": "A database",
                "correct_option": "b",
                "created_at": "2024-01-01T00:00:00"
            }
        }
    )


class QuizListResponse(BaseModel):
    """Schema for quiz question list response."""
    questions: List[QuizQuestionResponse]
    total: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "questions": [],
                "total": 0
            }
        }
    )


class QuizAnswerRequest(BaseModel):
    """Schema for submitting a quiz answer."""
    question_id: UUID
    selected_option: Literal['a', 'b', 'c', 'd']

    @field_validator('selected_option')
    @classmethod
    def validate_selected_option(cls, v):
        if v not in ['a', 'b', 'c', 'd']:
            raise ValueError('selected_option must be one of: a, b, c, d')
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "question_id": "123e4567-e89b-12d3-a456-426614174000",
                "selected_option": "b"
            }
        }
    )


class QuizAnswerResponse(BaseModel):
    """Schema for quiz answer result."""
    question_id: UUID
    is_correct: bool
    correct_option: Literal['a', 'b', 'c', 'd']
    selected_option: Literal['a', 'b', 'c', 'd']

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "question_id": "123e4567-e89b-12d3-a456-426614174000",
                "is_correct": True,
                "correct_option": "b",
                "selected_option": "b"
            }
        }
    )


class QuizAttemptRequest(BaseModel):
    """Schema for submitting a full quiz attempt."""
    answers: List[QuizAnswerRequest]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "answers": [
                    {
                        "question_id": "123e4567-e89b-12d3-a456-426614174000",
                        "selected_option": "b"
                    }
                ]
            }
        }
    )


class QuizAttemptResponse(BaseModel):
    """Schema for quiz attempt result."""
    total_questions: int
    correct_answers: int
    score_percentage: float
    results: List[QuizAnswerResponse]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_questions": 10,
                "correct_answers": 8,
                "score_percentage": 80.0,
                "results": []
            }
        }
    )

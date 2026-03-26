"""Pydantic schemas for user profile and learning path."""

from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime
from uuid import UUID
from typing import Optional, List
from enum import Enum


class UserType(str, Enum):
    """Type of user for adaptive learning."""
    SCHOOL = "school"
    UNIVERSITY = "university"
    ADULT = "adult"


class LearningStage(str, Enum):
    """Learning stage status."""
    LOCKED = "locked"
    AVAILABLE = "available"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


# ===== User Profile Schemas =====

class UserProfileBase(BaseModel):
    """Base user profile schema."""
    user_type: UserType = UserType.ADULT
    age: Optional[int] = Field(None, ge=10, le=100)
    preferred_language: str = "ru"
    difficulty_preference: str = "medium"

    # For school students
    school_grade: Optional[int] = Field(None, ge=1, le=11)

    # For university students
    university_course: Optional[int] = Field(None, ge=1, le=6)
    university_faculty: Optional[str] = None

    # For adults
    profession: Optional[str] = None
    learning_goal: Optional[str] = None


class UserProfileCreate(UserProfileBase):
    """Schema for creating a user profile."""
    user_id: UUID

    @field_validator('school_grade')
    @classmethod
    def validate_school_grade(cls, v, info):
        data = info.data
        if v is not None and data.get('user_type') != UserType.SCHOOL:
            raise ValueError('school_grade is only applicable for school students')
        return v

    @field_validator('university_course', 'university_faculty')
    @classmethod
    def validate_university_fields(cls, v, info):
        data = info.data
        if v is not None and data.get('user_type') != UserType.UNIVERSITY:
            raise ValueError('university fields are only applicable for university students')
        return v

    @field_validator('profession', 'learning_goal')
    @classmethod
    def validate_adult_fields(cls, v, info):
        data = info.data
        if v is not None and data.get('user_type') != UserType.ADULT:
            raise ValueError('adult fields are only applicable for adult learners')
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "user_type": "school",
                "age": 16,
                "school_grade": 10,
                "preferred_language": "ru",
                "difficulty_preference": "medium"
            }
        }
    )


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile."""
    age: Optional[int] = Field(None, ge=10, le=100)
    preferred_language: Optional[str] = None
    difficulty_preference: Optional[str] = None
    learning_goal: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "age": 17,
                "learning_goal": "Prepare for university entrance exams"
            }
        }
    )


class UserProfileResponse(UserProfileBase):
    """Schema for user profile response."""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "user_type": "school",
                "age": 16,
                "school_grade": 10,
                "preferred_language": "ru",
                "difficulty_preference": "medium",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
    )


# ===== Learning Path Schemas =====

class LearningPathStageStatus(BaseModel):
    """Status of a single learning stage."""
    stage: str
    status: LearningStage
    completed_at: Optional[datetime] = None
    is_unlocked: bool


class LearningPathResponse(BaseModel):
    """Schema for learning path response."""
    id: UUID
    user_profile_id: UUID
    material_id: UUID
    current_stage: str

    # Stage statuses
    summary_stage: LearningStage
    summary_completed_at: Optional[datetime] = None

    flashcards_stage: LearningStage
    flashcards_started_at: Optional[datetime] = None
    flashcards_completed_at: Optional[datetime] = None

    quiz_stage: LearningStage
    quiz_attempts_count: int = 0
    best_quiz_score: float = 0.0
    last_quiz_score: float = 0.0
    last_quiz_attempt_at: Optional[datetime] = None
    quiz_completed_at: Optional[datetime] = None

    # Remedial content
    remedial_presentation_unlocked: bool = False
    remedial_podcast_unlocked: bool = False

    # Completion
    is_completed: bool = False
    completed_at: Optional[datetime] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime

    # Helper: list of unlocked stages
    unlocked_stages: List[str] = []

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_profile_id": "123e4567-e89b-12d3-a456-426614174001",
                "material_id": "123e4567-e89b-12d3-a456-426614174002",
                "current_stage": "flashcards",
                "summary_stage": "completed",
                "flashcards_stage": "in_progress",
                "quiz_stage": "locked",
                "quiz_attempts_count": 0,
                "best_quiz_score": 0.0,
                "is_completed": False,
                "unlocked_stages": ["summary", "flashcards"]
            }
        }
    )


class LearningPathCreate(BaseModel):
    """Schema for creating a learning path."""
    user_profile_id: UUID
    material_id: UUID

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_profile_id": "123e4567-e89b-12d3-a456-426614174000",
                "material_id": "123e4567-e89b-12d3-a456-426614174001"
            }
        }
    )


class StageCompleteRequest(BaseModel):
    """Request to mark a stage as complete."""
    stage: str  # summary, flashcards, quiz, remedial_presentation, remedial_podcast

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "stage": "summary"
            }
        }
    )


class FlashcardsProgressRequest(BaseModel):
    """Request to update flashcards progress."""
    known_count: int = Field(..., ge=0)
    learning_count: int = Field(..., ge=0)
    total_count: int = Field(..., gt=0)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "known_count": 12,
                "learning_count": 3,
                "total_count": 15
            }
        }
    )


class QuizProgressRequest(BaseModel):
    """Request to update quiz progress."""
    score: float = Field(..., ge=0, le=100)
    total_questions: int = Field(..., gt=0)
    correct_answers: int = Field(..., ge=0)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "score": 80.0,
                "total_questions": 10,
                "correct_answers": 8
            }
        }
    )


class LearningPathListResponse(BaseModel):
    """Schema for list of learning paths."""
    learning_paths: List[LearningPathResponse]
    total: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "learning_paths": [],
                "total": 0
            }
        }
    )


class UserProfileWithLearningPathsResponse(UserProfileResponse):
    """User profile with associated learning paths."""
    learning_paths: List[LearningPathResponse] = []

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "user_type": "school",
                "age": 16,
                "school_grade": 10,
                "learning_paths": []
            }
        }
    )

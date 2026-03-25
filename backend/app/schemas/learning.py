"""
Pydantic schemas for Adaptive Learning System.

Used for request/response validation in user profile and learning progress APIs.
"""
from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict, Any
from enum import Enum


class EducationLevelEnum(str, Enum):
    SCHOOL = "school"
    UNIVERSITY = "university"
    PROFESSIONAL = "professional"


class LearningStyleEnum(str, Enum):
    VISUAL = "visual"
    AUDITORY = "auditory"
    READING_WRITING = "reading_writing"
    KINESTHETIC = "kinesthetic"


class LearningStageEnum(str, Enum):
    SUMMARY = "summary"
    FLASHCARDS = "flashcards"
    QUIZ = "quiz"
    PRESENTATION = "presentation"
    PODCAST = "podcast"
    RETRY_QUIZ = "retry_quiz"
    COMPLETED = "completed"


# ==================== User Profile Schemas ====================

class UserProfileCreate(BaseModel):
    """Schema for creating a user educational profile."""
    
    # Required
    age: int = Field(..., ge=5, le=100, description="User's age")
    
    # Education Info (one of these based on age)
    education_level: EducationLevelEnum = Field(..., description="Education level")
    
    # School-specific (if age < 18)
    grade_level: Optional[int] = Field(None, ge=1, le=11, description="School grade (1-11)")
    school_interests: Optional[List[str]] = Field(None, description="Subjects of interest")
    
    # University-specific
    university_year: Optional[int] = Field(None, ge=1, le=7, description="University year (1-7)")
    faculty: Optional[str] = Field(None, max_length=100, description="Faculty/Department")
    major: Optional[str] = Field(None, max_length=100, description="Major/Specialization")
    
    # Professional
    occupation: Optional[str] = Field(None, max_length=100, description="Job title")
    work_field: Optional[str] = Field(None, max_length=100, description="Industry/Field")
    
    # Learning Preferences
    learning_style: Optional[LearningStyleEnum] = Field(None, description="Preferred learning style")
    interests: Optional[List[str]] = Field(None, description="Areas of interest")

    @field_validator("grade_level")
    @classmethod
    def validate_grade_for_school(cls, v: Optional[int], info) -> Optional[int]:
        data = info.data
        if data.get("education_level") == EducationLevelEnum.SCHOOL and v is None:
            raise ValueError("grade_level is required for school students")
        return v

    @field_validator("faculty")
    @classmethod
    def validate_faculty_for_university(cls, v: Optional[str], info) -> Optional[str]:
        data = info.data
        if data.get("education_level") == EducationLevelEnum.UNIVERSITY and v is None:
            raise ValueError("faculty is required for university students")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "age": 20,
                "education_level": "university",
                "university_year": 2,
                "faculty": "Computer Science",
                "major": "Software Engineering",
                "learning_style": "visual",
                "interests": ["programming", "AI", "web development"]
            }
        }
    )


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile."""
    
    age: Optional[int] = Field(None, ge=5, le=100)
    education_level: Optional[EducationLevelEnum] = None
    grade_level: Optional[int] = Field(None, ge=1, le=11)
    school_interests: Optional[List[str]] = None
    university_year: Optional[int] = Field(None, ge=1, le=7)
    faculty: Optional[str] = Field(None, max_length=100)
    major: Optional[str] = Field(None, max_length=100)
    occupation: Optional[str] = Field(None, max_length=100)
    work_field: Optional[str] = Field(None, max_length=100)
    learning_style: Optional[LearningStyleEnum] = None
    interests: Optional[List[str]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "faculty": "Data Science",
                "learning_style": "auditory"
            }
        }
    )


class UserProfileResponse(BaseModel):
    """Schema for user profile response."""
    
    id: UUID
    user_id: UUID
    age: Optional[int] = None
    education_level: Optional[str] = None
    grade_level: Optional[int] = None
    school_interests: Optional[List[str]] = None
    university_year: Optional[int] = None
    faculty: Optional[str] = None
    major: Optional[str] = None
    occupation: Optional[str] = None
    work_field: Optional[str] = None
    learning_style: Optional[str] = None
    interests: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "age": 20,
                "education_level": "university",
                "university_year": 2,
                "faculty": "Computer Science",
                "major": "Software Engineering",
                "learning_style": "visual",
                "interests": ["programming", "AI"],
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
    )


# ==================== Learning Progress Schemas ====================

class LearningProgressResponse(BaseModel):
    """Schema for learning progress response."""
    
    id: UUID
    user_id: UUID
    material_id: UUID
    current_stage: str
    summary_completed: bool
    summary_read_time_seconds: int
    summary_word_count: int
    flashcards_completed: bool
    flashcards_viewed_count: int
    quiz_attempts_count: int
    best_quiz_score: float
    quiz_passed: bool
    quiz_weak_areas: Optional[List[str]] = None
    presentation_completed: bool
    presentation_generated: bool
    podcast_completed: bool
    podcast_generated: bool
    mastery_achieved: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "material_id": "123e4567-e89b-12d3-a456-426614174002",
                "current_stage": "flashcards",
                "summary_completed": True,
                "summary_read_time_seconds": 300,
                "flashcards_completed": False,
                "flashcards_viewed_count": 5,
                "quiz_attempts_count": 0,
                "best_quiz_score": 0,
                "quiz_passed": False,
                "mastery_achieved": False,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
    )


class LearningProgressUpdate(BaseModel):
    """Schema for updating learning progress stage."""
    
    stage: LearningStageEnum = Field(..., description="Stage to update")
    completed: bool = Field(..., description="Whether stage is completed")
    
    # Optional additional data
    read_time_seconds: Optional[int] = Field(None, ge=0, description="Time spent reading summary")
    viewed_count: Optional[int] = Field(None, ge=0, description="Number of flashcards viewed")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "stage": "summary",
                "completed": True,
                "read_time_seconds": 285
            }
        }
    )


class StageCompletionRequest(BaseModel):
    """Schema for completing a learning stage."""
    
    read_time_seconds: Optional[int] = Field(None, ge=0, description="Time spent reading (for summary)")
    viewed_count: Optional[int] = Field(None, ge=0, description="Cards viewed (for flashcards)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "read_time_seconds": 300
            }
        }
    )


# ==================== Presentation Schemas ====================

class SlideData(BaseModel):
    """Schema for a single presentation slide."""
    
    title: str = Field(..., max_length=200)
    content: str
    bullet_points: Optional[List[str]] = None
    image_description: Optional[str] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Key Concepts",
                "content": "This slide covers the main ideas...",
                "bullet_points": ["Point 1", "Point 2", "Point 3"],
                "image_description": "Diagram showing relationships"
            }
        }
    )


class PresentationCreate(BaseModel):
    """Schema for creating a presentation."""
    
    material_id: UUID
    focus_areas: Optional[List[str]] = Field(None, description="Topics to focus on from quiz results")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "material_id": "123e4567-e89b-12d3-a456-426614174000",
                "focus_areas": ["topic1", "topic3"]
            }
        }
    )


class PresentationResponse(BaseModel):
    """Schema for presentation response."""
    
    id: UUID
    material_id: UUID
    user_id: UUID
    slides: List[Dict[str, Any]]
    total_slides: int
    generation_status: str
    focus_areas: Optional[List[str]] = None
    viewed: bool
    viewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "material_id": "123e4567-e89b-12d3-a456-426614174001",
                "user_id": "123e4567-e89b-12d3-a456-426614174002",
                "slides": [
                    {
                        "title": "Introduction",
                        "content": "Overview of the topic",
                        "bullet_points": ["Point 1", "Point 2"]
                    }
                ],
                "total_slides": 10,
                "generation_status": "completed",
                "viewed": False,
                "created_at": "2024-01-01T00:00:00"
            }
        }
    )


# ==================== Podcast Schemas ====================

class PodcastCreate(BaseModel):
    """Schema for creating a podcast."""
    
    material_id: UUID
    voice_type: Optional[str] = Field("en-US-AriaNeural", description="Edge TTS voice")
    playback_speed: Optional[float] = Field(1.0, ge=0.5, le=2.0, description="Playback speed")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "material_id": "123e4567-e89b-12d3-a456-426614174000",
                "voice_type": "en-US-AriaNeural",
                "playback_speed": 1.0
            }
        }
    )


class PodcastProgressUpdate(BaseModel):
    """Schema for updating podcast playback progress."""
    
    progress_seconds: int = Field(..., ge=0, description="Current playback position in seconds")
    completed: bool = Field(False, description="Whether podcast playback is complete")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "progress_seconds": 120,
                "completed": False
            }
        }
    )


class PodcastResponse(BaseModel):
    """Schema for podcast response."""
    
    id: UUID
    material_id: UUID
    user_id: UUID
    audio_url: Optional[str] = None
    duration_seconds: int
    voice_type: str
    playback_speed: float
    generation_status: str
    played: bool
    play_progress_seconds: int
    completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "material_id": "123e4567-e89b-12d3-a456-426614174001",
                "audio_url": "https://storage.example.com/podcast.mp3",
                "duration_seconds": 420,
                "voice_type": "en-US-AriaNeural",
                "playback_speed": 1.0,
                "generation_status": "completed",
                "played": False,
                "play_progress_seconds": 0,
                "created_at": "2024-01-01T00:00:00"
            }
        }
    )


# ==================== Quiz Result Schemas ====================

class QuizResultCreate(BaseModel):
    """Schema for submitting quiz results."""
    
    score_percentage: float = Field(..., ge=0, le=100, description="Quiz score as percentage")
    questions_correct: int = Field(..., ge=0, description="Number of correct answers")
    questions_total: int = Field(..., gt=0, description="Total number of questions")
    weak_areas: Optional[List[str]] = Field(None, description="Topics user struggled with")
    time_spent_seconds: int = Field(..., ge=0, description="Time spent on quiz")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "score_percentage": 65.0,
                "questions_correct": 6,
                "questions_total": 10,
                "weak_areas": ["topic1", "topic3"],
                "time_spent_seconds": 180
            }
        }
    )


class QuizResultResponse(BaseModel):
    """Schema for quiz result response with next stage recommendation."""
    
    score_percentage: float
    passed: bool
    questions_correct: int
    questions_total: int
    weak_areas: Optional[List[str]] = None
    next_stage: str = Field(..., description="Recommended next stage based on result")
    mastery_achieved: bool

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "score_percentage": 65.0,
                "passed": False,
                "questions_correct": 6,
                "questions_total": 10,
                "weak_areas": ["topic1", "topic3"],
                "next_stage": "presentation",
                "mastery_achieved": False
            }
        }
    )

"""
Adaptive Learning System Models

Tables for tracking user learning progress through roadmap stages.
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey, Index, func, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.infrastructure.database.base import Base


class EducationLevel(str, enum.Enum):
    """User's education level."""
    SCHOOL = "school"
    UNIVERSITY = "university"
    PROFESSIONAL = "professional"


class LearningStyle(str, enum.Enum):
    """User's preferred learning style."""
    VISUAL = "visual"
    AUDITORY = "auditory"
    READ_WRITE = "reading_writing"
    KINESTHETIC = "kinesthetic"


class LearningStage(str, enum.Enum):
    """Current stage in the learning roadmap."""
    SUMMARY = "summary"
    FLASHCARDS = "flashcards"
    QUIZ = "quiz"
    PRESENTATION = "presentation"
    PODCAST = "podcast"
    RETRY_QUIZ = "retry_quiz"
    COMPLETED = "completed"


class UserProfile(Base):
    """
    User educational profile for personalized content generation.
    
    Collected during registration to adapt:
    - Summary reading level and examples
    - Flashcard terminology complexity
    - Quiz question difficulty
    - Presentation visual complexity
    - Podcast voice and pacing
    """
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Age/Grade Info
    age = Column(Integer, nullable=True)
    education_level = Column(String(50), nullable=True)  # 'school', 'university', 'professional'
    
    # School-specific (if age < 18)
    grade_level = Column(Integer, nullable=True)  # 1-11
    school_interests = Column(JSONB, nullable=True)  # ['math', 'science', 'languages', 'arts']
    
    # University-specific (if age >= 18 and education_level = 'university')
    university_year = Column(Integer, nullable=True)  # 1-4+
    faculty = Column(String(100), nullable=True)  # 'Computer Science', 'Medicine', etc.
    major = Column(String(100), nullable=True)
    
    # Professional (if education_level = 'professional')
    occupation = Column(String(100), nullable=True)
    work_field = Column(String(100), nullable=True)
    
    # Learning Preferences
    learning_style = Column(String(50), nullable=True)  # 'visual', 'auditory', 'reading', 'kinesthetic'
    interests = Column(JSONB, nullable=True)  # ['programming', 'AI', 'web development']
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates=None, uselist=False)

    __table_args__ = (
        Index('idx_user_profiles_user_id', 'user_id'),
        Index('idx_user_profiles_education_level', 'education_level'),
    )

    def __repr__(self):
        return f"<UserProfile user_id={self.user_id} education_level={self.education_level}>"


class LearningProgress(Base):
    """
    Tracks user's progress through the learning roadmap for a specific material.
    
    Each user-material pair has one LearningProgress record.
    Progress is gated: user must complete each stage before moving to the next.
    """
    __tablename__ = "learning_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Current Stage
    current_stage = Column(String(50), default=LearningStage.SUMMARY.value, nullable=False)
    
    # Summary Stage
    summary_completed = Column(Boolean, default=False)
    summary_read_time_seconds = Column(Integer, default=0)
    summary_word_count = Column(Integer, default=0)
    
    # Flashcards Stage
    flashcards_completed = Column(Boolean, default=False)
    flashcards_viewed_count = Column(Integer, default=0)
    
    # Quiz Stage
    quiz_attempts_count = Column(Integer, default=0)
    best_quiz_score = Column(DECIMAL(5, 2), default=0)  # 0-100
    quiz_passed = Column(Boolean, default=False)
    quiz_weak_areas = Column(JSONB, nullable=True)  # ['topic1', 'topic3']
    
    # Remediation Stages
    presentation_completed = Column(Boolean, default=False)
    presentation_generated = Column(Boolean, default=False)
    podcast_completed = Column(Boolean, default=False)
    podcast_generated = Column(Boolean, default=False)
    
    # Completion
    mastery_achieved = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates=None)
    material = relationship("Material", back_populates=None, uselist=False)

    __table_args__ = (
        Index('idx_learning_progress_user_material', 'user_id', 'material_id', unique=True),
        Index('idx_learning_progress_current_stage', 'current_stage'),
        Index('idx_learning_progress_mastery', 'mastery_achieved'),
    )

    def __repr__(self):
        return f"<LearningProgress user_id={self.user_id} material_id={self.material_id} stage={self.current_stage}>"


class Presentation(Base):
    """
    AI-generated slide presentation for remediation.
    
    Generated when user fails quiz (< 70%).
    Focuses on weak areas identified from quiz results.
    """
    __tablename__ = "presentations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Content
    slides = Column(JSONB, nullable=False)  # [{title, content, bullet_points, image_description}, ...]
    total_slides = Column(Integer, default=0)
    
    # Metadata
    generation_prompt = Column(Text, nullable=True)
    user_profile_context = Column(JSONB, nullable=True)  # Snapshot of user profile at generation time
    focus_areas = Column(JSONB, nullable=True)  # Topics user struggled with in quiz
    
    # Status
    generation_status = Column(String(50), default="generating")  # 'generating', 'completed', 'failed'
    
    # Tracking
    viewed = Column(Boolean, default=False)
    viewed_at = Column(DateTime, nullable=True)
    view_duration_seconds = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)

    # Relationships
    material = relationship("Material", back_populates=None)
    user = relationship("User", back_populates=None)

    __table_args__ = (
        Index('idx_presentations_material_user', 'material_id', 'user_id'),
        Index('idx_presentations_status', 'generation_status'),
    )

    def __repr__(self):
        return f"<Presentation material_id={self.material_id} slides={self.total_slides}>"


class Podcast(Base):
    """
    AI-generated audio podcast for alternative learning.
    
    Generated using Edge TTS from material content.
    Optional remediation after presentation or alternative learning format.
    """
    __tablename__ = "podcasts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Audio Content
    audio_url = Column(String(500), nullable=True)  # URL to audio file (S3/local storage)
    audio_file_path = Column(String(500), nullable=True)  # Local file path
    duration_seconds = Column(Integer, default=0)
    
    # Metadata
    generation_prompt = Column(Text, nullable=True)
    user_profile_context = Column(JSONB, nullable=True)  # Snapshot of user profile at generation time
    voice_type = Column(String(50), default="en-US-AriaNeural")  # Edge TTS voice
    playback_speed = Column(DECIMAL(3, 2), default=1.0)  # 0.75, 1.0, 1.25, 1.5
    
    # Status
    generation_status = Column(String(50), default="generating")  # 'generating', 'completed', 'failed'
    
    # Tracking
    played = Column(Boolean, default=False)
    play_progress_seconds = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)

    # Relationships
    material = relationship("Material", back_populates=None)
    user = relationship("User", back_populates=None)

    __table_args__ = (
        Index('idx_podcasts_material_user', 'material_id', 'user_id'),
        Index('idx_podcasts_status', 'generation_status'),
    )

    def __repr__(self):
        return f"<Podcast material_id={self.material_id} duration={self.duration_seconds}s>"

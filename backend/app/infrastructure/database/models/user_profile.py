"""User Profile and Learning Path models."""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Float, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.infrastructure.database.base import Base


class UserType(str, enum.Enum):
    """Type of user for adaptive learning."""
    SCHOOL = "school"
    UNIVERSITY = "university"
    ADULT = "adult"


class LearningStage(str, enum.Enum):
    """Learning stage in the roadmap."""
    LOCKED = "locked"
    AVAILABLE = "available"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class UserProfile(Base):
    """
    User profile for adaptive learning.
    Stores information about the user's education level for content personalization.
    """
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # User type
    user_type = Column(Enum(UserType), nullable=False, default=UserType.ADULT)

    # For school students
    school_grade = Column(Integer, nullable=True)  # 1-11

    # For university students
    university_course = Column(Integer, nullable=True)  # 1-6
    university_faculty = Column(String(255), nullable=True)  # e.g., "Computer Science"

    # For adults
    profession = Column(String(255), nullable=True)
    learning_goal = Column(Text, nullable=True)  # e.g., "Career change", "Skill improvement"

    # Age (used for content complexity)
    age = Column(Integer, nullable=True)

    # Learning preferences
    preferred_language = Column(String(10), nullable=True, default="ru")  # ru, en, etc.
    difficulty_preference = Column(String(20), nullable=True, default="medium")  # easy, medium, hard

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="profile", uselist=False)
    learning_paths = relationship("LearningPath", back_populates="user_profile", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<UserProfile user_id={self.user_id} type={self.user_type}>"


class LearningPath(Base):
    """
    Learning path for a specific material.
    Tracks user progress through staged learning: Summary → Flashcards → Quiz → (Presentation/Podcast if needed)
    """
    __tablename__ = "learning_paths"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_profile_id = Column(UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)

    # Stage status
    summary_stage = Column(Enum(LearningStage), default=LearningStage.AVAILABLE)
    summary_completed_at = Column(DateTime, nullable=True)

    flashcards_stage = Column(Enum(LearningStage), default=LearningStage.LOCKED)
    flashcards_started_at = Column(DateTime, nullable=True)
    flashcards_completed_at = Column(DateTime, nullable=True)

    quiz_stage = Column(Enum(LearningStage), default=LearningStage.LOCKED)
    quiz_available_after_flashcards_score = Column(Integer, default=80)  # % required to unlock quiz

    # Quiz attempts
    quiz_attempts_count = Column(Integer, default=0)
    best_quiz_score = Column(Float, default=0.0)  # 0-100
    last_quiz_score = Column(Float, default=0.0)  # 0-100
    last_quiz_attempt_at = Column(DateTime, nullable=True)
    quiz_completed_at = Column(DateTime, nullable=True)

    # Remedial content (if quiz failed)
    remedial_presentation_unlocked = Column(Boolean, default=False)
    remedial_presentation_completed_at = Column(DateTime, nullable=True)

    remedial_podcast_unlocked = Column(Boolean, default=False)
    remedial_podcast_completed_at = Column(DateTime, nullable=True)

    # Material completion
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    # Metadata
    current_stage = Column(String(50), default="summary")  # summary, flashcards, quiz, remedial, completed

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user_profile = relationship("UserProfile", back_populates="learning_paths")
    material = relationship("Material")

    def __repr__(self):
        return f"<LearningPath material_id={self.material_id} stage={self.current_stage}>"

    def get_unlocked_stages(self) -> list:
        """Return list of currently unlocked stages."""
        unlocked = []
        if self.summary_stage == LearningStage.COMPLETED:
            unlocked.append("summary")
        if self.flashcards_stage != LearningStage.LOCKED:
            unlocked.append("flashcards")
        if self.quiz_stage != LearningStage.LOCKED:
            unlocked.append("quiz")
        if self.remedial_presentation_unlocked:
            unlocked.append("remedial_presentation")
        if self.remedial_podcast_unlocked:
            unlocked.append("remedial_podcast")
        return unlocked

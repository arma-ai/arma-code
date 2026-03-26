"""Learning Path Service for adaptive learning progression."""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.infrastructure.database.models.user_profile import LearningPath, LearningStage, UserProfile
from app.infrastructure.database.models.material import Material
from app.schemas.user_profile import LearningPathCreate, FlashcardsProgressRequest, QuizProgressRequest


class LearningPathService:
    """Service for managing learning paths and progressive unlocking."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_material(self, user_profile_id: UUID, material_id: UUID) -> Optional[LearningPath]:
        """Get learning path for a specific material."""
        result = await self.db.execute(
            select(LearningPath)
            .where(LearningPath.user_profile_id == user_profile_id)
            .where(LearningPath.material_id == material_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user(self, user_profile_id: UUID) -> List[LearningPath]:
        """Get all learning paths for a user."""
        result = await self.db.execute(
            select(LearningPath)
            .where(LearningPath.user_profile_id == user_profile_id)
            .order_by(LearningPath.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, data: LearningPathCreate) -> LearningPath:
        """Create a new learning path."""
        learning_path = LearningPath(
            user_profile_id=data.user_profile_id,
            material_id=data.material_id,
            summary_stage=LearningStage.AVAILABLE,
            flashcards_stage=LearningStage.LOCKED,
            quiz_stage=LearningStage.LOCKED,
            current_stage="summary",
        )
        self.db.add(learning_path)
        await self.db.commit()
        await self.db.refresh(learning_path)
        return learning_path

    async def get_or_create(self, user_profile_id: UUID, material_id: UUID) -> LearningPath:
        """Get existing learning path or create a new one."""
        learning_path = await self.get_by_material(user_profile_id, material_id)
        if learning_path:
            return learning_path

        # Create new learning path
        new_path = LearningPath(
            user_profile_id=user_profile_id,
            material_id=material_id,
            summary_stage=LearningStage.AVAILABLE,
            flashcards_stage=LearningStage.LOCKED,
            quiz_stage=LearningStage.LOCKED,
            current_stage="summary",
        )
        self.db.add(new_path)
        await self.db.commit()
        await self.db.refresh(new_path)
        return new_path

    async def complete_summary(self, user_profile_id: UUID, material_id: UUID) -> Optional[LearningPath]:
        """Mark summary stage as completed and unlock flashcards."""
        learning_path = await self.get_by_material(user_profile_id, material_id)
        if not learning_path:
            return None

        learning_path.summary_stage = LearningStage.COMPLETED
        learning_path.summary_completed_at = datetime.utcnow()
        learning_path.flashcards_stage = LearningStage.AVAILABLE
        learning_path.current_stage = "flashcards"
        learning_path.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(learning_path)
        return learning_path

    async def start_flashcards(self, user_profile_id: UUID, material_id: UUID) -> Optional[LearningPath]:
        """Mark flashcards as started."""
        learning_path = await self.get_by_material(user_profile_id, material_id)
        if not learning_path or learning_path.flashcards_stage == LearningStage.LOCKED:
            return None

        learning_path.flashcards_stage = LearningStage.IN_PROGRESS
        learning_path.flashcards_started_at = datetime.utcnow()
        learning_path.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(learning_path)
        return learning_path

    async def complete_flashcards(
        self,
        user_profile_id: UUID,
        material_id: UUID,
        progress: FlashcardsProgressRequest
    ) -> Optional[LearningPath]:
        """
        Mark flashcards as completed and potentially unlock quiz.
        Quiz unlocks if known_count / total_count >= threshold (default 80%).
        """
        learning_path = await self.get_by_material(user_profile_id, material_id)
        if not learning_path:
            return None

        learning_path.flashcards_stage = LearningStage.COMPLETED
        learning_path.flashcards_completed_at = datetime.utcnow()
        learning_path.updated_at = datetime.utcnow()

        # Check if quiz should be unlocked
        mastery_percentage = (progress.known_count / progress.total_count) * 100 if progress.total_count > 0 else 0
        
        if mastery_percentage >= learning_path.quiz_available_after_flashcards_score:
            learning_path.quiz_stage = LearningStage.AVAILABLE
            learning_path.current_stage = "quiz"
        else:
            # Keep flashcards available for more practice
            learning_path.flashcards_stage = LearningStage.AVAILABLE
            learning_path.current_stage = "flashcards"

        await self.db.commit()
        await self.db.refresh(learning_path)
        return learning_path

    async def record_quiz_attempt(
        self,
        user_profile_id: UUID,
        material_id: UUID,
        progress: QuizProgressRequest
    ) -> Optional[LearningPath]:
        """
        Record a quiz attempt and determine next steps.
        If score >= 70%, mark as completed.
        If score < 70%, unlock remedial content.
        """
        learning_path = await self.get_by_material(user_profile_id, material_id)
        if not learning_path:
            return None

        learning_path.quiz_attempts_count += 1
        learning_path.last_quiz_score = progress.score
        learning_path.last_quiz_attempt_at = datetime.utcnow()
        learning_path.updated_at = datetime.utcnow()

        # Update best score
        if progress.score > learning_path.best_quiz_score:
            learning_path.best_quiz_score = progress.score

        # Check if passed (70% threshold)
        if progress.score >= 70.0:
            learning_path.quiz_stage = LearningStage.COMPLETED
            learning_path.quiz_completed_at = datetime.utcnow()
            learning_path.is_completed = True
            learning_path.completed_at = datetime.utcnow()
            learning_path.current_stage = "completed"
        else:
            # Unlock remedial content
            learning_path.remedial_presentation_unlocked = True
            learning_path.remedial_podcast_unlocked = True
            learning_path.current_stage = "remedial"

        await self.db.commit()
        await self.db.refresh(learning_path)
        return learning_path

    async def complete_remedial(
        self,
        user_profile_id: UUID,
        material_id: UUID,
        content_type: str  # "presentation" or "podcast"
    ) -> Optional[LearningPath]:
        """Mark remedial content as completed."""
        learning_path = await self.get_by_material(user_profile_id, material_id)
        if not learning_path:
            return None

        if content_type == "presentation":
            learning_path.remedial_presentation_completed_at = datetime.utcnow()
        elif content_type == "podcast":
            learning_path.remedial_podcast_completed_at = datetime.utcnow()

        learning_path.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(learning_path)
        return learning_path

    async def retry_quiz_after_remedial(
        self,
        user_profile_id: UUID,
        material_id: UUID,
        progress: QuizProgressRequest
    ) -> Optional[LearningPath]:
        """Handle quiz retry after remedial content."""
        learning_path = await self.get_by_material(user_profile_id, material_id)
        if not learning_path:
            return None

        learning_path.quiz_attempts_count += 1
        learning_path.last_quiz_score = progress.score
        learning_path.last_quiz_attempt_at = datetime.utcnow()
        learning_path.updated_at = datetime.utcnow()

        if progress.score > learning_path.best_quiz_score:
            learning_path.best_quiz_score = progress.score

        if progress.score >= 70.0:
            learning_path.quiz_stage = LearningStage.COMPLETED
            learning_path.quiz_completed_at = datetime.utcnow()
            learning_path.is_completed = True
            learning_path.completed_at = datetime.utcnow()
            learning_path.current_stage = "completed"

        await self.db.commit()
        await self.db.refresh(learning_path)
        return learning_path

    def get_unlocked_stages(self, learning_path: LearningPath) -> List[str]:
        """Get list of currently unlocked stages."""
        unlocked = []

        if learning_path.summary_stage != LearningStage.LOCKED:
            unlocked.append("summary")
        if learning_path.flashcards_stage != LearningStage.LOCKED:
            unlocked.append("flashcards")
        if learning_path.quiz_stage != LearningStage.LOCKED:
            unlocked.append("quiz")
        if learning_path.remedial_presentation_unlocked:
            unlocked.append("remedial_presentation")
        if learning_path.remedial_podcast_unlocked:
            unlocked.append("remedial_podcast")

        return unlocked

    def is_stage_unlocked(self, learning_path: LearningPath, stage: str) -> bool:
        """Check if a specific stage is unlocked."""
        if stage == "summary":
            return learning_path.summary_stage != LearningStage.LOCKED
        elif stage == "flashcards":
            return learning_path.flashcards_stage != LearningStage.LOCKED
        elif stage == "quiz":
            return learning_path.quiz_stage != LearningStage.LOCKED
        elif stage == "remedial_presentation":
            return learning_path.remedial_presentation_unlocked
        elif stage == "remedial_podcast":
            return learning_path.remedial_podcast_unlocked
        return False

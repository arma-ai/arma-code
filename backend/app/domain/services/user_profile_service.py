"""User Profile Service for adaptive learning."""

from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.infrastructure.database.models.user_profile import UserProfile, UserType
from app.schemas.user_profile import UserProfileCreate, UserProfileUpdate


class UserProfileService:
    """Service for managing user profiles."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_id(self, user_id: UUID) -> Optional[UserProfile]:
        """Get user profile by user ID."""
        result = await self.db.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: UserProfileCreate) -> UserProfile:
        """Create a new user profile."""
        profile = UserProfile(
            user_id=data.user_id,
            user_type=data.user_type,
            age=data.age,
            school_grade=data.school_grade,
            university_course=data.university_course,
            university_faculty=data.university_faculty,
            profession=data.profession,
            learning_goal=data.learning_goal,
            preferred_language=data.preferred_language,
            difficulty_preference=data.difficulty_preference,
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def update(self, user_id: UUID, data: UserProfileUpdate) -> Optional[UserProfile]:
        """Update user profile."""
        profile = await self.get_by_user_id(user_id)
        if not profile:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(profile, field) and value is not None:
                setattr(profile, field, value)

        profile.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def get_or_create(self, user_id: UUID) -> UserProfile:
        """Get existing profile or create a new one with defaults."""
        profile = await self.get_by_user_id(user_id)
        if profile:
            return profile

        # Create default profile
        default_profile = UserProfile(
            user_id=user_id,
            user_type=UserType.ADULT,
            preferred_language="ru",
            difficulty_preference="medium",
        )
        self.db.add(default_profile)
        await self.db.commit()
        await self.db.refresh(default_profile)
        return default_profile

    def get_difficulty_multiplier(self, profile: UserProfile) -> float:
        """
        Get difficulty multiplier based on profile.
        Used for AI content generation.
        """
        base_multiplier = 1.0

        # Adjust by age
        if profile.age:
            if profile.age < 14:
                base_multiplier = 0.6  # Simpler content
            elif profile.age < 16:
                base_multiplier = 0.8
            elif profile.age < 18:
                base_multiplier = 0.9
            elif profile.age > 50:
                base_multiplier = 0.95  # Slightly simpler for older learners

        # Adjust by education level
        if profile.user_type == UserType.SCHOOL and profile.school_grade:
            if profile.school_grade <= 7:
                base_multiplier = 0.6
            elif profile.school_grade <= 9:
                base_multiplier = 0.75
            else:
                base_multiplier = 0.9

        # Adjust by difficulty preference
        preference_multipliers = {
            "easy": 0.7,
            "medium": 1.0,
            "hard": 1.2,
        }
        pref_multiplier = preference_multipliers.get(profile.difficulty_preference, 1.0)

        return base_multiplier * pref_multiplier

    def get_target_audience_description(self, profile: UserProfile) -> str:
        """
        Get human-readable description of target audience for AI prompts.
        """
        if profile.user_type == UserType.SCHOOL:
            if profile.school_grade:
                return f"a {profile.school_grade}th grade student (age {profile.age or 'teenager'})"
            return "a school student"

        elif profile.user_type == UserType.UNIVERSITY:
            course_str = f"{profile.university_course}{'st' if profile.university_course == 1 else 'nd' if profile.university_course == 2 else 'rd' if profile.university_course == 3 else 'th'} year"
            faculty_str = f" in {profile.university_faculty}" if profile.university_faculty else ""
            return f"a {course_str} university student{faculty_str}"

        else:  # ADULT
            profession_str = f" working as {profile.profession}" if profile.profession else ""
            goal_str = f" with goal: {profile.learning_goal}" if profile.learning_goal else ""
            return f"an adult learner{profession_str}{goal_str}"

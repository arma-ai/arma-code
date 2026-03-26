"""User Profile and Learning Path endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.api.dependencies import get_db, get_current_active_user
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.user_profile import UserProfile
from app.domain.services.user_profile_service import UserProfileService
from app.domain.services.learning_path_service import LearningPathService
from app.schemas.user_profile import (
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileResponse,
    LearningPathResponse,
    LearningPathCreate,
    StageCompleteRequest,
    FlashcardsProgressRequest,
    QuizProgressRequest,
    UserProfileWithLearningPathsResponse,
)
from app.schemas.common import MessageResponse


router = APIRouter()


# ============================================================================
# USER PROFILE ENDPOINTS
# ============================================================================

@router.get("/profile", response_model=UserProfileWithLearningPathsResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's profile with learning paths.
    """
    profile_service = UserProfileService(db)
    learning_path_service = LearningPathService(db)

    profile = await profile_service.get_or_create(current_user.id)

    # Get all learning paths
    learning_paths = await learning_path_service.get_by_user(profile.id)

    response = UserProfileWithLearningPathsResponse(
        id=profile.id,
        user_id=profile.user_id,
        user_type=profile.user_type,
        age=profile.age,
        school_grade=profile.school_grade,
        university_course=profile.university_course,
        university_faculty=profile.university_faculty,
        profession=profile.profession,
        learning_goal=profile.learning_goal,
        preferred_language=profile.preferred_language,
        difficulty_preference=profile.difficulty_preference,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        learning_paths=[
            LearningPathResponse(
                id=lp.id,
                user_profile_id=lp.user_profile_id,
                material_id=lp.material_id,
                current_stage=lp.current_stage,
                summary_stage=lp.summary_stage,
                summary_completed_at=lp.summary_completed_at,
                flashcards_stage=lp.flashcards_stage,
                flashcards_started_at=lp.flashcards_started_at,
                flashcards_completed_at=lp.flashcards_completed_at,
                quiz_stage=lp.quiz_stage,
                quiz_attempts_count=lp.quiz_attempts_count,
                best_quiz_score=lp.best_quiz_score,
                last_quiz_score=lp.last_quiz_score,
                last_quiz_attempt_at=lp.last_quiz_attempt_at,
                quiz_completed_at=lp.quiz_completed_at,
                remedial_presentation_unlocked=lp.remedial_presentation_unlocked,
                remedial_podcast_unlocked=lp.remedial_podcast_unlocked,
                is_completed=lp.is_completed,
                completed_at=lp.completed_at,
                created_at=lp.created_at,
                updated_at=lp.updated_at,
                unlocked_stages=learning_path_service.get_unlocked_stages(lp)
            )
            for lp in learning_paths
        ]
    )

    return response


@router.post("/profile", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    profile_data: UserProfileCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create user profile (onboarding questionnaire).
    This should be called once after registration.
    """
    profile_service = UserProfileService(db)

    # Check if profile already exists
    existing_profile = await profile_service.get_by_user_id(current_user.id)
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists. Use PUT to update."
        )

    # Create profile
    profile_data.user_id = current_user.id
    profile = await profile_service.create(profile_data)

    return UserProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        user_type=profile.user_type,
        age=profile.age,
        school_grade=profile.school_grade,
        university_course=profile.university_course,
        university_faculty=profile.university_faculty,
        profession=profile.profession,
        learning_goal=profile.learning_goal,
        preferred_language=profile.preferred_language,
        difficulty_preference=profile.difficulty_preference,
        created_at=profile.created_at,
        updated_at=profile.updated_at
    )


@router.put("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user profile.
    """
    profile_service = UserProfileService(db)

    profile = await profile_service.update(current_user.id, profile_data)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    return UserProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        user_type=profile.user_type,
        age=profile.age,
        school_grade=profile.school_grade,
        university_course=profile.university_course,
        university_faculty=profile.university_faculty,
        profession=profile.profession,
        learning_goal=profile.learning_goal,
        preferred_language=profile.preferred_language,
        difficulty_preference=profile.difficulty_preference,
        created_at=profile.created_at,
        updated_at=profile.updated_at
    )


# ============================================================================
# LEARNING PATH ENDPOINTS
# ============================================================================

@router.get("/materials/{material_id}/learning-path", response_model=LearningPathResponse)
async def get_learning_path(
    material_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get learning path for a specific material.
    Shows progress and unlocked stages.
    """
    profile_service = UserProfileService(db)
    learning_path_service = LearningPathService(db)

    # Get or create profile
    profile = await profile_service.get_or_create(current_user.id)

    # Get or create learning path
    learning_path = await learning_path_service.get_or_create(profile.id, material_id)

    return LearningPathResponse(
        id=learning_path.id,
        user_profile_id=learning_path.user_profile_id,
        material_id=learning_path.material_id,
        current_stage=learning_path.current_stage,
        summary_stage=learning_path.summary_stage,
        summary_completed_at=learning_path.summary_completed_at,
        flashcards_stage=learning_path.flashcards_stage,
        flashcards_started_at=learning_path.flashcards_started_at,
        flashcards_completed_at=learning_path.flashcards_completed_at,
        quiz_stage=learning_path.quiz_stage,
        quiz_attempts_count=learning_path.quiz_attempts_count,
        best_quiz_score=learning_path.best_quiz_score,
        last_quiz_score=learning_path.last_quiz_score,
        last_quiz_attempt_at=learning_path.last_quiz_attempt_at,
        quiz_completed_at=learning_path.quiz_completed_at,
        remedial_presentation_unlocked=learning_path.remedial_presentation_unlocked,
        remedial_podcast_unlocked=learning_path.remedial_podcast_unlocked,
        is_completed=learning_path.is_completed,
        completed_at=learning_path.completed_at,
        created_at=learning_path.created_at,
        updated_at=learning_path.updated_at,
        unlocked_stages=learning_path_service.get_unlocked_stages(learning_path)
    )


@router.post("/materials/{material_id}/learning-path/stage/complete")
async def complete_learning_stage(
    material_id: UUID,
    stage_data: StageCompleteRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a learning stage as complete.
    This triggers unlocking of the next stage.
    """
    profile_service = UserProfileService(db)
    learning_path_service = LearningPathService(db)

    profile = await profile_service.get_or_create(current_user.id)

    if stage_data.stage == "summary":
        learning_path = await learning_path_service.complete_summary(profile.id, material_id)
    elif stage_data.stage == "flashcards":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use /flashcards-progress endpoint for flashcards completion"
        )
    elif stage_data.stage == "quiz":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz completion is automatic based on score"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown stage: {stage_data.stage}"
        )

    if not learning_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning path not found"
        )

    return MessageResponse(message=f"Stage {stage_data.stage} completed successfully")


@router.post("/materials/{material_id}/learning-path/flashcards-progress")
async def update_flashcards_progress(
    material_id: UUID,
    progress: FlashcardsProgressRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update flashcards progress and potentially unlock quiz.
    """
    profile_service = UserProfileService(db)
    learning_path_service = LearningPathService(db)

    profile = await profile_service.get_or_create(current_user.id)

    # Start flashcards if not started
    learning_path = await learning_path_service.get_by_material(profile.id, material_id)
    if not learning_path:
        learning_path = await learning_path_service.get_or_create(profile.id, material_id)

    if learning_path.flashcards_stage == LearningStage.LOCKED:
        await learning_path_service.start_flashcards(profile.id, material_id)

    # Complete flashcards
    learning_path = await learning_path_service.complete_flashcards(profile.id, material_id, progress)

    if not learning_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning path not found"
        )

    return LearningPathResponse(
        id=learning_path.id,
        user_profile_id=learning_path.user_profile_id,
        material_id=learning_path.material_id,
        current_stage=learning_path.current_stage,
        summary_stage=learning_path.summary_stage,
        summary_completed_at=learning_path.summary_completed_at,
        flashcards_stage=learning_path.flashcards_stage,
        flashcards_started_at=learning_path.flashcards_started_at,
        flashcards_completed_at=learning_path.flashcards_completed_at,
        quiz_stage=learning_path.quiz_stage,
        quiz_attempts_count=learning_path.quiz_attempts_count,
        best_quiz_score=learning_path.best_quiz_score,
        last_quiz_score=learning_path.last_quiz_score,
        last_quiz_attempt_at=learning_path.last_quiz_attempt_at,
        quiz_completed_at=learning_path.quiz_completed_at,
        remedial_presentation_unlocked=learning_path.remedial_presentation_unlocked,
        remedial_podcast_unlocked=learning_path.remedial_podcast_unlocked,
        is_completed=learning_path.is_completed,
        completed_at=learning_path.completed_at,
        created_at=learning_path.created_at,
        updated_at=learning_path.updated_at,
        unlocked_stages=learning_path_service.get_unlocked_stages(learning_path)
    )


@router.post("/materials/{material_id}/learning-path/quiz-progress")
async def update_quiz_progress(
    material_id: UUID,
    progress: QuizProgressRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update quiz progress and determine next steps.
    If score >= 70%, material is completed.
    If score < 70%, remedial content is unlocked.
    """
    profile_service = UserProfileService(db)
    learning_path_service = LearningPathService(db)

    profile = await profile_service.get_or_create(current_user.id)
    learning_path = await learning_path_service.get_by_material(profile.id, material_id)

    if not learning_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning path not found"
        )

    # Check if this is a retry after remedial
    if learning_path.current_stage == "remedial":
        learning_path = await learning_path_service.retry_quiz_after_remedial(
            profile.id, material_id, progress
        )
    else:
        learning_path = await learning_path_service.record_quiz_attempt(
            profile.id, material_id, progress
        )

    if not learning_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning path not found"
        )

    return LearningPathResponse(
        id=learning_path.id,
        user_profile_id=learning_path.user_profile_id,
        material_id=learning_path.material_id,
        current_stage=learning_path.current_stage,
        summary_stage=learning_path.summary_stage,
        summary_completed_at=learning_path.summary_completed_at,
        flashcards_stage=learning_path.flashcards_stage,
        flashcards_started_at=learning_path.flashcards_started_at,
        flashcards_completed_at=learning_path.flashcards_completed_at,
        quiz_stage=learning_path.quiz_stage,
        quiz_attempts_count=learning_path.quiz_attempts_count,
        best_quiz_score=learning_path.best_quiz_score,
        last_quiz_score=learning_path.last_quiz_score,
        last_quiz_attempt_at=learning_path.last_quiz_attempt_at,
        quiz_completed_at=learning_path.quiz_completed_at,
        remedial_presentation_unlocked=learning_path.remedial_presentation_unlocked,
        remedial_podcast_unlocked=learning_path.remedial_podcast_unlocked,
        is_completed=learning_path.is_completed,
        completed_at=learning_path.completed_at,
        created_at=learning_path.created_at,
        updated_at=learning_path.updated_at,
        unlocked_stages=learning_path_service.get_unlocked_stages(learning_path)
    )

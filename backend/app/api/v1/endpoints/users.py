"""
User Profile and Learning Progress API endpoints.

Handles user educational profiling and learning roadmap progress tracking.
"""
import logging
from uuid import UUID
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_db, get_current_active_user
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.learning import (
    UserProfile,
    LearningProgress,
    Presentation,
    Podcast,
    LearningStage,
)
from app.infrastructure.database.models.material import Material
from app.schemas.learning import (
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileResponse,
    LearningProgressResponse,
    LearningProgressUpdate,
    StageCompletionRequest,
    QuizResultCreate,
    QuizResultResponse,
    PresentationResponse,
    PodcastResponse,
    PodcastCreate,
    PodcastProgressUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users & Learning Progress"])


# ==================== User Profile Endpoints ====================

@router.post("/profile", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    profile_data: UserProfileCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create educational profile for the current user.
    
    Called during registration flow after basic account creation.
    Profile data is used to personalize:
    - Summary reading level and examples
    - Flashcard terminology complexity
    - Quiz question difficulty
    - Presentation visual complexity
    """
    # Check if profile already exists
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    existing_profile = result.scalar_one_or_none()
    
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User profile already exists. Use PATCH to update."
        )
    
    # Create new profile
    profile = UserProfile(
        user_id=current_user.id,
        age=profile_data.age,
        education_level=profile_data.education_level.value,
        grade_level=profile_data.grade_level,
        school_interests=profile_data.school_interests,
        university_year=profile_data.university_year,
        faculty=profile_data.faculty,
        major=profile_data.major,
        occupation=profile_data.occupation,
        work_field=profile_data.work_field,
        learning_style=profile_data.learning_style.value if profile_data.learning_style else None,
        interests=profile_data.interests,
    )
    
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    
    logger.info(f"Created profile for user {current_user.id}: {profile.education_level}")
    return profile


@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user's educational profile.
    
    Returns 404 if profile doesn't exist (user hasn't completed profiling yet).
    """
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please complete your educational profile."
        )
    
    return profile


@router.patch("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user's educational profile.
    
    Allows users to modify their profile information (e.g., after changing majors).
    """
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Create profile first with POST."
        )
    
    # Update fields that are provided
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        # Handle enum conversion
        if field == "education_level" and value:
            value = value.value
        elif field == "learning_style" and value:
            value = value.value
        setattr(profile, field, value)
    
    profile.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(profile)
    
    logger.info(f"Updated profile for user {current_user.id}")
    return profile


# ==================== Learning Progress Endpoints ====================

@router.get("/materials/{material_id}/learning-progress", response_model=LearningProgressResponse)
async def get_learning_progress(
    material_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user's learning progress for a specific material.
    
    Returns current stage and completion status for all roadmap stages.
    If no progress exists yet, creates a new progress record.
    """
    # Check if material exists and belongs to user
    material_result = await db.execute(
        select(Material).where(
            Material.id == material_id,
            Material.user_id == current_user.id,
            Material.deleted_at.is_(None)
        )
    )
    material = material_result.scalar_one_or_none()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Get or create learning progress
    result = await db.execute(
        select(LearningProgress).where(
            LearningProgress.user_id == current_user.id,
            LearningProgress.material_id == material_id
        )
    )
    progress = result.scalar_one_or_none()
    
    if not progress:
        # Create new progress record
        progress = LearningProgress(
            user_id=current_user.id,
            material_id=material_id,
            current_stage=LearningStage.SUMMARY.value,
        )
        db.add(progress)
        await db.commit()
        await db.refresh(progress)
    
    return progress


@router.post("/materials/{material_id}/learning-progress/stage/{stage_name}/complete")
async def complete_learning_stage(
    material_id: UUID,
    stage_name: str,
    request: StageCompletionRequest = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a learning stage as complete and advance to next stage.
    
    Stage gating rules:
    - Summary → Flashcards (must read for minimum time)
    - Flashcards → Quiz (must view all cards)
    - Quiz → Presentation (if failed) OR Completed (if passed)
    - Presentation → Podcast (optional)
    - Podcast → Retry Quiz
    """
    # Validate stage name
    try:
        stage_enum = LearningStage(stage_name.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stage: {stage_name}. Valid stages: {[s.value for s in LearningStage]}"
        )
    
    # Get learning progress
    result = await db.execute(
        select(LearningProgress).where(
            LearningProgress.user_id == current_user.id,
            LearningProgress.material_id == material_id
        )
    )
    progress = result.scalar_one_or_none()
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning progress not found. Start with summary stage first."
        )
    
    # Check stage gating - can only complete current stage
    if progress.current_stage != stage_name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot complete {stage_name}. Current stage is {progress.current_stage}."
        )
    
    # Update stage-specific data
    read_time = request.read_time_seconds if request else None
    viewed_count = request.viewed_count if request else None
    
    if stage_name == LearningStage.SUMMARY.value:
        progress.summary_completed = True
        if read_time is not None:
            progress.summary_read_time_seconds = read_time
        next_stage = LearningStage.FLASHCARDS.value
        
    elif stage_name == LearningStage.FLASHCARDS.value:
        progress.flashcards_completed = True
        if viewed_count is not None:
            progress.flashcards_viewed_count = viewed_count
        next_stage = LearningStage.QUIZ.value
        
    elif stage_name == LearningStage.QUIZ.value:
        # Quiz completion is handled separately via quiz result endpoint
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz completion must be submitted via /quiz/submit endpoint"
        )
        
    elif stage_name == LearningStage.PRESENTATION.value:
        progress.presentation_completed = True
        # User can choose podcast or retry quiz next
        next_stage = LearningStage.PODCAST.value
        
    elif stage_name == LearningStage.PODCAST.value:
        progress.podcast_completed = True
        next_stage = LearningStage.RETRY_QUIZ.value
        
    elif stage_name == LearningStage.RETRY_QUIZ.value:
        # Retry quiz completion is handled separately
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Retry quiz completion must be submitted via /quiz/submit endpoint"
        )
        
    elif stage_name == LearningStage.COMPLETED.value:
        next_stage = LearningStage.COMPLETED.value
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown stage: {stage_name}"
        )
    
    # Advance to next stage
    progress.current_stage = next_stage
    progress.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(progress)
    
    logger.info(f"User {current_user.id} completed stage {stage_name} for material {material_id}")
    
    return {
        "material_id": str(material_id),
        "completed_stage": stage_name,
        "next_stage": next_stage,
        "progress_percentage": _calculate_progress_percentage(progress)
    }


@router.post("/materials/{material_id}/learning-progress/quiz-result")
async def submit_quiz_result(
    material_id: UUID,
    quiz_result: QuizResultCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit quiz results and determine next stage.
    
    Pass threshold: 70%
    - Pass (≥70%): Advance to completed
    - Fail (<70%): Advance to presentation (remediation)
    """
    # Get learning progress
    result = await db.execute(
        select(LearningProgress).where(
            LearningProgress.user_id == current_user.id,
            LearningProgress.material_id == material_id
        )
    )
    progress = result.scalar_one_or_none()
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning progress not found"
        )
    
    # Check if user is at quiz stage
    if progress.current_stage not in [LearningStage.QUIZ.value, LearningStage.RETRY_QUIZ.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot submit quiz result. Current stage is {progress.current_stage}"
        )
    
    # Update quiz data
    progress.quiz_attempts_count += 1
    progress.best_quiz_score = max(progress.best_quiz_score or 0, quiz_result.score_percentage)
    progress.quiz_weak_areas = quiz_result.weak_areas
    
    # Determine pass/fail (70% threshold)
    passed = quiz_result.score_percentage >= 70.0
    progress.quiz_passed = progress.quiz_passed or passed
    
    # Determine next stage
    if passed:
        progress.mastery_achieved = True
        progress.completed_at = datetime.utcnow()
        progress.current_stage = LearningStage.COMPLETED.value
        next_stage = LearningStage.COMPLETED.value
    else:
        # Failed - go to remediation
        if progress.current_stage == LearningStage.QUIZ.value:
            # First fail - go to presentation
            next_stage = LearningStage.PRESENTATION.value
            progress.current_stage = LearningStage.PRESENTATION.value
        else:
            # Failed retry - suggest more remediation
            next_stage = LearningStage.PRESENTATION.value
            progress.current_stage = LearningStage.PRESENTATION.value
    
    progress.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(progress)
    
    logger.info(
        f"User {current_user.id} submitted quiz for material {material_id}: "
        f"{quiz_result.score_percentage}% ({'PASS' if passed else 'FAIL'})"
    )
    
    return QuizResultResponse(
        score_percentage=quiz_result.score_percentage,
        passed=passed,
        questions_correct=quiz_result.questions_correct,
        questions_total=quiz_result.questions_total,
        weak_areas=quiz_result.weak_areas,
        next_stage=next_stage,
        mastery_achieved=progress.mastery_achieved
    )


def _calculate_progress_percentage(progress: LearningProgress) -> int:
    """Calculate overall progress percentage based on completed stages."""
    stage_weights = {
        LearningStage.SUMMARY.value: 15,
        LearningStage.FLASHCARDS.value: 20,
        LearningStage.QUIZ.value: 25,
        LearningStage.PRESENTATION.value: 15,
        LearningStage.PODCAST.value: 10,
        LearningStage.RETRY_QUIZ.value: 15,
    }
    
    completed = 0
    if progress.summary_completed:
        completed += stage_weights.get(LearningStage.SUMMARY.value, 0)
    if progress.flashcards_completed:
        completed += stage_weights.get(LearningStage.FLASHCARDS.value, 0)
    if progress.quiz_passed:
        completed += stage_weights.get(LearningStage.QUIZ.value, 0)
    if progress.presentation_completed:
        completed += stage_weights.get(LearningStage.PRESENTATION.value, 0)
    if progress.podcast_completed:
        completed += stage_weights.get(LearningStage.PODCAST.value, 0)
    
    return min(100, completed)


# ==================== Presentation Endpoints ====================

@router.get("/materials/{material_id}/presentation", response_model=Optional[PresentationResponse])
async def get_presentation(
    material_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get generated presentation for a material."""
    result = await db.execute(
        select(Presentation).where(
            Presentation.user_id == current_user.id,
            Presentation.material_id == material_id
        )
    )
    presentation = result.scalar_one_or_none()
    
    return presentation


@router.post("/materials/{material_id}/presentation/view")
async def mark_presentation_viewed(
    material_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark presentation as viewed."""
    result = await db.execute(
        select(Presentation).where(
            Presentation.user_id == current_user.id,
            Presentation.material_id == material_id
        )
    )
    presentation = result.scalar_one_or_none()
    
    if not presentation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found"
        )
    
    presentation.viewed = True
    presentation.viewed_at = datetime.utcnow()
    presentation.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {"status": "success", "message": "Presentation marked as viewed"}


# ==================== Podcast Endpoints ====================

@router.get("/materials/{material_id}/podcast", response_model=Optional[PodcastResponse])
async def get_podcast(
    material_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get generated podcast for a material."""
    result = await db.execute(
        select(Podcast).where(
            Podcast.user_id == current_user.id,
            Podcast.material_id == material_id
        )
    )
    podcast = result.scalar_one_or_none()
    
    return podcast


@router.post("/materials/{material_id}/podcast/progress")
async def update_podcast_progress(
    material_id: UUID,
    progress_data: PodcastProgressUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update podcast playback progress."""
    result = await db.execute(
        select(Podcast).where(
            Podcast.user_id == current_user.id,
            Podcast.material_id == material_id
        )
    )
    podcast = result.scalar_one_or_none()
    
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
    
    podcast.played = True
    podcast.play_progress_seconds = progress_data.progress_seconds
    podcast.completed = progress_data.completed
    
    if progress_data.completed:
        podcast.completed_at = datetime.utcnow()
    
    podcast.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"status": "success", "progress_seconds": progress_data.progress_seconds}

"""Flashcard management endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.api.dependencies import get_db, get_current_active_user, verify_material_owner
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.flashcard import Flashcard
from app.schemas.flashcard import (
    FlashcardCreate,
    FlashcardResponse,
    FlashcardListResponse,
    FlashcardUpdate,
)
from app.schemas.common import MessageResponse


router = APIRouter()


@router.get("/materials/{material_id}/flashcards", response_model=FlashcardListResponse)
async def get_flashcards(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all flashcards for a material.

    Args:
        material_id: Material ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        FlashcardListResponse: List of flashcards

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(material_id, current_user, db)

    # Get flashcards
    result = await db.execute(
        select(Flashcard)
        .where(Flashcard.material_id == material_id)
        .order_by(Flashcard.created_at.asc())
    )
    flashcards = result.scalars().all()

    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(Flashcard).where(Flashcard.material_id == material_id)
    )
    total = count_result.scalar()

    return {"flashcards": flashcards, "total": total}


@router.post("/flashcards", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
async def create_flashcard(
    flashcard_data: FlashcardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new flashcard.

    Args:
        flashcard_data: Flashcard data
        db: Database session
        current_user: Current authenticated user

    Returns:
        FlashcardResponse: Created flashcard

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(flashcard_data.material_id, current_user, db)

    new_flashcard = Flashcard(
        material_id=flashcard_data.material_id,
        question=flashcard_data.question,
        answer=flashcard_data.answer
    )

    db.add(new_flashcard)
    await db.commit()
    await db.refresh(new_flashcard)

    return new_flashcard


@router.get("/flashcards/{flashcard_id}", response_model=FlashcardResponse)
async def get_flashcard(
    flashcard_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific flashcard.

    Args:
        flashcard_id: Flashcard ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        FlashcardResponse: Flashcard data

    Raises:
        HTTPException: If flashcard not found or access denied
    """
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == flashcard_id)
    )
    flashcard = result.scalar_one_or_none()

    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )

    # Verify ownership through material
    await verify_material_owner(flashcard.material_id, current_user, db)

    return flashcard


@router.put("/flashcards/{flashcard_id}", response_model=FlashcardResponse)
async def update_flashcard(
    flashcard_id: UUID,
    flashcard_data: FlashcardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a flashcard.

    Args:
        flashcard_id: Flashcard ID
        flashcard_data: Updated flashcard data
        db: Database session
        current_user: Current authenticated user

    Returns:
        FlashcardResponse: Updated flashcard

    Raises:
        HTTPException: If flashcard not found or access denied
    """
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == flashcard_id)
    )
    flashcard = result.scalar_one_or_none()

    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )

    # Verify ownership through material
    await verify_material_owner(flashcard.material_id, current_user, db)

    # Update fields
    flashcard.question = flashcard_data.question
    flashcard.answer = flashcard_data.answer

    await db.commit()
    await db.refresh(flashcard)

    return flashcard


@router.delete("/flashcards/{flashcard_id}", response_model=MessageResponse)
async def delete_flashcard(
    flashcard_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a flashcard.

    Args:
        flashcard_id: Flashcard ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Success message

    Raises:
        HTTPException: If flashcard not found or access denied
    """
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == flashcard_id)
    )
    flashcard = result.scalar_one_or_none()

    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )

    # Verify ownership through material
    await verify_material_owner(flashcard.material_id, current_user, db)

    await db.delete(flashcard)
    await db.commit()

    return {"message": "Flashcard deleted successfully"}

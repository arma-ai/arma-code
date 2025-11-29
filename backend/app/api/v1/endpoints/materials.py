"""Material management endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.api.dependencies import get_db, get_current_active_user, verify_material_owner
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.material import (
    Material,
    MaterialSummary,
    MaterialNotes,
    TutorMessage,
    MaterialType,
    ProcessingStatus
)
from app.schemas.material import (
    MaterialCreate,
    MaterialUpdate,
    MaterialResponse,
    MaterialDetailResponse,
    TutorMessageRequest,
    TutorMessageResponse,
    TutorChatHistoryResponse,
)
from app.schemas.common import MessageResponse, PaginationParams


router = APIRouter()


@router.get("", response_model=List[MaterialResponse])
async def get_materials(
    pagination: PaginationParams = Depends(),
    material_type: Optional[MaterialType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all materials for current user.

    Args:
        pagination: Pagination parameters
        material_type: Filter by material type
        db: Database session
        current_user: Current authenticated user

    Returns:
        List[MaterialResponse]: List of user's materials
    """
    query = select(Material).where(Material.user_id == current_user.id)

    if material_type:
        query = query.where(Material.type == material_type)

    query = query.order_by(Material.created_at.desc())
    query = query.offset(pagination.skip).limit(pagination.limit)

    result = await db.execute(query)
    materials = result.scalars().all()

    return materials


@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    title: str = Form(...),
    material_type: MaterialType = Form(...),
    source: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new material.

    For PDF: Upload file via multipart/form-data
    For YouTube: Provide source URL

    Args:
        title: Material title
        material_type: Type of material (pdf or youtube)
        source: YouTube URL (required for youtube type)
        file: PDF file (required for pdf type)
        db: Database session
        current_user: Current authenticated user

    Returns:
        MaterialResponse: Created material

    Raises:
        HTTPException: If validation fails
    """
    # Validate based on type
    if material_type == MaterialType.PDF:
        if not file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is required for PDF type"
            )
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are allowed"
            )

        # TODO: Save file to storage and get file_path
        # For now, we'll just store the filename
        file_path = f"/uploads/{current_user.id}/{file.filename}"
        file_size = 0  # TODO: Get actual file size

        new_material = Material(
            user_id=current_user.id,
            title=title,
            type=material_type,
            file_path=file_path,
            file_name=file.filename,
            file_size=file_size,
            processing_status=ProcessingStatus.QUEUED
        )

    elif material_type == MaterialType.YOUTUBE:
        if not source:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source URL is required for YouTube type"
            )

        new_material = Material(
            user_id=current_user.id,
            title=title,
            type=material_type,
            source=source,
            processing_status=ProcessingStatus.QUEUED
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid material type"
        )

    db.add(new_material)
    await db.commit()
    await db.refresh(new_material)

    # TODO: Trigger background processing task (Celery)

    return new_material


@router.get("/{material_id}", response_model=MaterialDetailResponse)
async def get_material(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get material by ID with full details.

    Args:
        material_id: Material ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        MaterialDetailResponse: Material details

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(material_id, current_user, db)

    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )

    return material


@router.put("/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: UUID,
    material_data: MaterialUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update material.

    Args:
        material_id: Material ID
        material_data: Material update data
        db: Database session
        current_user: Current authenticated user

    Returns:
        MaterialResponse: Updated material

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(material_id, current_user, db)

    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )

    # Update fields
    if material_data.title is not None:
        material.title = material_data.title

    await db.commit()
    await db.refresh(material)

    return material


@router.delete("/{material_id}", response_model=MessageResponse)
async def delete_material(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete material.

    Args:
        material_id: Material ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Success message

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(material_id, current_user, db)

    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )

    # TODO: Delete associated files from storage

    await db.delete(material)
    await db.commit()

    return {"message": "Material deleted successfully"}


@router.post("/{material_id}/tutor", response_model=TutorMessageResponse)
async def send_tutor_message(
    material_id: UUID,
    message_data: TutorMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Send a message to the AI tutor for this material.

    Args:
        material_id: Material ID
        message_data: Message data
        db: Database session
        current_user: Current authenticated user

    Returns:
        TutorMessageResponse: AI tutor response

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(material_id, current_user, db)

    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )

    if material.processing_status != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material is still being processed"
        )

    # Save user message
    user_message = TutorMessage(
        material_id=material_id,
        role="user",
        content=message_data.message,
        context=message_data.context
    )
    db.add(user_message)
    await db.commit()

    # TODO: Generate AI response using OpenAI + RAG
    # For now, return a placeholder
    ai_response_content = "This is a placeholder response. AI integration coming soon."

    # Save AI response
    ai_message = TutorMessage(
        material_id=material_id,
        role="assistant",
        content=ai_response_content,
        context=message_data.context
    )
    db.add(ai_message)
    await db.commit()
    await db.refresh(ai_message)

    return ai_message


@router.get("/{material_id}/tutor/history", response_model=TutorChatHistoryResponse)
async def get_tutor_history(
    material_id: UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get tutor chat history for material.

    Args:
        material_id: Material ID
        limit: Maximum number of messages to return
        db: Database session
        current_user: Current authenticated user

    Returns:
        TutorChatHistoryResponse: Chat history

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(material_id, current_user, db)

    # Get messages
    result = await db.execute(
        select(TutorMessage)
        .where(TutorMessage.material_id == material_id)
        .order_by(TutorMessage.created_at.asc())
        .limit(limit)
    )
    messages = result.scalars().all()

    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(TutorMessage).where(TutorMessage.material_id == material_id)
    )
    total = count_result.scalar()

    return {"messages": messages, "total": total}

"""
Materials API endpoints

Supports batch upload of multiple files (PDF, YouTube, Links) to a project.
All materials in a batch are processed together to generate unified AI content.
"""
import os
import uuid
import logging
from uuid import UUID
from typing import List, Optional
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.dependencies import get_db, get_current_user

logger = logging.getLogger(__name__)
from app.infrastructure.database.models.material import (
    Material,
    MaterialType,
    ProcessingStatus,
    ProjectContent,
    TutorMessage,
    ProjectTutorMessage,
)
from app.infrastructure.database.models.user import User
from app.domain.services.tutor_service import TutorService
from app.schemas.material import (
    MaterialResponse,
    BatchUploadResponse,
    ProjectContentResponse,
    MaterialContentResponse,
    TutorMessageResponse,
    ProjectTutorMessageResponse,
    ProjectTutorChatHistoryResponse,
    TutorChatHistoryResponse,
    TutorMessageRequest,
)
from app.infrastructure.queue.tasks import process_material_batch_task

router = APIRouter(prefix="/materials", tags=["Materials"])

# Constants
MAX_FILES_PER_BATCH = 10
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".html", ".htm"}


@router.post("/batch", status_code=status.HTTP_201_CREATED, response_model=BatchUploadResponse)
async def upload_materials_batch(
    project_id: Optional[UUID] = Form(None),
    project_name: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(default=None),
    youtube_urls: Optional[List[str]] = Form(default=None),
    link_urls: Optional[List[str]] = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload multiple materials (up to 10) to a project.

    Accepts:
    - files: PDF, DOCX, TXT, MD, HTML files (max 10)
    - youtube_urls: YouTube video URLs (max 10)
    - link_urls: Web article URLs (max 10)
    - project_id: Existing project ID (optional)
    - project_name: New project name (optional, creates new project if project_id not provided)

    Total materials (files + youtube_urls + link_urls) cannot exceed 10.

    All materials are processed together to generate unified AI content for the project.
    """
    from app.infrastructure.database.models.project import Project
    
    # Normalize empty lists
    files = files or []
    youtube_urls = youtube_urls or []
    link_urls = link_urls or []

    # Validate total count
    total_materials = len(files) + len(youtube_urls) + len(link_urls)
    if total_materials == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file, YouTube URL, or link URL is required"
        )

    if total_materials > MAX_FILES_PER_BATCH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_FILES_PER_BATCH} materials per batch. You uploaded {total_materials}."
        )

    # Create project if project_id not provided
    if not project_id:
        if not project_name:
            project_name = f"Project {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        
        project = Project(
            id=uuid.uuid4(),
            owner_id=current_user.id,
            name=project_name,
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        project_id = project.id
        logger.info(f"Created new project {project_id} with name '{project_name}'")
    else:
        # Verify project exists and belongs to user
        result = await db.execute(
            select(Project).where(
                Project.id == project_id,
                Project.owner_id == current_user.id,
            )
        )
        project = result.scalar_one_or_none()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project {project_id} not found"
            )
    
    # Validate file sizes and types
    for file in files:
        # Check file size
        file_size = 0
        content = await file.read()
        file_size = len(content)
        await file.seek(0)  # Reset file pointer
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} exceeds {MAX_FILE_SIZE // (1024 * 1024)}MB limit"
            )
        
        # Check file extension
        file_ext = os.path.splitext(file.filename or "")[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} not allowed. Allowed: {ALLOWED_EXTENSIONS}"
            )
    
    # Generate batch_id
    batch_id = uuid.uuid4()
    
    # Create material records
    materials = []
    material_ids = []
    
    # Process files
    for file in files:
        material_id = uuid.uuid4()

        # Read file content
        file_content = await file.read()
        await file.seek(0)  # Reset file pointer

        # Determine file type based on extension
        file_ext = os.path.splitext(file.filename or "")[1].lower().lstrip('.')

        # Map extension to MaterialType value (lowercase string)
        type_mapping = {
            'pdf': MaterialType.PDF.value,
            'docx': MaterialType.DOCX.value,
            'doc': MaterialType.DOC.value,
            'txt': MaterialType.TXT.value,
        }

        material_type = type_mapping.get(file_ext, MaterialType.PDF.value)

        # Debug print (always works)
        print(f"*** DEBUG: File={file.filename}, Ext={file_ext}, Type={material_type} ***")

        material = Material(
            id=material_id,
            user_id=current_user.id,
            project_id=project_id,
            batch_id=batch_id,
            title=file.filename or "Untitled",
            type=material_type,
            file_name=file.filename,
            file_size=len(file_content),
            file_path=f"storage/materials/{current_user.id}/{batch_id}/{file.filename}",
            processing_status=ProcessingStatus.QUEUED,
            processing_progress=0,
        )
        db.add(material)
        materials.append(material)
        material_ids.append(str(material_id))

        # Save file
        file_path = os.path.join("storage", "materials", str(current_user.id), str(batch_id))
        os.makedirs(file_path, exist_ok=True)
        full_path = os.path.join(file_path, file.filename or "untitled")

        with open(full_path, "wb") as f:
            f.write(file_content)
    
    # Process YouTube URLs
    if youtube_urls:
        for url in youtube_urls:
            material_id = uuid.uuid4()
            # Extract video ID for title
            video_id = url.split("v=")[-1].split("&")[0] if "v=" in url else "video"
            material = Material(
                id=material_id,
                user_id=current_user.id,
                project_id=project_id,
                batch_id=batch_id,
                title=f"YouTube: {video_id}",
                type=MaterialType.YOUTUBE.value,
                source=url,
                processing_status=ProcessingStatus.QUEUED,
                processing_progress=0,
            )
            db.add(material)
            materials.append(material)
            material_ids.append(str(material_id))
    
    # Process link URLs
    if link_urls:
        for url in link_urls:
            material_id = uuid.uuid4()
            material = Material(
                id=material_id,
                user_id=current_user.id,
                project_id=project_id,
                batch_id=batch_id,
                title=f"Article: {url[:50]}...",
                type=MaterialType.ARTICLE.value,
                source=url,
                processing_status=ProcessingStatus.QUEUED,
                processing_progress=0,
            )
            db.add(material)
            materials.append(material)
            material_ids.append(str(material_id))
    
    # Create ProjectContent record
    project_content = ProjectContent(
        project_id=project_id,
        processing_status=ProcessingStatus.QUEUED,
        processing_progress=0,
        total_materials=total_materials,
    )
    db.add(project_content)
    
    # Commit all changes
    await db.commit()
    
    # Refresh to get IDs
    for material in materials:
        await db.refresh(material)
    await db.refresh(project_content)
    
    # Queue Celery task for batch processing
    # Pass storage directory for file resolution
    process_material_batch_task.delay(
        batch_id=str(batch_id),
        material_ids=material_ids,
        user_id=str(current_user.id),
    )
    
    # Return response
    return BatchUploadResponse(
        batch_id=batch_id,
        project_id=project_id,
        materials=[
            MaterialResponse(
                id=m.id,
                user_id=m.user_id,
                title=m.title,
                type=m.type,
                processing_status=m.processing_status,
                processing_progress=m.processing_progress,
                file_name=m.file_name,
                file_size=m.file_size,
                source=m.source,
                created_at=m.created_at,
                updated_at=m.updated_at,
            )
            for m in materials
        ],
        status="queued",
        total_files=total_materials,
    )


@router.get("", response_model=List[MaterialResponse])
async def list_materials(
    project_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all materials for a project, or all user materials if project_id not provided."""
    query = select(Material).where(
        Material.user_id == current_user.id,
        Material.deleted_at.is_(None),
    )
    
    if project_id:
        query = query.where(Material.project_id == project_id)
    
    query = query.order_by(Material.created_at.desc())
    
    result = await db.execute(query)
    materials = result.scalars().all()

    return [
        MaterialResponse(
            id=m.id,
            user_id=m.user_id,
            title=m.title,
            type=m.type,
            processing_status=m.processing_status,
            processing_progress=m.processing_progress,
            file_name=m.file_name,
            file_size=m.file_size,
            source=m.source,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in materials
    ]


@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific material by ID."""
    result = await db.execute(
        select(Material)
        .where(
            Material.id == material_id,
            Material.user_id == current_user.id,
            Material.deleted_at.is_(None),
        )
    )
    material = result.scalar_one_or_none()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    return MaterialResponse(
        id=material.id,
        user_id=material.user_id,
        title=material.title,
        type=material.type,
        processing_status=material.processing_status,
        processing_progress=material.processing_progress,
        file_name=material.file_name,
        file_size=material.file_size,
        source=material.source,
        created_at=material.created_at,
        updated_at=material.updated_at,
    )


@router.get("/batch/{batch_id}", response_model=List[MaterialResponse])
async def get_batch_materials(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all materials in a batch."""
    result = await db.execute(
        select(Material)
        .where(
            Material.batch_id == batch_id,
            Material.user_id == current_user.id,
            Material.deleted_at.is_(None),
        )
        .order_by(Material.created_at.asc())
    )
    materials = result.scalars().all()
    
    if not materials:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No materials found for this batch"
        )
    
    return [
        MaterialResponse(
            id=m.id,
            user_id=m.user_id,
            title=m.title,
            type=m.type,
            processing_status=m.processing_status,
            processing_progress=m.processing_progress,
            file_name=m.file_name,
            file_size=m.file_size,
            source=m.source,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in materials
    ]


# ============== Project Content Endpoints ==============

@router.get("/projects/{project_id}/content", response_model=ProjectContentResponse)
async def get_project_content(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI-generated content for a project (summary, notes, flashcards, quiz).

    Content is generated from all materials in the project combined.
    """
    result = await db.execute(
        select(ProjectContent)
        .where(ProjectContent.project_id == project_id)
    )
    content = result.scalar_one_or_none()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project content not found. Wait for processing to complete."
        )

    return ProjectContentResponse(
        id=content.id,
        project_id=content.project_id,
        summary=content.summary,
        notes=content.notes,
        flashcards=content.flashcards,
        quiz=content.quiz,
        processing_status=content.processing_status,
        processing_progress=content.processing_progress,
        total_materials=content.total_materials,
        created_at=content.created_at,
        updated_at=content.updated_at,
    )


@router.get("/{material_id}/content", response_model=MaterialContentResponse)
async def get_material_content(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI-generated content for a single material (summary, notes, flashcards, quiz).
    """
    from sqlalchemy.orm import selectinload
    
    # Get material with all relationships
    result = await db.execute(
        select(Material)
        .options(
            selectinload(Material.summary),
            selectinload(Material.notes),
            selectinload(Material.flashcards),
            selectinload(Material.quiz_questions),
        )
        .where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )

    # Check ownership
    if material.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Build response
    flashcards_list = [
        {"question": fc.question, "answer": fc.answer}
        for fc in material.flashcards
    ] if material.flashcards else []

    quiz_list = [
        {
            "question": q.question,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "correct_option": q.correct_option,
        }
        for q in material.quiz_questions
    ] if material.quiz_questions else []

    return MaterialContentResponse(
        id=uuid.uuid4(),
        material_id=material.id,
        title=material.title,
        summary=material.summary.summary if material.summary else None,
        notes=material.notes.notes if material.notes else None,
        flashcards=flashcards_list,
        quiz=quiz_list,
        processing_status=material.processing_status.value,
        type=material.type.value if hasattr(material.type, 'value') else str(material.type),
    )


@router.post("/projects/{project_id}/content/regenerate")
async def regenerate_project_content(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Regenerate AI content for a project.
    
    This will re-process all materials and generate new content.
    """
    # Check if project content exists
    result = await db.execute(
        select(ProjectContent)
        .where(ProjectContent.project_id == project_id)
    )
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project content not found"
        )
    
    # Get all materials for this project
    materials_result = await db.execute(
        select(Material)
        .where(
            Material.project_id == project_id,
            Material.user_id == current_user.id,
            Material.deleted_at.is_(None),
        )
    )
    materials = materials_result.scalars().all()
    
    if not materials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No materials found in this project"
        )
    
    # Update status to queued
    content.processing_status = ProcessingStatus.QUEUED
    content.processing_progress = 0
    await db.commit()
    
    # Queue Celery task
    material_ids = [str(m.id) for m in materials]
    process_material_batch_task.delay(
        batch_id=content.id,  # Reuse content ID as batch_id for regeneration
        material_ids=material_ids,
        user_id=str(current_user.id),
    )
    
    return {
        "status": "queued",
        "message": "Content regeneration started",
        "project_id": str(project_id),
    }


# ============================================================================
# TUTOR CHAT ENDPOINTS
# ============================================================================

from app.schemas.material import (
    TutorMessageRequest,
    TutorMessageResponse,
    TutorChatHistoryResponse,
)
from app.schemas.common import MessageResponse
from app.domain.services.tutor_service import TutorService
from sqlalchemy import func
from app.infrastructure.database.models.project import Project


@router.post("/{material_id}/tutor", response_model=TutorMessageResponse)
async def send_tutor_message(
    material_id: UUID,
    message_data: TutorMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    """
    # Verify material ownership
    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )

    if material.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    if material.processing_status != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material is still being processed"
        )

    # Use TutorService to generate response
    tutor_service = TutorService(db)
    await tutor_service.send_message(
        material_id=material_id,
        user_message=message_data.message,
        context=message_data.context
    )

    # Get the last AI message from DB
    result = await db.execute(
        select(TutorMessage)
        .where(TutorMessage.material_id == material_id)
        .where(TutorMessage.role == "assistant")
        .order_by(TutorMessage.created_at.desc())
        .limit(1)
    )
    ai_message = result.scalar_one()

    return ai_message


# ============================================================================
# PROJECT-LEVEL TUTOR CHAT ENDPOINTS
# ============================================================================

@router.post("/projects/{project_id}/tutor", response_model=ProjectTutorMessageResponse)
async def send_project_tutor_message(
    project_id: UUID,
    message_data: TutorMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a message to the AI tutor for ALL materials in a project.

    Uses RAG across all materials in the project to provide comprehensive answers.

    Args:
        project_id: Project ID
        message_data: Message data
        db: Database session
        current_user: Current authenticated user

    Returns:
        TutorMessageResponse: AI tutor response
    """
    from app.infrastructure.database.models.project import Project

    # Verify project ownership
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Get all completed materials in the project
    materials_result = await db.execute(
        select(Material).where(
            Material.project_id == project_id,
            Material.processing_status == ProcessingStatus.COMPLETED
        )
    )
    materials = materials_result.scalars().all()

    if not materials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No completed materials in this project"
        )

    # Create custom TutorService that searches across all materials
    tutor_service = TutorService(db)
    await tutor_service.send_message_project_wide(
        project_id=project_id,
        material_ids=[m.id for m in materials],
        user_message=message_data.message,
        context=message_data.context
    )

    # Get the last AI message from project tutor messages
    result = await db.execute(
        select(ProjectTutorMessage)
        .where(ProjectTutorMessage.project_id == project_id)
        .where(ProjectTutorMessage.role == "assistant")
        .order_by(ProjectTutorMessage.created_at.desc())
        .limit(1)
    )
    ai_message = result.scalar_one()

    return ai_message


@router.get("/projects/{project_id}/tutor/history", response_model=ProjectTutorChatHistoryResponse)
async def get_project_tutor_history(
    project_id: UUID,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get tutor chat history for a project (all materials).
    """
    from app.infrastructure.database.models.project import Project

    # Verify project ownership
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Get messages from project tutor messages table
    messages_result = await db.execute(
        select(ProjectTutorMessage)
        .where(ProjectTutorMessage.project_id == project_id)
        .order_by(ProjectTutorMessage.created_at.asc())
        .limit(limit)
    )
    messages = messages_result.scalars().all()

    return {"messages": messages, "total": len(messages)}


# ============================================================================
# MATERIAL-LEVEL TUTOR CHAT ENDPOINTS
# ============================================================================

@router.get("/{material_id}/tutor/history", response_model=TutorChatHistoryResponse)
async def get_tutor_history(
    material_id: UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    # Verify material ownership
    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )

    if material.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Get messages
    tutor_service = TutorService(db)
    messages = await tutor_service.get_history(material_id, limit)

    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(TutorMessage).where(TutorMessage.material_id == material_id)
    )
    total = count_result.scalar()

    return {"messages": messages, "total": total}


@router.delete("/{material_id}/tutor/history", response_model=MessageResponse)
async def clear_tutor_history(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clear all tutor chat history for a material.

    Args:
        material_id: Material ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Success message

    Raises:
        HTTPException: If material not found or access denied
    """
    # Verify material ownership
    result = await db.execute(
        select(Material).where(Material.id == material_id)
    )
    material = result.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )

    if material.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Clear history
    tutor_service = TutorService(db)
    await tutor_service.clear_history(material_id)

    return {"message": "Chat history cleared successfully"}

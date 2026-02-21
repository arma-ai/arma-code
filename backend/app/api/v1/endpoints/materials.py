"""Material management endpoints."""

import logging
import httpx
import tempfile
import os
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

logger = logging.getLogger(__name__)

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
from app.domain.services.material_processing_service import MaterialProcessingService
from app.domain.services.tutor_service import TutorService
from app.domain.services.podcast_service import PodcastService
from app.domain.services.presentation_service import PresentationService
from app.infrastructure.ai.ai_tts_service import AITTSService
from app.infrastructure.utils.file_storage import FileStorageService
from app.infrastructure.utils.text_extraction import (
    extract_text_from_pdf,
    extract_text_from_youtube,
    normalize_text
)
from app.infrastructure.queue.tasks import process_material_task


router = APIRouter()
file_storage = FileStorageService()


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
    source: Optional[str] = Form(default=None),
    file: Union[UploadFile, str, None] = File(default=""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new material.

    For PDF: Upload file via multipart/form-data OR provide URL to download
    For YouTube: Provide source URL

    Args:
        title: Material title
        material_type: Type of material (pdf or youtube)
        source: URL (required for youtube type, optional for pdf to download from URL)
        file: PDF file (optional if source URL is provided for pdf type)
        db: Database session
        current_user: Current authenticated user

    Returns:
        MaterialResponse: Created material

    Raises:
        HTTPException: If validation fails
    """
    # Clean up source - treat empty string as None
    if source is not None and source.strip() == "":
        source = None

    # Clean up file - treat empty string as None
    if isinstance(file, str) and file.strip() == "":
        file = None

    file_path = None
    file_size = None
    file_name = None

    # Validate based on type
    if material_type == MaterialType.PDF:
        # Either file or source URL is required for PDF
        if not file and not source:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either file or source URL is required for PDF type"
            )
        
        if file:
            # File upload
            if not file.filename.endswith('.pdf'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only PDF files are allowed"
                )

            # Save file to filesystem
            try:
                file_path, file_size = file_storage.save_uploaded_file(
                    file, str(current_user.id), file.filename
                )
                file_name = file.filename
                logger.info(f"Saved PDF file: {file_path}, size: {file_size} bytes")
            except Exception as e:
                logger.error(f"Failed to save PDF file: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to save file: {str(e)}"
                )
        else:
            # Download PDF from URL
            logger.info(f"Downloading PDF from URL: {source}")
            try:
                async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                    response = await client.get(source, headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "application/pdf,*/*"
                    })
                    response.raise_for_status()

                    # Get content
                    pdf_content = response.content
                    file_size = len(pdf_content)

                    # Validate that content is actually a PDF (check magic bytes)
                    if not pdf_content.startswith(b'%PDF-'):
                        content_type = response.headers.get("content-type", "").lower()
                        logger.error(f"Downloaded content is not a valid PDF. Content-Type: {content_type}, First bytes: {pdf_content[:50]}")

                        # Check if it's HTML (likely an error page or login redirect)
                        if b'<!DOCTYPE' in pdf_content[:100] or b'<html' in pdf_content[:100].lower():
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="URL returned HTML instead of PDF. The file may be behind authentication or unavailable."
                            )
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Downloaded file is not a valid PDF"
                        )

                    # Get filename from URL or content-disposition header
                    content_disposition = response.headers.get("content-disposition", "")
                    if "filename=" in content_disposition:
                        file_name = content_disposition.split("filename=")[-1].strip('"\'')
                    else:
                        # Extract from URL
                        from urllib.parse import urlparse, unquote
                        url_path = urlparse(source).path
                        file_name = unquote(url_path.split("/")[-1])
                        if not file_name.endswith('.pdf'):
                            file_name = f"{title[:50].replace(' ', '_')}.pdf"

                    # Save using file storage
                    user_dir = f"storage/materials/{current_user.id}"
                    os.makedirs(user_dir, exist_ok=True)
                    file_path = os.path.join(user_dir, file_name)

                    with open(file_path, "wb") as f:
                        f.write(pdf_content)

                    logger.info(f"Downloaded valid PDF: {file_path}, size: {file_size} bytes")

            except httpx.HTTPStatusError as e:
                logger.error(f"Failed to download PDF: HTTP {e.response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to download PDF: HTTP {e.response.status_code}"
                )
            except HTTPException:
                raise  # Re-raise our own HTTPExceptions
            except Exception as e:
                logger.error(f"Failed to download PDF: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to download PDF: {str(e)}"
                )

        new_material = Material(
            user_id=current_user.id,
            title=title,
            type=material_type,
            file_path=file_path,
            file_name=file_name,
            file_size=file_size,
            source=source,  # Store original URL
            processing_status=ProcessingStatus.PROCESSING
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
            processing_status=ProcessingStatus.PROCESSING
        )

    elif material_type == MaterialType.ARTICLE:
        if not source:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source URL is required for Article type"
            )

        # Download HTML content from URL
        logger.info(f"Downloading article from URL: {source}")
        try:
            async with httpx.AsyncClient(
                timeout=30.0,
                follow_redirects=True,
                verify=False  # Disable SSL verification for external URLs
            ) as client:
                response = await client.get(source, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                })
                response.raise_for_status()

                # Get content
                html_content = response.content
                file_size = len(html_content)

                # Validate that content is HTML
                content_type = response.headers.get("content-type", "").lower()
                if not (content_type.startswith("text/html") or b'<!DOCTYPE' in html_content[:100] or b'<html' in html_content[:100].lower()):
                    logger.error(f"Downloaded content is not HTML. Content-Type: {content_type}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="URL does not point to valid HTML content"
                    )

                # Get filename from URL
                from urllib.parse import urlparse, unquote
                url_path = urlparse(source).path
                file_name = unquote(url_path.split("/")[-1])
                if not file_name or not file_name.endswith('.html'):
                    file_name = f"{title[:50].replace(' ', '_')}.html"

                # Save using file storage
                user_dir = f"storage/materials/{current_user.id}"
                os.makedirs(user_dir, exist_ok=True)
                file_path = os.path.join(user_dir, file_name)

                with open(file_path, "wb") as f:
                    f.write(html_content)

                logger.info(f"Downloaded article: {file_path}, size: {file_size} bytes")

        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to download article: HTTP {e.response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to download article: HTTP {e.response.status_code}"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to download article: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to download article: {str(e)}"
            )

        new_material = Material(
            user_id=current_user.id,
            title=title,
            type=material_type,
            file_path=file_path,
            file_name=file_name,
            file_size=file_size,
            source=source,
            processing_status=ProcessingStatus.PROCESSING
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid material type"
        )

    db.add(new_material)
    await db.commit()
    await db.refresh(new_material)

    # Trigger Celery task for async processing
    try:
        task_kwargs = {
            "material_id": str(new_material.id),
            "material_type": material_type.value,
        }

        if material_type == MaterialType.PDF:
            task_kwargs["file_path"] = file_path
        elif material_type == MaterialType.YOUTUBE:
            task_kwargs["source"] = source
        elif material_type == MaterialType.ARTICLE:
            task_kwargs["file_path"] = file_path

        logger.info(f"Triggering Celery task for material {new_material.id}")
        task = process_material_task.apply_async(kwargs=task_kwargs)
        logger.info(f"Celery task created: {task.id}")

    except Exception as e:
        logger.error(f"Failed to trigger Celery task: {str(e)}")
        # Mark as failed if we can't even start the task
        new_material.processing_status = ProcessingStatus.FAILED
        new_material.processing_error = f"Failed to start processing: {str(e)}"
        await db.commit()
        await db.refresh(new_material)

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

    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Material)
        .options(selectinload(Material.summary), selectinload(Material.notes))
        .where(Material.id == material_id)
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

    # Использовать TutorService для генерации ответа
    tutor_service = TutorService(db)
    ai_response_content = await tutor_service.send_message(
        material_id=material_id,
        user_message=message_data.message,
        context=message_data.context
    )

    # Получить последнее AI сообщение из БД (уже сохранено в send_message)
    result = await db.execute(
        select(TutorMessage)
        .where(TutorMessage.material_id == material_id)
        .where(TutorMessage.role == "assistant")
        .order_by(TutorMessage.created_at.desc())
        .limit(1)
    )
    ai_message = result.scalar_one()

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


@router.delete("/{material_id}/tutor/history", response_model=MessageResponse)
async def clear_tutor_history(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
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
    await verify_material_owner(material_id, current_user, db)

    # Delete all messages for this material
    from sqlalchemy import delete
    await db.execute(
        delete(TutorMessage).where(TutorMessage.material_id == material_id)
    )
    await db.commit()

    return {"message": "Chat history cleared successfully"}


@router.post("/{material_id}/tutor/{message_id}/speak")
async def tutor_message_speak(
    material_id: UUID,
    message_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Generate speech audio for a tutor message (TTS).
    
    Args:
        material_id: Material ID
        message_id: Tutor message ID
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        dict: Audio URL for playback
        
    Raises:
        HTTPException: If message not found or TTS generation failed
    """
    await verify_material_owner(material_id, current_user, db)
    
    # Get tutor message
    result = await db.execute(
        select(TutorMessage).where(
            TutorMessage.id == message_id,
            TutorMessage.material_id == material_id
        )
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor message not found"
        )
    
    if not message.content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message has no content"
        )
    
    try:
        # Generate speech using Edge TTS
        tts_service = AITTSService()
        audio_path = await tts_service.text_to_speech(
            text=message.content,
            language=None,  # Auto-detect
            gender="female",
            rate="+0%",
            pitch="+0Hz",
        )
        
        if not audio_path:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate audio"
            )
        
        # Build URL for frontend
        audio_url = f"/storage/tts_audio/{os.path.basename(audio_path)}"
        
        logger.info(
            f"[TTS] Generated speech for tutor message",
            extra={"message_id": str(message_id), "audio_path": audio_path}
        )
        
        return {
            "audio_url": audio_url,
            "message_id": str(message_id),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TTS] Error generating speech: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TTS generation failed: {str(e)}"
        )


@router.post("/{material_id}/process", response_model=MessageResponse)
async def process_material(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Trigger processing of a material (extract text, generate AI content, create embeddings).

    Args:
        material_id: Material ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Processing started message

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

    if not material.full_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material has no text to process. Upload a file or provide a source first."
        )

    # Dispatch to Celery for async processing (no longer blocks HTTP request)
    try:
        task_kwargs = {
            "material_id": str(material_id),
            "material_type": material.type.value,
        }
        if material.type == MaterialType.PDF:
            task_kwargs["file_path"] = material.file_path
        elif material.type == MaterialType.YOUTUBE:
            task_kwargs["source"] = material.source

        material.processing_status = ProcessingStatus.PROCESSING
        material.processing_progress = 0
        await db.commit()

        task = process_material_task.apply_async(kwargs=task_kwargs)
        logger.info(f"Dispatched Celery task {task.id} for material {material_id}")

        return {"message": "Processing started", "task_id": str(task.id)}

    except Exception as e:
        logger.error(f"Failed to dispatch Celery task: {str(e)}")
        material.processing_status = ProcessingStatus.FAILED
        material.processing_error = f"Failed to start processing: {str(e)}"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start processing: {str(e)}"
        )



@router.post("/{material_id}/retry", response_model=MessageResponse)
async def retry_material_processing(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retry processing of a failed or stuck material.

    Resets the material status and re-triggers the full processing pipeline
    including text extraction and AI content generation.

    Args:
        material_id: Material ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Processing started message

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

    # Reset material status
    material.processing_status = ProcessingStatus.PROCESSING
    material.processing_progress = 0
    material.processing_error = None
    await db.commit()

    # Trigger Celery task for async processing
    try:
        task_kwargs = {
            "material_id": str(material.id),
            "material_type": material.type.value,
        }

        if material.type == MaterialType.PDF:
            task_kwargs["file_path"] = material.file_path
        elif material.type == MaterialType.YOUTUBE:
            task_kwargs["source"] = material.source

        logger.info(f"Retrying Celery task for material {material.id}")
        task = process_material_task.apply_async(kwargs=task_kwargs)
        logger.info(f"Celery retry task created: {task.id}")

        return {"message": "Material processing restarted"}

    except Exception as e:
        logger.error(f"Failed to retry Celery task: {str(e)}")
        # Mark as failed if we can't even start the task
        material.processing_status = ProcessingStatus.FAILED
        material.processing_error = f"Failed to restart processing: {str(e)}"
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restart processing: {str(e)}"
        )


@router.post("/{material_id}/regenerate/summary", response_model=MessageResponse)
async def regenerate_summary(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Regenerate summary for a material.

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

    processing_service = MaterialProcessingService(db)
    await processing_service.regenerate_summary(material_id)

    return {"message": "Summary regenerated successfully"}


@router.post("/{material_id}/regenerate/notes", response_model=MessageResponse)
async def regenerate_notes(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Regenerate notes for a material.

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

    processing_service = MaterialProcessingService(db)
    await processing_service.regenerate_notes(material_id)

    return {"message": "Notes regenerated successfully"}


@router.post("/{material_id}/regenerate/flashcards", response_model=MessageResponse)
async def regenerate_flashcards(
    material_id: UUID,
    count: int = 15,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Regenerate flashcards for a material.

    Args:
        material_id: Material ID
        count: Number of flashcards to generate
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Success message

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(material_id, current_user, db)

    processing_service = MaterialProcessingService(db)
    flashcard_count = await processing_service.regenerate_flashcards(material_id, count)

    return {"message": f"Regenerated {flashcard_count} flashcards successfully"}


@router.post("/{material_id}/regenerate/quiz", response_model=MessageResponse)
async def regenerate_quiz(
    material_id: UUID,
    count: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Regenerate quiz questions for a material.

    Args:
        material_id: Material ID
        count: Number of quiz questions to generate
        db: Database session
        current_user: Current authenticated user

    Returns:
        MessageResponse: Success message

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(material_id, current_user, db)

    processing_service = MaterialProcessingService(db)
    quiz_count = await processing_service.regenerate_quiz(material_id, count)

    return {"message": f"Regenerated {quiz_count} quiz questions successfully"}


@router.post("/{material_id}/podcast/generate-script")
async def generate_podcast_script(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate podcast script for a material using ChatGPT.

    Args:
        material_id: Material ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        dict: Podcast script data

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

    if not material.full_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material has no text to generate podcast from"
        )

    try:
        podcast_service = PodcastService()
        script = await podcast_service.generate_podcast_script(material)

        # Сохраняем скрипт в БД
        material.podcast_script = script
        await db.commit()

        return {"podcast_script": script}

    except Exception as e:
        logger.error(f"Failed to generate podcast script: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate podcast script: {str(e)}"
        )


@router.post("/{material_id}/podcast/generate-audio")
async def generate_podcast_audio(
    material_id: UUID,
    tts_provider: str = "edge",  # "edge" или "elevenlabs"
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate podcast audio for a material using Edge TTS (бесплатно) или ElevenLabs (платно).

    Args:
        material_id: Material ID
        tts_provider: TTS провайдер ("edge" - бесплатно, "elevenlabs" - платно)
        db: Database session
        current_user: Current authenticated user

    Returns:
        dict: Podcast audio URL and provider info

    Raises:
        HTTPException: If material not found, no script, or access denied
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

    if not material.podcast_script:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Podcast script not generated yet. Generate script first."
        )

    try:
        podcast_service = PodcastService()

        # Генерируем имя файла
        import time
        timestamp = int(time.time())
        filename = f"{material_id}_{timestamp}.mp3"

        # Путь для сохранения аудио (локальный)
        storage_path = f"storage/podcasts/{current_user.id}/{filename}"

        # Генерируем аудио в зависимости от провайдера
        if tts_provider == "edge":
            logger.info(f"Generating podcast audio with Edge TTS for material {material_id}")
            await podcast_service.generate_podcast_audio_edge_tts(
                material.podcast_script,
                storage_path,
                language="auto"
            )
            provider_used = "edge"
        elif tts_provider == "elevenlabs":
            logger.info(f"Generating podcast audio with ElevenLabs for material {material_id}")
            await podcast_service.generate_podcast_audio(
                material.podcast_script,
                storage_path
            )
            provider_used = "elevenlabs"
        else:
            # По умолчанию используем Edge TTS с fallback
            logger.info(f"Generating podcast audio with fallback strategy for material {material_id}")
            await podcast_service.generate_podcast_audio_with_fallback(
                material.podcast_script,
                storage_path,
                prefer_edge_tts=True
            )
            provider_used = "edge_with_fallback"

        # URL для доступа к аудио (для фронтенда)
        audio_url = f"/storage/podcasts/{current_user.id}/{filename}"

        # Сохраняем URL в БД
        material.podcast_audio_url = audio_url
        await db.commit()

        return {
            "podcast_audio_url": audio_url,
            "provider": provider_used,
            "message": f"Podcast audio generated successfully using {provider_used}"
        }

    except Exception as e:
        logger.error(f"Failed to generate podcast audio: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate podcast audio: {str(e)}"
        )


@router.post("/{material_id}/presentation/generate")
async def generate_presentation(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate presentation for a material using ChatGPT + SlidesGPT.

    Args:
        material_id: Material ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        dict: Presentation data with URLs

    Raises:
        HTTPException: If material not found or generation failed
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

    if not material.full_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material has no text to generate presentation from"
        )

    try:
        # Обновляем статус на "generating"
        material.presentation_status = "generating"
        await db.commit()

        presentation_service = PresentationService()

        # Получаем summary если есть
        from app.infrastructure.database.models.material import MaterialSummary
        summary_result = await db.execute(
            select(MaterialSummary).where(MaterialSummary.material_id == material_id)
        )
        summary_obj = summary_result.scalar_one_or_none()
        summary_text = summary_obj.summary if summary_obj else None

        # Генерируем презентацию
        presentation_data = await presentation_service.generate_presentation(
            material, summary_text
        )

        # Сохраняем результат
        material.presentation_status = "completed"
        material.presentation_url = presentation_data["url"]
        material.presentation_embed_url = presentation_data.get("embed_url")
        await db.commit()

        return {
            "presentation_url": material.presentation_url,
            "presentation_embed_url": material.presentation_embed_url,
            "presentation_status": material.presentation_status
        }

    except Exception as e:
        logger.error(f"Failed to generate presentation: {str(e)}")

        # Обновляем статус на "failed"
        material.presentation_status = "failed"
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presentation: {str(e)}"
        )


@router.get("/{material_id}/summary")
async def get_material_summary(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get summary for a material.

    Args:
        material_id: Material ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        MaterialSummary or null

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(material_id, current_user, db)

    result = await db.execute(
        select(MaterialSummary).where(MaterialSummary.material_id == material_id)
    )
    summary = result.scalar_one_or_none()

    return summary


@router.get("/{material_id}/notes")
async def get_material_notes(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get notes for a material.

    Args:
        material_id: Material ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        MaterialNotes or null

    Raises:
        HTTPException: If material not found or access denied
    """
    await verify_material_owner(material_id, current_user, db)

    result = await db.execute(
        select(MaterialNotes).where(MaterialNotes.material_id == material_id)
    )
    notes = result.scalar_one_or_none()

    return notes

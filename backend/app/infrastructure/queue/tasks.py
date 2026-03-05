"""
Celery tasks для фоновой обработки
"""
import logging
from uuid import UUID
from typing import Optional

from celery import Task
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.infrastructure.queue.celery_app import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)

# Async database session для tasks
# Using proper connection pool (pool_size=5) for better performance
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
)
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)


class DatabaseTask(Task):
    """
    Base task с автоматическим управлением database session
    """
    _session = None

    async def get_session(self):
        """Get async database session."""
        return AsyncSessionLocal()


@celery_app.task(bind=True, base=DatabaseTask, name="process_material")
def process_material_task(
    self,
    material_id: str,
    material_type: str,
    file_path: Optional[str] = None,
    source: Optional[str] = None,
) -> dict:
    """
    Фоновая задача для обработки материала (PDF или YouTube).

    Args:
        material_id: UUID материала
        material_type: Тип материала ('pdf' или 'youtube')
        file_path: Путь к файлу (для PDF)
        source: YouTube URL (для YouTube)

    Returns:
        dict с результатом обработки

    Process:
        1. Извлечение текста (PDF parsing / YouTube transcription)
        2. Нормализация текста
        3. Генерация AI контента (summary, notes, flashcards, quiz)
        4. Создание embeddings для RAG
        5. Обновление статуса материала
    """
    import asyncio
    from app.domain.services.material_processing_service import MaterialProcessingService
    from app.infrastructure.database.models.material import Material, ProcessingStatus
    from app.infrastructure.utils.text_extraction import (
        extract_text_from_pdf,
        extract_text_from_youtube,
        normalize_text
    )
    from sqlalchemy import select, update

    logger.info(f"[process_material_task] Starting processing for material {material_id}")
    logger.info(f"[process_material_task] Parameters: material_type={material_type}, file_path={file_path}, source={source}")

    # Используем словарь для хранения контекста, чтобы избежать UnboundLocalError
    # с file_path во вложенной функции
    task_context = {"file_path": file_path}

    async def async_process():
        async with AsyncSessionLocal() as session:
            try:
                material_uuid = UUID(material_id)

                # Update status to processing
                await session.execute(
                    update(Material)
                    .where(Material.id == material_uuid)
                    .values(processing_status=ProcessingStatus.PROCESSING, processing_progress=10)
                )
                await session.commit()
                logger.info(f"[process_material_task] Status updated to PROCESSING")

                # Step 1: Extract text
                full_text = None
                if material_type.lower() == "youtube":
                    logger.info(f"[process_material_task] Extracting text from YouTube: {source}")
                    full_text = extract_text_from_youtube(source)
                else:
                    # Handle file-based materials (PDF, DOCX, TXT, etc.)
                    # Получаем текущий путь из контекста
                    current_path = task_context["file_path"]

                    # Проверка пути файла
                    import os
                    if current_path and not os.path.exists(current_path):
                        # Если путь относительный (storage/...), попробуем найти его
                        if not current_path.startswith('/'):
                            # Try /app/storage first (Docker)
                            docker_path = os.path.join('/app', current_path)
                            if os.path.exists(docker_path):
                                logger.info(f"[process_material_task] Resolved path in Docker: {docker_path}")
                                task_context["file_path"] = docker_path
                                current_path = docker_path
                            else:
                                # Try backend directory (local development)
                                import sys
                                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                                local_path = os.path.join(backend_dir, current_path)
                                if os.path.exists(local_path):
                                    logger.info(f"[process_material_task] Resolved path locally: {local_path}")
                                    task_context["file_path"] = local_path
                                    current_path = local_path
                                else:
                                    logger.error(f"[process_material_task] File not found at: {local_path}")
                                    raise FileNotFoundError(f"File not found: {current_path}")

                    # Article type is stored as HTML, so use HTML extractor
                    extract_type = "html" if material_type.lower() == "article" else material_type
                    logger.info(f"[process_material_task] Extracting text from {material_type.upper()} (as {extract_type.upper()}): {current_path}")

                    # Use universal extractor
                    from app.infrastructure.utils.text_extraction import extract_text_from_document
                    full_text = extract_text_from_document(current_path, extract_type)

                # Normalize text
                full_text = normalize_text(full_text)
                logger.info(f"[process_material_task] Extracted {len(full_text)} characters")

                # Update progress
                await session.execute(
                    update(Material)
                    .where(Material.id == material_uuid)
                    .values(full_text=full_text, processing_progress=30)
                )
                await session.commit()

                # Step 2: Process material with AI
                logger.info(f"[process_material_task] Starting AI processing")
                processing_service = MaterialProcessingService(session)
                await processing_service.process_material(material_uuid, full_text)

                # Step 3: Mark as completed
                await session.execute(
                    update(Material)
                    .where(Material.id == material_uuid)
                    .values(processing_status=ProcessingStatus.COMPLETED, processing_progress=100)
                )
                await session.commit()

                logger.info(f"[process_material_task] Completed processing for material {material_id}")
                return {"status": "success", "material_id": material_id}

            except Exception as e:
                logger.error(f"[process_material_task] Error: {str(e)}", exc_info=True)

                # Update status to failed
                try:
                    await session.execute(
                        update(Material)
                        .where(Material.id == UUID(material_id))
                        .values(
                            processing_status=ProcessingStatus.FAILED,
                            processing_error=str(e)
                        )
                    )
                    await session.commit()
                except Exception as update_error:
                    logger.error(f"[process_material_task] Failed to update error status: {str(update_error)}")

                raise

    # Run async function in a new event loop
    # This is necessary because Celery runs in a sync context
    import nest_asyncio
    try:
        nest_asyncio.apply()
    except:
        pass
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Create new loop if current one is running
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            return new_loop.run_until_complete(async_process())
        else:
            return loop.run_until_complete(async_process())
    except RuntimeError:
        # No event loop exists, create new one
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(async_process())


@celery_app.task(bind=True, base=DatabaseTask, name="generate_podcast")
def generate_podcast_task(self, material_id: str, user_id: str) -> dict:
    """
    Генерация podcast для материала.

    Args:
        material_id: UUID материала
        user_id: UUID пользователя

    Returns:
        dict с URL podcast
    """
    import asyncio
    from app.domain.services.podcast_service import PodcastService

    logger.info(f"[generate_podcast] Starting for material {material_id}")

    async def async_generate():
        async with AsyncSessionLocal() as session:
            service = PodcastService(session)

            try:
                result = await service.generate_podcast(UUID(material_id))
                logger.info(f"[generate_podcast] Completed for material {material_id}")
                return result

            except Exception as e:
                logger.error(f"[generate_podcast] Error: {str(e)}")
                raise

    # Bug fix #2.4: Handle event loop properly
    try:
        loop = asyncio.get_running_loop()
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        return new_loop.run_until_complete(async_generate())
    except RuntimeError:
        return asyncio.run(async_generate())


@celery_app.task(bind=True, base=DatabaseTask, name="generate_presentation")
def generate_presentation_task(self, material_id: str, user_id: str) -> dict:
    """
    Генерация presentation для материала.

    Args:
        material_id: UUID материала
        user_id: UUID пользователя

    Returns:
        dict с URL presentation
    """
    import asyncio
    from app.domain.services.presentation_service import PresentationService

    logger.info(f"[generate_presentation] Starting for material {material_id}")

    async def async_generate():
        async with AsyncSessionLocal() as session:
            service = PresentationService(session)

            try:
                result = await service.generate_presentation(UUID(material_id))
                logger.info(f"[generate_presentation] Completed for material {material_id}")
                return result

            except Exception as e:
                logger.error(f"[generate_presentation] Error: {str(e)}")
                raise

    # Bug fix #2.4: Handle event loop properly
    try:
        loop = asyncio.get_running_loop()
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        return new_loop.run_until_complete(async_generate())
    except RuntimeError:
        return asyncio.run(async_generate())


@celery_app.task(name="cleanup_old_attempts")
def cleanup_old_attempts_task() -> dict:
    """
    Периодическая задача для очистки старых quiz attempts (опционально).

    Returns:
        dict с количеством удаленных записей
    """
    import asyncio
    from datetime import datetime, timezone, timedelta

    logger.info("[cleanup_old_attempts] Starting cleanup")

    async def async_cleanup():
        async with AsyncSessionLocal() as session:
            # Удалить attempts старше 90 дней
            cutoff_date = datetime.utcnow() - timedelta(days=90)

            # TODO: Implement cleanup logic
            # deleted_count = await repository.delete_old_attempts(cutoff_date)

            logger.info(f"[cleanup_old_attempts] Completed")
            return {"deleted_count": 0}

    # Bug fix #2.4: Handle event loop properly
    try:
        loop = asyncio.get_running_loop()
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        return new_loop.run_until_complete(async_cleanup())
    except RuntimeError:
        return asyncio.run(async_cleanup())

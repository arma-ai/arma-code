"""
Celery tasks для фоновой обработки
"""
import logging
from uuid import UUID
from typing import Optional

from celery import Task
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.infrastructure.queue.celery_app import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)

# Async database session для tasks
# Используем NullPool, чтобы избежать проблем с event loops и fork в Celery
async_engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=False,
    poolclass=NullPool
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
                if material_type == "youtube":
                    logger.info(f"[process_material_task] Extracting text from YouTube: {source}")
                    full_text = extract_text_from_youtube(source)
                else:
                    # Handle file-based materials (PDF, DOCX, TXT, etc.)
                    # Получаем текущий путь из контекста
                    current_path = task_context["file_path"]

                    # Проверка пути файла для Docker окружения
                    import os
                    if current_path and not os.path.exists(current_path):
                        # Если путь относительный (storage/...), попробуем найти его в /app/storage
                        # Это актуально, если backend запущен локально, а worker в Docker
                        if not current_path.startswith('/'):
                            docker_path = os.path.join('/app', current_path)
                            if os.path.exists(docker_path):
                                logger.info(f"[process_material_task] Resolved path in Docker: {docker_path}")
                                task_context["file_path"] = docker_path
                                current_path = docker_path
                            else:
                                logger.error(f"[process_material_task] File not found in Docker at: {docker_path}")
                                # Debug: list storage directory
                                try:
                                    storage_dir = '/app/storage'
                                    if os.path.exists(storage_dir):
                                        logger.info(f"Listing {storage_dir}: {os.listdir(storage_dir)}")

                                        # Deep debug: list subdirectories if they exist
                                        parts = current_path.split('/')
                                        if len(parts) > 1 and parts[0] == 'storage':
                                            # storage/materials/uuid/...
                                            if os.path.exists('/app/storage/materials'):
                                                try:
                                                    logger.info(f"Listing /app/storage/materials: {os.listdir('/app/storage/materials')}")
                                                except:
                                                    pass
                                except Exception as e:
                                    logger.error(f"Failed to list storage dir: {e}")

                    logger.info(f"[process_material_task] Extracting text from {material_type.upper()}: {current_path}")

                    # Use universal extractor
                    from app.infrastructure.utils.text_extraction import extract_text_from_document
                    full_text = extract_text_from_document(current_path, material_type)

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

    # Run async function
    # Используем asyncio.run() для корректного управления event loop
    return asyncio.run(async_process())


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

    return asyncio.run(async_generate())


@celery_app.task(name="cleanup_old_attempts")
def cleanup_old_attempts_task() -> dict:
    """
    Периодическая задача для очистки старых quiz attempts (опционально).

    Returns:
        dict с количеством удаленных записей
    """
    import asyncio
    from datetime import datetime, timedelta

    logger.info("[cleanup_old_attempts] Starting cleanup")

    async def async_cleanup():
        async with AsyncSessionLocal() as session:
            # Удалить attempts старше 90 дней
            cutoff_date = datetime.utcnow() - timedelta(days=90)

            # TODO: Implement cleanup logic
            # deleted_count = await repository.delete_old_attempts(cutoff_date)

            logger.info(f"[cleanup_old_attempts] Completed")
            return {"deleted_count": 0}

    return asyncio.run(async_cleanup())

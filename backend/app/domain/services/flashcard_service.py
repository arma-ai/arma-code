"""
Service для бизнес-логики Flashcards
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.repositories.flashcard_repository import FlashcardRepository
from app.infrastructure.database.models.flashcard import Flashcard
from app.schemas.flashcard import FlashcardCreate, FlashcardUpdate


class FlashcardService:
    """Сервис для работы с flashcards."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = FlashcardRepository(session)

    async def create_flashcard(
        self, material_id: UUID, data: FlashcardCreate
    ) -> Flashcard:
        """
        Создать новую flashcard.

        Args:
            material_id: ID материала
            data: Данные карточки

        Returns:
            Flashcard: Созданная карточка
        """
        return await self.repository.create(
            material_id=material_id,
            question=data.question,
            answer=data.answer,
        )

    async def get_flashcard(self, flashcard_id: UUID) -> Optional[Flashcard]:
        """
        Получить flashcard по ID.

        Args:
            flashcard_id: ID карточки

        Returns:
            Flashcard или None
        """
        return await self.repository.get_by_id(flashcard_id)

    async def get_material_flashcards(self, material_id: UUID) -> List[Flashcard]:
        """
        Получить все flashcards материала.

        Args:
            material_id: ID материала

        Returns:
            List[Flashcard]: Список карточек
        """
        return await self.repository.get_by_material(material_id)

    async def update_flashcard(
        self, flashcard_id: UUID, data: FlashcardUpdate
    ) -> Optional[Flashcard]:
        """
        Обновить flashcard.

        Args:
            flashcard_id: ID карточки
            data: Новые данные

        Returns:
            Flashcard или None
        """
        return await self.repository.update(
            flashcard_id=flashcard_id,
            question=data.question,
            answer=data.answer,
        )

    async def delete_flashcard(self, flashcard_id: UUID) -> bool:
        """
        Удалить flashcard.

        Args:
            flashcard_id: ID карточки

        Returns:
            bool: True если удалена
        """
        return await self.repository.delete(flashcard_id)

    async def count_flashcards(self, material_id: UUID) -> int:
        """
        Подсчитать количество flashcards для материала.

        Args:
            material_id: ID материала

        Returns:
            int: Количество карточек
        """
        return await self.repository.count_by_material(material_id)

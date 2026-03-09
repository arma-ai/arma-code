"""
Repository для работы с Flashcards
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import joinedload

from app.infrastructure.database.models.flashcard import Flashcard


class FlashcardRepository:
    """Repository для CRUD операций с flashcards."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, material_id: UUID, question: str, answer: str) -> Flashcard:
        """
        Создать новую flashcard.

        Args:
            material_id: ID материала
            question: Вопрос
            answer: Ответ

        Returns:
            Flashcard: Созданная карточка
        """
        flashcard = Flashcard(
            material_id=material_id, question=question, answer=answer
        )
        self.session.add(flashcard)
        await self.session.commit()
        await self.session.refresh(flashcard)
        return flashcard

    async def get_by_id(self, flashcard_id: UUID) -> Optional[Flashcard]:
        """
        Получить flashcard по ID.

        Args:
            flashcard_id: ID карточки

        Returns:
            Flashcard или None
        """
        result = await self.session.execute(
            select(Flashcard).where(Flashcard.id == flashcard_id)
        )
        return result.scalar_one_or_none()

    async def get_by_material(self, material_id: UUID) -> List[Flashcard]:
        """
        Получить все flashcards для материала.

        Args:
            material_id: ID материала

        Returns:
            List[Flashcard]: Список карточек
        """
        result = await self.session.execute(
            select(Flashcard)
            .where(Flashcard.material_id == material_id)
            .order_by(Flashcard.created_at.asc())
        )
        return list(result.scalars().all())

    async def update(
        self, flashcard_id: UUID, question: Optional[str] = None, answer: Optional[str] = None
    ) -> Optional[Flashcard]:
        """
        Обновить flashcard.

        Args:
            flashcard_id: ID карточки
            question: Новый вопрос (опционально)
            answer: Новый ответ (опционально)

        Returns:
            Flashcard или None если не найдена
        """
        flashcard = await self.get_by_id(flashcard_id)
        if not flashcard:
            return None

        if question is not None:
            flashcard.question = question
        if answer is not None:
            flashcard.answer = answer

        await self.session.commit()
        await self.session.refresh(flashcard)
        return flashcard

    async def delete(self, flashcard_id: UUID) -> bool:
        """
        Удалить flashcard.

        Args:
            flashcard_id: ID карточки

        Returns:
            bool: True если удалена
        """
        flashcard = await self.get_by_id(flashcard_id)
        if not flashcard:
            return False

        await self.session.delete(flashcard)
        await self.session.commit()
        return True

    async def delete_all_by_material(self, material_id: UUID) -> int:
        """
        Удалить все flashcards материала.

        Args:
            material_id: ID материала

        Returns:
            int: Количество удаленных карточек
        """
        result = await self.session.execute(
            delete(Flashcard).where(Flashcard.material_id == material_id)
        )
        await self.session.commit()
        return result.rowcount

    async def count_by_material(self, material_id: UUID) -> int:
        """
        Подсчитать количество flashcards для материала.

        Args:
            material_id: ID материала

        Returns:
            int: Количество карточек
        """
        result = await self.session.execute(
            select(Flashcard).where(Flashcard.material_id == material_id)
        )
        return len(result.scalars().all())

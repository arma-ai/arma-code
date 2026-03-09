"""
Repository для работы с QuizAttempt
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.quiz_attempt import QuizAttempt


class QuizAttemptRepository:
    """Repository для операций с quiz attempts."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        user_id: UUID,
        material_id: UUID,
        score: int,
        total_questions: int,
        percentage: int,
        answers: list[dict],
    ) -> QuizAttempt:
        """
        Создать новую попытку прохождения quiz.

        Args:
            user_id: ID пользователя
            material_id: ID материала
            score: Количество правильных ответов
            total_questions: Общее количество вопросов
            percentage: Процент правильных ответов
            answers: Список ответов (JSON)

        Returns:
            QuizAttempt: Созданная попытка
        """
        attempt = QuizAttempt(
            user_id=user_id,
            material_id=material_id,
            score=score,
            total_questions=total_questions,
            percentage=percentage,
            answers=answers,
        )
        self.session.add(attempt)
        await self.session.commit()
        await self.session.refresh(attempt)
        return attempt

    async def get_by_id(self, attempt_id: UUID) -> Optional[QuizAttempt]:
        """
        Получить попытку по ID.

        Args:
            attempt_id: ID попытки

        Returns:
            QuizAttempt или None
        """
        result = await self.session.execute(
            select(QuizAttempt).where(QuizAttempt.id == attempt_id)
        )
        return result.scalar_one_or_none()

    async def get_user_attempts(
        self,
        user_id: UUID,
        material_id: Optional[UUID] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[QuizAttempt]:
        """
        Получить попытки пользователя.

        Args:
            user_id: ID пользователя
            material_id: ID материала (опционально, для фильтрации)
            limit: Максимум записей
            offset: Смещение для пагинации

        Returns:
            Список попыток
        """
        query = select(QuizAttempt).where(QuizAttempt.user_id == user_id)

        if material_id:
            query = query.where(QuizAttempt.material_id == material_id)

        query = query.order_by(desc(QuizAttempt.completed_at)).limit(limit).offset(offset)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_material_attempts(
        self,
        material_id: UUID,
        user_id: Optional[UUID] = None,
        limit: int = 100,
    ) -> List[QuizAttempt]:
        """
        Получить все попытки для материала.

        Args:
            material_id: ID материала
            user_id: ID пользователя (опционально)
            limit: Максимум записей

        Returns:
            Список попыток
        """
        query = select(QuizAttempt).where(QuizAttempt.material_id == material_id)

        if user_id:
            query = query.where(QuizAttempt.user_id == user_id)

        query = query.order_by(desc(QuizAttempt.completed_at)).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_best_attempt(
        self, user_id: UUID, material_id: UUID
    ) -> Optional[QuizAttempt]:
        """
        Получить лучшую попытку пользователя для материала.

        Args:
            user_id: ID пользователя
            material_id: ID материала

        Returns:
            Лучшая попытка или None
        """
        result = await self.session.execute(
            select(QuizAttempt)
            .where(
                QuizAttempt.user_id == user_id,
                QuizAttempt.material_id == material_id,
            )
            .order_by(desc(QuizAttempt.percentage), desc(QuizAttempt.completed_at))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_statistics(
        self, user_id: UUID, material_id: UUID
    ) -> dict:
        """
        Получить статистику попыток пользователя для материала.

        Args:
            user_id: ID пользователя
            material_id: ID материала

        Returns:
            Словарь со статистикой:
            - total_attempts: Общее количество попыток
            - best_score: Лучший результат (количество)
            - best_percentage: Лучший процент
            - average_score: Средний результат
            - average_percentage: Средний процент
        """
        # Запрос статистики
        result = await self.session.execute(
            select(
                func.count(QuizAttempt.id).label("total_attempts"),
                func.max(QuizAttempt.score).label("best_score"),
                func.max(QuizAttempt.percentage).label("best_percentage"),
                func.avg(QuizAttempt.score).label("average_score"),
                func.avg(QuizAttempt.percentage).label("average_percentage"),
            ).where(
                QuizAttempt.user_id == user_id,
                QuizAttempt.material_id == material_id,
            )
        )
        row = result.one_or_none()

        if not row or row.total_attempts == 0:
            return {
                "total_attempts": 0,
                "best_score": 0,
                "best_percentage": 0,
                "average_score": 0.0,
                "average_percentage": 0.0,
            }

        return {
            "total_attempts": row.total_attempts,
            "best_score": row.best_score or 0,
            "best_percentage": row.best_percentage or 0,
            "average_score": float(row.average_score or 0),
            "average_percentage": float(row.average_percentage or 0),
        }

    async def delete(self, attempt_id: UUID) -> bool:
        """
        Удалить попытку.

        Args:
            attempt_id: ID попытки

        Returns:
            True если удалено, False если не найдено
        """
        attempt = await self.get_by_id(attempt_id)
        if not attempt:
            return False

        await self.session.delete(attempt)
        await self.session.commit()
        return True

    async def delete_material_attempts(self, material_id: UUID) -> int:
        """
        Удалить все попытки для материала.

        Args:
            material_id: ID материала

        Returns:
            Количество удаленных записей
        """
        result = await self.session.execute(
            select(QuizAttempt).where(QuizAttempt.material_id == material_id)
        )
        attempts = result.scalars().all()

        count = len(attempts)
        for attempt in attempts:
            await self.session.delete(attempt)

        await self.session.commit()
        return count

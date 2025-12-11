"""
Service для RAG-based чата с AI тьютором
"""
import logging
from typing import List, Dict, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.infrastructure.database.models.material import Material, TutorMessage
from app.infrastructure.database.models.embedding import MaterialEmbedding
from app.infrastructure.ai.openai_service import OpenAIService
from app.core.config import settings

logger = logging.getLogger(__name__)


class TutorService:
    """
    Сервис для RAG-based AI тьютора.

    Использует vector similarity search для поиска релевантных кусков текста
    и генерации контекстных ответов.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.ai_service = OpenAIService()

    async def send_message(
        self,
        material_id: UUID,
        user_message: str,
        context: str = "chat",
        max_history: int = 10,
    ) -> str:
        """
        Отправить сообщение тьютору и получить ответ.

        Args:
            material_id: ID материала
            user_message: Сообщение пользователя
            context: Контекст ('chat' или 'selection')
            max_history: Максимум сообщений истории для контекста

        Returns:
            str: Ответ AI тьютора
        """
        # 1. Получить релевантный контекст из embeddings
        relevant_context = await self._find_relevant_context(material_id, user_message)

        # 2. Получить историю диалога
        conversation_history = await self._get_conversation_history(
            material_id, max_history
        )

        # 3. Сгенерировать ответ с помощью OpenAI
        ai_response = await self.ai_service.chat_with_context(
            question=user_message,
            context=relevant_context,
            conversation_history=conversation_history,
        )

        # 4. Сохранить сообщения в БД
        await self._save_messages(material_id, user_message, ai_response, context)

        return ai_response

    async def _find_relevant_context(
        self, material_id: UUID, query: str, top_k: int = 5
    ) -> str:
        """
        Найти релевантные куски текста используя vector similarity search.

        Args:
            material_id: ID материала
            query: Запрос пользователя
            top_k: Количество топ результатов

        Returns:
            str: Объединенный контекст из найденных кусков
        """
        try:
            # 1. Создать embedding для запроса
            query_embedding = await self.ai_service.create_embedding(query)

            # 2. Выполнить vector similarity search
            # Используем pgvector cosine similarity (оператор <=>)
            search_query = text("""
                SELECT chunk_text, chunk_index,
                       (embedding <=> :query_embedding::vector) AS distance
                FROM material_embeddings
                WHERE material_id = :material_id
                ORDER BY distance ASC
                LIMIT :top_k
            """)

            result = await self.session.execute(
                search_query,
                {
                    "query_embedding": query_embedding,
                    "material_id": str(material_id),
                    "top_k": top_k,
                },
            )
            rows = result.fetchall()

            if not rows:
                logger.warning(
                    f"[TutorService] No embeddings found for material {material_id}"
                )
                return await self._fallback_context(material_id)

            # 3. Объединить найденные куски в контекст
            context_chunks = [row[0] for row in rows]
            combined_context = "\n\n".join(context_chunks)

            logger.info(
                f"[TutorService] Found {len(context_chunks)} relevant chunks "
                f"(distances: {[f'{row[2]:.4f}' for row in rows]})"
            )

            return combined_context

        except Exception as e:
            logger.error(f"[TutorService] Error in vector search: {str(e)}")
            # Fallback: использовать первые N символов материала
            return await self._fallback_context(material_id)

    async def _fallback_context(self, material_id: UUID, max_chars: int = 5000) -> str:
        """
        Fallback контекст если vector search не работает.

        Args:
            material_id: ID материала
            max_chars: Максимум символов

        Returns:
            str: Первые N символов полного текста
        """
        result = await self.session.execute(
            select(Material.full_text).where(Material.id == material_id)
        )
        full_text = result.scalar_one_or_none()

        if not full_text:
            return "No content available for this material."

        return full_text[:max_chars]

    async def _get_conversation_history(
        self, material_id: UUID, max_messages: int = 10
    ) -> List[Dict[str, str]]:
        """
        Получить историю диалога для контекста.

        Args:
            material_id: ID материала
            max_messages: Максимум сообщений

        Returns:
            List[Dict]: История в формате [{"role": "user", "content": "..."}]
        """
        result = await self.session.execute(
            select(TutorMessage)
            .where(TutorMessage.material_id == material_id)
            .order_by(TutorMessage.created_at.desc())
            .limit(max_messages * 2)  # user + assistant pairs
        )
        messages = result.scalars().all()

        # Конвертировать в формат OpenAI (от старых к новым)
        history = []
        for msg in reversed(messages):
            history.append({"role": msg.role, "content": msg.content})

        return history

    async def _save_messages(
        self, material_id: UUID, user_message: str, ai_response: str, context: str
    ):
        """
        Сохранить user message и AI response в БД.

        Args:
            material_id: ID материала
            user_message: Сообщение пользователя
            ai_response: Ответ AI
            context: Контекст ('chat' или 'selection')
        """
        # User message
        user_msg = TutorMessage(
            material_id=material_id, role="user", content=user_message, context=context
        )
        self.session.add(user_msg)

        # AI response
        ai_msg = TutorMessage(
            material_id=material_id,
            role="assistant",
            content=ai_response,
            context=context,
        )
        self.session.add(ai_msg)

        await self.session.commit()
        logger.info(
            f"[TutorService] Saved conversation pair for material {material_id}"
        )

    async def get_chat_history(
        self, material_id: UUID, limit: int = 50
    ) -> List[TutorMessage]:
        """
        Получить всю историю чата для материала.

        Args:
            material_id: ID материала
            limit: Максимум сообщений

        Returns:
            List[TutorMessage]: История сообщений (от старых к новым)
        """
        result = await self.session.execute(
            select(TutorMessage)
            .where(TutorMessage.material_id == material_id)
            .order_by(TutorMessage.created_at.asc())
            .limit(limit)
        )
        messages = result.scalars().all()
        return list(messages)

    async def clear_chat_history(self, material_id: UUID) -> int:
        """
        Очистить историю чата для материала.

        Args:
            material_id: ID материала

        Returns:
            int: Количество удаленных сообщений
        """
        result = await self.session.execute(
            select(TutorMessage).where(TutorMessage.material_id == material_id)
        )
        messages = result.scalars().all()
        count = len(messages)

        for msg in messages:
            await self.session.delete(msg)

        await self.session.commit()
        logger.info(f"[TutorService] Cleared {count} messages for material {material_id}")
        return count

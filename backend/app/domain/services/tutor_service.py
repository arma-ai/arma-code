"""
Service для RAG-based чата с AI тьютором + Semantic Caching
"""
import hashlib
import json
import logging
import math
from typing import List, Dict, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.infrastructure.database.models.material import Material, TutorMessage
from app.infrastructure.database.models.embedding import MaterialEmbedding
from app.infrastructure.ai.openai_service import OpenAIService

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
_DISTANCE_THRESHOLD = 0.70   # ignore chunks farther than this
_SEMANTIC_CACHE_TTL = 3600   # seconds
_SEMANTIC_CACHE_PREFIX = "semantic_cache:"
_SEMANTIC_SIM_THRESHOLD = 0.12   # cosine distance — cache hit if below this


def _cosine_distance(a: List[float], b: List[float]) -> float:
    """Fast manual cosine distance (1 - similarity) between two unit vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 1.0
    return 1.0 - dot / (norm_a * norm_b)


class TutorService:
    """
    Сервис для RAG-based AI тьютора с семантическим кэшированием.

    Flow for send_message:
      1. Embed the user question.
      2. Check Redis semantic cache (embedding similarity < threshold → cache hit).
      3. If miss: run pgvector similarity search for relevant chunks.
      4. Filter chunks by distance threshold.
      5. Call OpenAI with context + history.
      6. Cache the (question_embedding, answer) pair.
      7. Save messages to DB.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.ai_service = OpenAIService()

    # ── Public API ────────────────────────────────────────────────────────────

    async def send_message(
        self,
        material_id: UUID,
        user_message: str,
        context: str = "chat",
        max_history: int = 10,
    ) -> str:
        """
        Send a message to the AI tutor and return its response.

        Args:
            material_id: ID материала
            user_message: Сообщение пользователя
            context: 'chat' or 'selection'
            max_history: Max history messages used for context

        Returns:
            str: AI tutor response text
        """
        # 1. Embed query
        query_embedding = await self.ai_service.create_embedding(user_message)

        # 2. Semantic cache lookup
        cached = await self._check_semantic_cache(material_id, user_message, query_embedding)
        if cached is not None:
            logger.info(
                "Semantic cache hit",
                extra={"material_id": str(material_id)}
            )
            await self._save_messages(material_id, user_message, cached, context)
            return cached

        # 3. RAG: find relevant chunks
        relevant_context = await self._find_relevant_context(
            material_id, query_embedding
        )

        # 4. Conversation history
        conversation_history = await self._get_conversation_history(
            material_id, max_history
        )

        # 5. Generate OpenAI response
        ai_response = await self.ai_service.chat_with_context(
            question=user_message,
            context=relevant_context,
            conversation_history=conversation_history,
        )

        # 6. Cache result
        await self._store_semantic_cache(material_id, query_embedding, ai_response)

        # 7. Save to DB
        await self._save_messages(material_id, user_message, ai_response, context)

        return ai_response

    # ── Semantic Cache ────────────────────────────────────────────────────────

    async def _check_semantic_cache(
        self,
        material_id: UUID,
        question: str,
        query_embedding: List[float],
    ) -> Optional[str]:
        """
        Look up the Redis semantic cache for a similar prior question.

        Retrieves all cached (embedding, answer) pairs for this material and
        returns the cached answer if cosine_distance(query, cached) < threshold.
        """
        redis = await self._get_redis()
        if redis is None:
            return None

        pattern = f"{_SEMANTIC_CACHE_PREFIX}{material_id}:*"
        try:
            keys = await redis.keys(pattern)
        except Exception:
            return None

        for key in keys:
            try:
                raw = await redis.get(key)
                if raw is None:
                    continue
                entry = json.loads(raw)
                cached_embedding: List[float] = entry["embedding"]
                cached_answer: str = entry["answer"]
                dist = _cosine_distance(query_embedding, cached_embedding)
                if dist < _SEMANTIC_SIM_THRESHOLD:
                    logger.info(
                        "Semantic cache match",
                        extra={"distance": round(dist, 4), "material_id": str(material_id)}
                    )
                    return cached_answer
            except Exception:
                continue

        return None

    async def _store_semantic_cache(
        self,
        material_id: UUID,
        query_embedding: List[float],
        answer: str,
    ) -> None:
        """Persist a (embedding, answer) entry in Redis."""
        redis = await self._get_redis()
        if redis is None:
            return

        # Use a short hash of the embedding as key suffix for uniqueness
        emb_hash = hashlib.md5(json.dumps(query_embedding[:16]).encode()).hexdigest()[:12]
        key = f"{_SEMANTIC_CACHE_PREFIX}{material_id}:{emb_hash}"
        payload = json.dumps({"embedding": query_embedding, "answer": answer})
        try:
            await redis.setex(key, _SEMANTIC_CACHE_TTL, payload)
        except Exception as e:
            logger.warning("Failed to store semantic cache", extra={"error": str(e)})

    async def _get_redis(self):
        """Get shared Redis client (reuses the one from security module)."""
        try:
            from app.core.security import get_redis
            return await get_redis()
        except Exception:
            return None

    # ── RAG context retrieval ────────────────────────────────────────────────

    async def _find_relevant_context(
        self,
        material_id: UUID,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> str:
        """
        Vector similarity search for relevant chunks.

        Applies a distance threshold (_DISTANCE_THRESHOLD) to filter out
        chunks that are not actually relevant to the query.

        Returns:
            str: Concatenated relevant chunk texts
        """
        try:
            embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

            search_query = text("""
                SELECT chunk_text, chunk_index,
                       (embedding <=> :query_embedding) AS distance
                FROM material_embeddings
                WHERE material_id = :material_id
                ORDER BY distance ASC
                LIMIT :top_k
            """)

            result = await self.session.execute(
                search_query,
                {
                    "query_embedding": embedding_str,
                    "material_id": str(material_id),
                    "top_k": top_k,
                },
            )
            rows = result.fetchall()

            if not rows:
                logger.warning(
                    "No embeddings found — using fallback context",
                    extra={"material_id": str(material_id)}
                )
                return await self._fallback_context(material_id)

            # Apply distance threshold
            relevant = [(row[0], row[2]) for row in rows if row[2] < _DISTANCE_THRESHOLD]

            if not relevant:
                logger.warning(
                    "All chunks exceed distance threshold — using fallback",
                    extra={
                        "material_id": str(material_id),
                        "min_distance": round(rows[0][2], 4),
                        "threshold": _DISTANCE_THRESHOLD,
                    }
                )
                return await self._fallback_context(material_id)

            context_chunks = [text for text, _ in relevant]
            combined = "\n\n".join(context_chunks)

            logger.info(
                "RAG context retrieved",
                extra={
                    "material_id": str(material_id),
                    "chunks_used": len(relevant),
                    "distances": [round(d, 4) for _, d in relevant],
                }
            )
            return combined

        except Exception as e:
            logger.error(
                "Vector search failed — using fallback context",
                extra={"material_id": str(material_id), "error": str(e)}
            )
            # Rollback the failed transaction before trying fallback
            try:
                await self.session.rollback()
            except Exception:
                pass  # Ignore rollback errors
            return await self._fallback_context(material_id)

    async def _fallback_context(self, material_id: UUID, max_chars: int = 5000) -> str:
        """Return the first max_chars of the material's full text as fallback context."""
        result = await self.session.execute(
            select(Material.full_text).where(Material.id == material_id)
        )
        full_text = result.scalar_one_or_none()
        if not full_text:
            return "No content available for this material."
        return full_text[:max_chars]

    # ── Conversation history ─────────────────────────────────────────────────

    async def _get_conversation_history(
        self, material_id: UUID, max_messages: int = 10
    ) -> List[Dict[str, str]]:
        """Retrieve and format conversation history for OpenAI."""
        result = await self.session.execute(
            select(TutorMessage)
            .where(TutorMessage.material_id == material_id)
            .order_by(TutorMessage.created_at.desc())
            .limit(max_messages * 2)
        )
        messages = result.scalars().all()
        return [{"role": msg.role, "content": msg.content} for msg in reversed(messages)]

    async def _save_messages(
        self, material_id: UUID, user_message: str, ai_response: str, context: str
    ):
        """Save user message and AI response to DB."""
        self.session.add(TutorMessage(
            material_id=material_id, role="user", content=user_message, context=context
        ))
        self.session.add(TutorMessage(
            material_id=material_id, role="assistant", content=ai_response, context=context
        ))
        await self.session.commit()
        logger.info(
            "Saved conversation pair",
            extra={"material_id": str(material_id)}
        )

    # ── Chat management ──────────────────────────────────────────────────────

    async def get_chat_history(self, material_id: UUID, limit: int = 50) -> List[TutorMessage]:
        result = await self.session.execute(
            select(TutorMessage)
            .where(TutorMessage.material_id == material_id)
            .order_by(TutorMessage.created_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def clear_chat_history(self, material_id: UUID) -> int:
        result = await self.session.execute(
            select(TutorMessage).where(TutorMessage.material_id == material_id)
        )
        messages = result.scalars().all()
        count = len(messages)
        for msg in messages:
            await self.session.delete(msg)
        await self.session.commit()
        logger.info(
            "Cleared chat history",
            extra={"material_id": str(material_id), "count": count}
        )
        return count

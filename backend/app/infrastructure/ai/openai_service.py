"""
OpenAI integration service with retry logic and Redis caching.
"""
import hashlib
import json
import logging
from typing import List, Dict, Optional

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import APIError, APITimeoutError, RateLimitError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# Optional Redis connection for caching
_redis_client = None


async def get_redis():
    """Lazy init Redis client for caching."""
    global _redis_client
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2
            )
            await _redis_client.ping()
            logger.info("[OpenAI] Redis cache connected")
        except Exception as e:
            logger.warning(f"[OpenAI] Redis cache not available: {e}. Running without cache.")
            _redis_client = False  # Mark as unavailable
    return _redis_client if _redis_client is not False else None


def _cache_key(prefix: str, text: str, **kwargs) -> str:
    """Generate a deterministic cache key from text content."""
    content = text + json.dumps(kwargs, sort_keys=True)
    text_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
    return f"ai_cache:{prefix}:{text_hash}"


# Retry decorator for OpenAI calls
_openai_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type((APIError, APITimeoutError, RateLimitError)),
    before_sleep=lambda retry_state: logger.warning(
        f"[OpenAI] Retrying after error (attempt {retry_state.attempt_number}): "
        f"{retry_state.outcome.exception()}"
    ),
)


class OpenAIService:
    """Service для работы с OpenAI API с retry и кэшированием."""

    def __init__(self):
        self.client = client

    @_openai_retry
    async def _call_chat(self, **kwargs):
        """Wrapper around chat completions with retry."""
        return await self.client.chat.completions.create(**kwargs)

    @_openai_retry
    async def _call_embeddings(self, **kwargs):
        """Wrapper around embeddings with retry."""
        return await self.client.embeddings.create(**kwargs)

    async def _get_cached(self, key: str) -> Optional[str]:
        """Get value from Redis cache."""
        redis = await get_redis()
        if redis:
            try:
                return await redis.get(key)
            except Exception:
                pass
        return None

    async def _set_cached(self, key: str, value: str, ttl: int = 86400):
        """Set value in Redis cache (default 24h TTL)."""
        redis = await get_redis()
        if redis:
            try:
                await redis.setex(key, ttl, value)
            except Exception:
                pass

    async def generate_summary(self, text: str, language: str = "auto") -> str:
        """
        Генерация краткого резюме материала с кэшированием и retry.

        Args:
            text: Исходный текст
            language: Язык (auto - автоопределение)

        Returns:
            str: Резюме
        """
        cache_key = _cache_key("summary", text, language=language)
        cached = await self._get_cached(cache_key)
        if cached:
            logger.info("[OpenAI] Summary served from cache")
            return cached

        try:
            text_chunk = text[:50000]

            response = await self._call_chat(
                model=settings.LLM_MODEL_MINI,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert educator who creates clear, insightful summaries. "
                            "Create a summary in the SAME LANGUAGE as the source text. "
                            "Structure it with an overview paragraph, then key points as bullet points, "
                            "and end with a conclusion. Highlight the most important concepts."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Create a concise but thorough summary (3-5 paragraphs) of the following text:\n\n{text_chunk}",
                    },
                ],
                temperature=0.7,
                max_tokens=1500,
            )

            summary = response.choices[0].message.content.strip()
            logger.info(f"[OpenAI] Generated summary ({len(summary)} chars)")

            await self._set_cached(cache_key, summary)
            return summary

        except Exception as e:
            logger.error(f"[OpenAI] Error generating summary: {str(e)}")
            raise

    async def generate_notes(self, text: str) -> str:
        """
        Генерация структурированных конспектов с кэшированием и retry.

        Args:
            text: Исходный текст

        Returns:
            str: Конспекты в markdown формате
        """
        cache_key = _cache_key("notes", text)
        cached = await self._get_cached(cache_key)
        if cached:
            logger.info("[OpenAI] Notes served from cache")
            return cached

        try:
            text_chunk = text[:50000]

            response = await self._call_chat(
                model=settings.LLM_MODEL_MINI,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert at creating structured study notes that help students learn effectively. "
                            "Create notes in the SAME LANGUAGE as the source text. "
                            "Use rich markdown format: ## for main topics, ### for subtopics, "
                            "- bullet points for facts, **bold** for key terms, "
                            "> blockquotes for important definitions. "
                            "Add 💡 emoji before key insights and ⚠️ before common mistakes. "
                            "Organize information hierarchically from general to specific."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Create detailed study notes from the following text:\n\n{text_chunk}",
                    },
                ],
                temperature=0.7,
                max_tokens=2000,
            )

            notes = response.choices[0].message.content.strip()
            logger.info(f"[OpenAI] Generated notes ({len(notes)} chars)")

            await self._set_cached(cache_key, notes)
            return notes

        except Exception as e:
            logger.error(f"[OpenAI] Error generating notes: {str(e)}")
            raise

    async def generate_flashcards(self, text: str, count: int = 10) -> List[Dict[str, str]]:
        """
        Генерация flashcards (вопрос-ответ) с кэшированием и retry.

        Args:
            text: Исходный текст
            count: Количество карточек

        Returns:
            List[Dict]: Список карточек [{"question": "...", "answer": "..."}]
        """
        cache_key = _cache_key("flashcards", text, count=count)
        cached = await self._get_cached(cache_key)
        if cached:
            logger.info("[OpenAI] Flashcards served from cache")
            return json.loads(cached)

        try:
            text_chunk = text[:50000]

            response = await self._call_chat(
                model=settings.LLM_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert at creating educational flashcards that test deep understanding. "
                            "Generate flashcards in JSON format with 'flashcards' array. "
                            "Each flashcard must have 'question' and 'answer' fields. "
                            f"Create exactly {count} flashcards. "
                            "Mix question types: definitions, comparisons, applications, and why-questions. "
                            "The questions and answers MUST be in the SAME LANGUAGE as the source text. "
                            "Return only valid JSON, no additional text."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Create {count} flashcards based on this text:\n\n{text_chunk}",
                    },
                ],
                temperature=0.7,
                max_tokens=2000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            data = json.loads(content)
            flashcards = data.get("flashcards", [])

            # Validate
            validated = []
            for card in flashcards:
                if "question" in card and "answer" in card:
                    validated.append({
                        "question": card["question"],
                        "answer": card["answer"]
                    })

            logger.info(f"[OpenAI] Generated {len(validated)} flashcards")

            await self._set_cached(cache_key, json.dumps(validated, ensure_ascii=False))
            return validated

        except Exception as e:
            logger.error(f"[OpenAI] Error generating flashcards: {str(e)}")
            raise

    async def generate_quiz(self, text: str, count: int = 10) -> List[Dict]:
        """
        Генерация quiz вопросов (multiple choice) с кэшированием и retry.

        Args:
            text: Исходный текст
            count: Количество вопросов

        Returns:
            List[Dict]: Вопросы с вариантами ответа
        """
        cache_key = _cache_key("quiz", text, count=count)
        cached = await self._get_cached(cache_key)
        if cached:
            logger.info("[OpenAI] Quiz served from cache")
            return json.loads(cached)

        try:
            text_chunk = text[:50000]

            response = await self._call_chat(
                model=settings.LLM_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert at creating educational quiz questions that test understanding. "
                            "Generate questions in JSON format with 'questions' array. "
                            "Each question must have: question (text), option_a, option_b, option_c, option_d (all text), "
                            "and correct_option (the FULL TEXT of the correct answer, copied exactly from one of the options). "
                            f"Create exactly {count} questions. "
                            "Mix difficulty levels: 30% easy, 50% medium, 20% hard. "
                            "The questions and answers MUST be in the SAME LANGUAGE as the source text. "
                            "Return only valid JSON, no additional text."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Create {count} multiple-choice quiz questions based on this text:\n\n{text_chunk}",
                    },
                ],
                temperature=0.7,
                max_tokens=3000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            data = json.loads(content)
            questions = data.get("questions", [])

            # Validate
            validated = []
            for q in questions:
                if all(k in q for k in ["question", "option_a", "option_b", "option_c", "option_d", "correct_option"]):
                    correct = q["correct_option"]
                    options = [q["option_a"], q["option_b"], q["option_c"], q["option_d"]]
                    if correct in ["a", "b", "c", "d"]:
                        option_map = {"a": q["option_a"], "b": q["option_b"], "c": q["option_c"], "d": q["option_d"]}
                        q["correct_option"] = option_map[correct]
                    if q["correct_option"] in options:
                        validated.append(q)

            logger.info(f"[OpenAI] Generated {len(validated)} quiz questions")

            await self._set_cached(cache_key, json.dumps(validated, ensure_ascii=False))
            return validated

        except Exception as e:
            logger.error(f"[OpenAI] Error generating quiz: {str(e)}")
            raise

    async def create_embedding(self, text: str) -> List[float]:
        """
        Создание векторного embedding для текста с retry.

        Args:
            text: Текст для embedding

        Returns:
            List[float]: Вектор (3072 dimensions)
        """
        try:
            response = await self._call_embeddings(
                model=settings.EMBEDDING_MODEL,
                input=text,
                encoding_format="float",
            )

            embedding = response.data[0].embedding
            logger.debug(f"[OpenAI] Created embedding (dim={len(embedding)})")
            return embedding

        except Exception as e:
            logger.error(f"[OpenAI] Error creating embedding: {str(e)}")
            raise

    async def create_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Создание embeddings для нескольких текстов (batch) с retry.

        Args:
            texts: Список текстов

        Returns:
            List[List[float]]: Список векторов
        """
        try:
            response = await self._call_embeddings(
                model=settings.EMBEDDING_MODEL,
                input=texts,
                encoding_format="float",
            )

            embeddings = [item.embedding for item in response.data]
            logger.info(f"[OpenAI] Created {len(embeddings)} embeddings in batch")
            return embeddings

        except Exception as e:
            logger.error(f"[OpenAI] Error creating batch embeddings: {str(e)}")
            raise

    async def chat_with_context(
        self,
        question: str,
        context: str,
        conversation_history: Optional[List[Dict]] = None,
    ) -> str:
        """
        Улучшенный RAG chat с контекстом из материала.

        Args:
            question: Вопрос пользователя
            context: Релевантный контекст из документа
            conversation_history: История диалога

        Returns:
            str: Ответ AI тьютора
        """
        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are ARMA — an intelligent, friendly AI tutor. Your role is to help students "
                        "deeply understand educational materials, not just give answers.\n\n"
                        "RULES:\n"
                        "1. Answer based ONLY on the provided document context.\n"
                        "2. If the context doesn't have the answer, say so honestly.\n"
                        "3. Respond in the SAME LANGUAGE as the student's question.\n"
                        "4. Explain complex concepts step-by-step with examples.\n"
                        "5. Use markdown formatting: **bold** for key terms, bullet points for lists.\n"
                        "6. After your answer, suggest 1-2 follow-up questions the student might want to explore.\n"
                        "7. If the student seems confused, offer a simpler analogy.\n"
                        "8. Be encouraging and supportive — learning is a journey! 🎓"
                    ),
                }
            ]

            # Add conversation history (last 10 for context window efficiency)
            if conversation_history:
                messages.extend(conversation_history[-10:])

            # Add current question with context
            messages.append({
                "role": "user",
                "content": (
                    f"📖 **Context from the document:**\n{context}\n\n"
                    f"❓ **Student's question:** {question}"
                )
            })

            response = await self._call_chat(
                model=settings.LLM_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
            )

            answer = response.choices[0].message.content.strip()
            logger.info(f"[OpenAI] Generated RAG answer ({len(answer)} chars)")
            return answer

        except Exception as e:
            logger.error(f"[OpenAI] Error in RAG chat: {str(e)}")
            raise

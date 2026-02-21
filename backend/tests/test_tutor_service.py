"""
Tests for TutorService: RAG context retrieval, semantic caching, and fallback.
"""
import json
import math
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


def _cosine_distance(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 1.0
    return 1.0 - dot / (norm_a * norm_b)


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.execute = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    return session


@pytest.fixture
def mock_ai_service():
    ai = AsyncMock()
    ai.create_embedding = AsyncMock(return_value=[0.1] * 3072)
    ai.chat_with_context = AsyncMock(return_value="AI answer to the question")
    return ai


class TestCosineDistance:
    """Unit tests for the cosine distance helper."""

    def test_identical_vectors_have_zero_distance(self):
        vec = [0.5, 0.3, 0.8]
        assert _cosine_distance(vec, vec) == pytest.approx(0.0, abs=1e-6)

    def test_orthogonal_vectors_have_max_distance(self):
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        assert _cosine_distance(a, b) == pytest.approx(1.0, abs=1e-6)

    def test_similar_vectors_have_low_distance(self):
        a = [1.0, 0.1, 0.05]
        b = [0.99, 0.12, 0.04]
        dist = _cosine_distance(a, b)
        assert dist < 0.01


class TestSemanticCaching:
    """Tests for the semantic cache logic within TutorService."""

    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached_answer(self, mock_session):
        """When a semantically similar question is in cache, return cached answer."""
        query_embedding = [0.9, 0.1, 0.0] + [0.0] * (3072 - 3)
        cached_embedding = [0.89, 0.11, 0.01] + [0.0] * (3072 - 3)
        cached_answer = "This is the cached AI response"
        material_id = uuid4()

        cache_entry = json.dumps({"embedding": cached_embedding, "answer": cached_answer})
        mock_redis = AsyncMock()
        mock_redis.keys = AsyncMock(return_value=[f"semantic_cache:{material_id}:abc123"])
        mock_redis.get = AsyncMock(return_value=cache_entry)

        with patch("app.domain.services.tutor_service.TutorService._get_redis",
                   AsyncMock(return_value=mock_redis)):
            from app.domain.services.tutor_service import TutorService
            service = TutorService(session=mock_session)
            result = await service._check_semantic_cache(
                material_id, "similar question", query_embedding
            )
            # Cosine distance between these embeddings should be very small
            assert result == cached_answer

    @pytest.mark.asyncio
    async def test_cache_miss_with_dissimilar_question(self, mock_session):
        """A very different question should not match any cache entry."""
        query_embedding = [1.0] + [0.0] * (3072 - 1)
        # Very different cached embedding
        cached_embedding = [0.0] * (3072 - 1) + [1.0]
        material_id = uuid4()

        cache_entry = json.dumps({"embedding": cached_embedding, "answer": "irrelevant"})
        mock_redis = AsyncMock()
        mock_redis.keys = AsyncMock(return_value=[f"semantic_cache:{material_id}:xyz"])
        mock_redis.get = AsyncMock(return_value=cache_entry)

        with patch("app.domain.services.tutor_service.TutorService._get_redis",
                   AsyncMock(return_value=mock_redis)):
            from app.domain.services.tutor_service import TutorService
            service = TutorService(session=mock_session)
            result = await service._check_semantic_cache(
                material_id, "completely different question", query_embedding
            )
            assert result is None

    @pytest.mark.asyncio
    async def test_cache_returns_none_when_redis_unavailable(self, mock_session):
        """When Redis is None (unavailable), cache lookup returns None."""
        with patch("app.domain.services.tutor_service.TutorService._get_redis",
                   AsyncMock(return_value=None)):
            from app.domain.services.tutor_service import TutorService
            service = TutorService(session=mock_session)
            result = await service._check_semantic_cache(
                uuid4(), "question", [0.1] * 3072
            )
            assert result is None


class TestRAGContextRetrieval:
    """Tests for _find_relevant_context using mocked DB."""

    @pytest.mark.asyncio
    async def test_relevant_context_assembled_from_chunks(self, mock_session):
        """Chunks within distance threshold are joined as context."""
        material_id = uuid4()
        # Simulate DB rows: (chunk_text, chunk_index, distance)
        rows = [
            ("Python is a programming language.", 0, 0.1),
            ("It was created by Guido van Rossum.", 1, 0.2),
        ]
        mock_result = MagicMock()
        mock_result.fetchall.return_value = rows
        mock_session.execute.return_value = mock_result

        with patch("app.domain.services.tutor_service.TutorService._get_redis",
                   AsyncMock(return_value=None)):
            from app.domain.services.tutor_service import TutorService
            service = TutorService(session=mock_session)
            service.ai_service = AsyncMock()
            service.ai_service.create_embedding = AsyncMock(return_value=[0.1] * 3072)

            context = await service._find_relevant_context(
                material_id, [0.1] * 3072
            )

        assert "Python is a programming language." in context
        assert "It was created by Guido van Rossum." in context

    @pytest.mark.asyncio
    async def test_chunks_exceeding_threshold_filtered_out(self, mock_session, mock_ai_service):
        """Chunks with distance >= _DISTANCE_THRESHOLD use fallback context."""
        from app.domain.services.tutor_service import _DISTANCE_THRESHOLD

        material_id = uuid4()
        # All rows exceed threshold
        rows = [
            ("Irrelevant content.", 0, _DISTANCE_THRESHOLD + 0.1),
            ("Also irrelevant.", 1, _DISTANCE_THRESHOLD + 0.2),
        ]
        mock_result = MagicMock()
        mock_result.fetchall.return_value = rows
        mock_session.execute.return_value = mock_result

        with patch("app.domain.services.tutor_service.TutorService._get_redis",
                   AsyncMock(return_value=None)):
            from app.domain.services.tutor_service import TutorService
            service = TutorService(session=mock_session)
            service.ai_service = mock_ai_service

            # Override fallback to return known value
            service._fallback_context = AsyncMock(return_value="fallback text")

            context = await service._find_relevant_context(material_id, [0.1] * 3072)
            assert context == "fallback text"
            service._fallback_context.assert_called_once_with(material_id)

    @pytest.mark.asyncio
    async def test_fallback_context_used_when_no_embeddings(self, mock_session, mock_ai_service):
        """When DB returns empty, fallback to material full_text."""
        material_id = uuid4()

        mock_result = MagicMock()
        mock_result.fetchall.return_value = []
        # Second call is fallback — returns full_text
        full_text_result = MagicMock()
        full_text_result.scalar_one_or_none.return_value = "Full material text content."
        mock_session.execute.side_effect = [mock_result, full_text_result]

        with patch("app.domain.services.tutor_service.TutorService._get_redis",
                   AsyncMock(return_value=None)):
            from app.domain.services.tutor_service import TutorService
            service = TutorService(session=mock_session)
            service.ai_service = mock_ai_service

            context = await service._find_relevant_context(material_id, [0.1] * 3072)
            assert context == "Full material text content."

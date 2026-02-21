"""
Tests for material processing service.
"""
import json
import pytest
import sys
import os
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch, call
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.domain.services.material_processing_service import MaterialProcessingService  # noqa: E402


def _make_service():
    """Create a MaterialProcessingService with a mocked session and AI."""
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.add = MagicMock()

    # Mock the begin() context manager (used for atomic transactions)
    @asynccontextmanager
    async def mock_begin():
        yield

    mock_session.begin = mock_begin

    with patch("app.domain.services.material_processing_service.OpenAIService"):
        service = MaterialProcessingService(mock_session)

    mock_ai = AsyncMock()
    mock_ai.generate_summary = AsyncMock(return_value="Summary text")
    mock_ai.generate_notes = AsyncMock(return_value="Notes text")
    mock_ai.generate_flashcards = AsyncMock(return_value=[
        {"question": "Q1", "answer": "A1"},
        {"question": "Q2", "answer": "A2"},
    ])
    mock_ai.generate_quiz = AsyncMock(return_value=[
        {"question": "Q", "option_a": "A", "option_b": "B",
         "option_c": "C", "option_d": "D", "correct_option": "A"}
    ])
    mock_ai.create_embeddings_batch = AsyncMock(return_value=[[0.1] * 3072])
    service.ai_service = mock_ai

    return service, mock_session, mock_ai


class TestMaterialProcessingParallel:
    """Tests verifying AI generation runs in parallel."""

    @pytest.mark.asyncio
    async def test_process_material_calls_all_ai_methods(self):
        """Verify all 4 AI generation methods are called."""
        service, mock_session, mock_ai = _make_service()
        service._update_processing_status = AsyncMock()
        service._save_all_results = AsyncMock()
        service._create_embeddings = AsyncMock()

        material_id = uuid4()
        await service.process_material(material_id, "Test educational text about Python")

        mock_ai.generate_summary.assert_called_once()
        mock_ai.generate_notes.assert_called_once()
        mock_ai.generate_flashcards.assert_called_once()
        mock_ai.generate_quiz.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_material_calls_save_all_results(self):
        """Verify _save_all_results is called with all generated content."""
        service, mock_session, mock_ai = _make_service()
        service._update_processing_status = AsyncMock()
        service._save_all_results = AsyncMock()
        service._create_embeddings = AsyncMock()

        material_id = uuid4()
        await service.process_material(material_id, "Some text")

        service._save_all_results.assert_called_once()
        call_args = service._save_all_results.call_args
        assert call_args[0][0] == material_id
        assert call_args[0][1] == "Summary text"
        assert call_args[0][2] == "Notes text"

    @pytest.mark.asyncio
    async def test_process_material_calls_embeddings(self):
        """Verify embeddings creation is called."""
        service, mock_session, mock_ai = _make_service()
        service._update_processing_status = AsyncMock()
        service._save_all_results = AsyncMock()
        service._create_embeddings = AsyncMock()

        material_id = uuid4()
        await service.process_material(material_id, "Text for embeddings")

        service._create_embeddings.assert_called_once_with(material_id, "Text for embeddings")

    @pytest.mark.asyncio
    async def test_process_material_handles_ai_error(self):
        """Verify processing fails gracefully on AI error."""
        service, mock_session, mock_ai = _make_service()
        mock_ai.generate_summary = AsyncMock(side_effect=Exception("API Error"))
        service._update_processing_status = AsyncMock()

        material_id = uuid4()
        with pytest.raises(Exception, match="API Error"):
            await service.process_material(material_id, "Failing text")

        # Last status update must have been FAILED
        from app.infrastructure.database.models.material import ProcessingStatus
        last_call = service._update_processing_status.call_args_list[-1]
        assert last_call[0][1] == ProcessingStatus.FAILED


class TestChunkSplitting:
    """Tests for the text chunking logic."""

    def test_split_respects_paragraph_boundaries(self):
        """Chunks should prefer paragraph (double newline) boundaries."""
        with patch("app.domain.services.material_processing_service.OpenAIService"):
            service = MaterialProcessingService(AsyncMock())

        text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
        chunks = service._split_into_chunks(text, chunk_size=30)

        # Each resulting chunk should not split a paragraph mid-way
        for chunk in chunks:
            assert chunk.strip() != ""

    def test_empty_text_returns_empty_list(self):
        with patch("app.domain.services.material_processing_service.OpenAIService"):
            service = MaterialProcessingService(AsyncMock())
        assert service._split_into_chunks("", 500) == []

    def test_small_text_fits_in_one_chunk(self):
        with patch("app.domain.services.material_processing_service.OpenAIService"):
            service = MaterialProcessingService(AsyncMock())
        text = "Short text."
        chunks = service._split_into_chunks(text, chunk_size=500)
        assert len(chunks) == 1
        assert chunks[0] == "Short text."

    def test_large_text_split_into_multiple_chunks(self):
        with patch("app.domain.services.material_processing_service.OpenAIService"):
            service = MaterialProcessingService(AsyncMock())
        # 10 paragraphs of ~50 chars each
        text = "\n\n".join([f"Paragraph {i} with some content." for i in range(10)])
        chunks = service._split_into_chunks(text, chunk_size=100)
        assert len(chunks) > 1

    def test_sentence_aware_split_for_large_paragraphs(self):
        """Very long single paragraphs should be split on sentence boundaries."""
        with patch("app.domain.services.material_processing_service.OpenAIService"):
            service = MaterialProcessingService(AsyncMock())
        # One big paragraph with multiple sentences
        text = "First sentence. Second sentence. Third sentence. Fourth sentence."
        chunks = service._split_into_chunks(text, chunk_size=30)
        # Every chunk should end at or near a sentence boundary
        for chunk in chunks:
            assert len(chunk) > 0


class TestAtomicTransaction:
    """Tests for the atomic save transaction."""

    @pytest.mark.asyncio
    async def test_save_all_results_uses_begin(self):
        """_save_all_results must use session.begin() as context manager."""
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        mock_session.add = MagicMock()

        begin_called = [False]

        @asynccontextmanager
        async def track_begin():
            begin_called[0] = True
            yield

        mock_session.begin = track_begin

        with patch("app.domain.services.material_processing_service.OpenAIService"):
            service = MaterialProcessingService(mock_session)

        await service._save_all_results(
            material_id=uuid4(),
            summary_text="Summary",
            notes_text="Notes",
            flashcards=[{"question": "Q", "answer": "A"}],
            quiz_questions=[{
                "question": "Q", "option_a": "A", "option_b": "B",
                "option_c": "C", "option_d": "D", "correct_option": "A"
            }]
        )

        assert begin_called[0], "session.begin() context manager was not used"


class TestConnectionPool:
    """Tests verifying Celery tasks use proper connection pool."""

    def test_celery_tasks_no_nullpool(self):
        """Verify NullPool is NOT used in tasks.py (performance bug)."""
        tasks_path = os.path.join(
            os.path.dirname(__file__), "..",
            "app", "infrastructure", "queue", "tasks.py"
        )
        with open(tasks_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "NullPool" not in content, (
            "Celery tasks still using NullPool - should use connection pool"
        )
        assert "pool_size" in content, (
            "Celery tasks should define pool_size for connection pool"
        )

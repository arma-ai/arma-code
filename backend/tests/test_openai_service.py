"""
Tests for the OpenAI service with retry, caching, and response parsing.
"""
import json
import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture
def openai_service():
    """Create OpenAI service with mocked client."""
    with patch("app.infrastructure.ai.openai_service.client") as mock_client, \
         patch("app.infrastructure.ai.openai_service.get_redis") as mock_redis_fn:
        # Setup mock client
        chat_response = MagicMock()
        chat_response.choices = [MagicMock()]
        chat_response.choices[0].message.content = "Test summary response"
        mock_client.chat.completions.create = AsyncMock(return_value=chat_response)

        embed_response = MagicMock()
        embed_item = MagicMock()
        embed_item.embedding = [0.1] * 3072
        embed_response.data = [embed_item]
        mock_client.embeddings.create = AsyncMock(return_value=embed_response)

        # Setup mock Redis (no cache)
        mock_redis_fn.return_value = None

        from app.infrastructure.ai.openai_service import OpenAIService
        service = OpenAIService()
        service.client = mock_client

        yield service, mock_client


class TestGenerateSummary:
    """Tests for summary generation."""

    @pytest.mark.asyncio
    async def test_generate_summary_returns_text(self, openai_service):
        service, mock_client = openai_service
        result = await service.generate_summary("Sample educational text about Python programming")
        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_generate_summary_truncates_long_text(self, openai_service):
        service, mock_client = openai_service
        long_text = "A" * 100000  # 100K characters
        await service.generate_summary(long_text)

        call_args = mock_client.chat.completions.create.call_args
        user_content = call_args[1]["messages"][1]["content"]
        # Text should be truncated to 50K
        assert len(user_content) <= 60000  # 50K text + prompt overhead

    @pytest.mark.asyncio
    async def test_generate_summary_uses_mini_model(self, openai_service):
        service, mock_client = openai_service
        await service.generate_summary("Test text")

        call_args = mock_client.chat.completions.create.call_args
        assert call_args[1]["model"] in ("gpt-4o-mini",)


class TestGenerateNotes:
    """Tests for notes generation."""

    @pytest.mark.asyncio
    async def test_generate_notes_returns_text(self, openai_service):
        service, mock_client = openai_service
        result = await service.generate_notes("Sample text about mathematics")
        assert isinstance(result, str)
        assert len(result) > 0


class TestGenerateFlashcards:
    """Tests for flashcard generation."""

    @pytest.mark.asyncio
    async def test_generate_flashcards_parses_json(self, openai_service):
        service, mock_client = openai_service

        # Mock JSON response
        flashcards_json = json.dumps({
            "flashcards": [
                {"question": "What is Python?", "answer": "A programming language"},
                {"question": "What is a variable?", "answer": "A named storage location"},
            ]
        })
        mock_client.chat.completions.create.return_value.choices[0].message.content = flashcards_json

        result = await service.generate_flashcards("Python tutorial text", count=2)
        assert isinstance(result, list)
        assert len(result) == 2
        assert all("question" in card and "answer" in card for card in result)

    @pytest.mark.asyncio
    async def test_generate_flashcards_skips_invalid(self, openai_service):
        service, mock_client = openai_service

        # JSON with invalid cards (missing fields)
        flashcards_json = json.dumps({
            "flashcards": [
                {"question": "Valid?", "answer": "Yes"},
                {"only_question": "No answer field"},
                {"question": "Also valid?", "answer": "Yes!"},
            ]
        })
        mock_client.chat.completions.create.return_value.choices[0].message.content = flashcards_json

        result = await service.generate_flashcards("Text", count=3)
        assert len(result) == 2  # Invalid card filtered out


class TestGenerateQuiz:
    """Tests for quiz generation."""

    @pytest.mark.asyncio
    async def test_generate_quiz_parses_json(self, openai_service):
        service, mock_client = openai_service

        quiz_json = json.dumps({
            "questions": [
                {
                    "question": "What is 2+2?",
                    "option_a": "3",
                    "option_b": "4",
                    "option_c": "5",
                    "option_d": "6",
                    "correct_option": "4"
                }
            ]
        })
        mock_client.chat.completions.create.return_value.choices[0].message.content = quiz_json

        result = await service.generate_quiz("Math text", count=1)
        assert len(result) == 1
        assert result[0]["correct_option"] == "4"

    @pytest.mark.asyncio
    async def test_generate_quiz_converts_letter_answers(self, openai_service):
        service, mock_client = openai_service

        quiz_json = json.dumps({
            "questions": [
                {
                    "question": "Capital of France?",
                    "option_a": "London",
                    "option_b": "Paris",
                    "option_c": "Berlin",
                    "option_d": "Madrid",
                    "correct_option": "b"  # Letter instead of text
                }
            ]
        })
        mock_client.chat.completions.create.return_value.choices[0].message.content = quiz_json

        result = await service.generate_quiz("Geography", count=1)
        assert len(result) == 1
        assert result[0]["correct_option"] == "Paris"


class TestCreateEmbedding:
    """Tests for embedding creation."""

    @pytest.mark.asyncio
    async def test_create_embedding_returns_vector(self, openai_service):
        service, mock_client = openai_service
        result = await service.create_embedding("Test text for embedding")
        assert isinstance(result, list)
        assert len(result) == 3072

    @pytest.mark.asyncio
    async def test_create_embeddings_batch(self, openai_service):
        service, mock_client = openai_service

        # Mock batch response
        embed_response = MagicMock()
        items = [MagicMock() for _ in range(3)]
        for item in items:
            item.embedding = [0.1] * 3072
        embed_response.data = items
        mock_client.embeddings.create.return_value = embed_response

        result = await service.create_embeddings_batch(["text1", "text2", "text3"])
        assert len(result) == 3
        assert all(len(emb) == 3072 for emb in result)


class TestChatWithContext:
    """Tests for the RAG chat functionality."""

    @pytest.mark.asyncio
    async def test_chat_includes_arma_persona(self, openai_service):
        service, mock_client = openai_service
        await service.chat_with_context(
            question="What is OOP?",
            context="Object-oriented programming is a paradigm..."
        )

        call_args = mock_client.chat.completions.create.call_args
        system_prompt = call_args[1]["messages"][0]["content"]
        assert "ARMA" in system_prompt

    @pytest.mark.asyncio
    async def test_chat_limits_conversation_history(self, openai_service):
        service, mock_client = openai_service

        # 20 messages in history
        history = [
            {"role": "user" if i % 2 == 0 else "assistant", "content": f"Message {i}"}
            for i in range(20)
        ]

        await service.chat_with_context(
            question="Next question?",
            context="Some context",
            conversation_history=history
        )

        call_args = mock_client.chat.completions.create.call_args
        messages = call_args[1]["messages"]
        # system + last 10 history + current question = 12
        assert len(messages) == 12

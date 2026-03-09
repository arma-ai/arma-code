"""
Tests for the AI TTS (Text-to-Speech) service.
"""
import pytest
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestLanguageDetection:
    """Tests for language auto-detection."""

    def test_detect_russian(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        assert service.detect_language("Привет, как дела?") == "ru"

    def test_detect_english(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        assert service.detect_language("Hello, how are you?") == "en"

    def test_detect_mixed_mostly_russian(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        assert service.detect_language("Привет world, как дела сегодня?") == "ru"

    def test_detect_empty_defaults_english(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        assert service.detect_language("") == "en"


class TestVoiceSelection:
    """Tests for voice selection by language/gender."""

    def test_russian_female_voice(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        voice = service.get_voice("ru", "female")
        assert "ru-RU" in voice
        assert "Neural" in voice

    def test_english_male_voice(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        voice = service.get_voice("en", "male")
        assert "en-US" in voice
        assert "Neural" in voice

    def test_unknown_language_defaults_english(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        voice = service.get_voice("fr", "female")
        assert "en-US" in voice


class TestTextCleaning:
    """Tests for markdown cleaning before TTS."""

    def test_removes_bold_markdown(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        assert service._clean_for_tts("**bold text**") == "bold text"

    def test_removes_headings(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        assert service._clean_for_tts("## My Heading").strip() == "My Heading"

    def test_removes_code_blocks(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        result = service._clean_for_tts("Before ```code block``` After")
        assert "code block" not in result
        assert "Before" in result
        assert "After" in result

    def test_removes_links_keeps_text(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        result = service._clean_for_tts("[click here](https://example.com)")
        assert result == "click here"

    def test_empty_text_returns_empty(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        assert service._clean_for_tts("") == ""


class TestTextToSpeech:
    """Tests for the TTS generation."""

    @pytest.mark.asyncio
    async def test_empty_text_returns_none(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        result = await service.text_to_speech("")
        assert result is None

    @pytest.mark.asyncio
    async def test_whitespace_only_returns_none(self):
        from app.infrastructure.ai.ai_tts_service import AITTSService
        service = AITTSService()
        result = await service.text_to_speech("   ")
        assert result is None

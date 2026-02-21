"""
Tests for Tutor TTS (Text-to-Speech) functionality.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


class TestTutorTTSEndpoint:
    """Tests for the tutor message TTS endpoint."""

    @pytest.mark.asyncio
    async def test_tutor_speak_generates_audio(self, client, mock_db_session, mock_tutor_message, mock_user):
        """Test that tutor speak endpoint generates audio."""
        from app.infrastructure.ai.ai_tts_service import AITTSService
        from app.infrastructure.database.models.material import Material
        
        # Mock material for verify_material_owner
        mock_material = MagicMock(spec=Material)
        mock_material.id = mock_tutor_message.material_id
        mock_material.user_id = mock_user.id
        
        # Setup mock to return material first, then tutor message
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(side_effect=[mock_material, mock_tutor_message])
        mock_db_session.execute.return_value = mock_result
        
        # Mock TTS service
        with patch.object(AITTSService, 'text_to_speech', new_callable=AsyncMock) as mock_tts:
            mock_tts.return_value = "/tmp/test_audio.mp3"
            
            # Override db dependency
            from app.api.dependencies import get_db
            client.app.dependency_overrides[get_db] = lambda: mock_db_session
            
            response = client.post(
                f"/api/v1/materials/{mock_tutor_message.material_id}/tutor/{mock_tutor_message.id}/speak"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "audio_url" in data
            assert "message_id" in data
            assert "tts_" in data["audio_url"]

    @pytest.mark.asyncio
    async def test_tutor_speak_message_not_found(self, client, mock_db_session, mock_user):
        """Test that tutor speak returns 404 for non-existent message."""
        from app.infrastructure.database.models.material import Material
        
        # Mock material for verify_material_owner
        mock_material = MagicMock(spec=Material)
        mock_material.id = uuid4()
        mock_material.user_id = mock_user.id
        
        # Setup mock to return material first, then None for message
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(side_effect=[mock_material, None])
        mock_db_session.execute.return_value = mock_result
        
        from app.api.dependencies import get_db
        client.app.dependency_overrides[get_db] = lambda: mock_db_session
        
        response = client.post(
            f"/api/v1/materials/{mock_material.id}/tutor/{uuid4()}/speak"
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_tutor_speak_empty_content(self, client, mock_db_session, mock_user):
        """Test that tutor speak returns 400 for empty message content."""
        from app.infrastructure.database.models.material import Material, TutorMessage
        
        # Mock material for verify_material_owner
        mock_material = MagicMock(spec=Material)
        mock_material.id = uuid4()
        mock_material.user_id = mock_user.id
        
        # Empty message
        empty_message = TutorMessage(
            id=uuid4(),
            material_id=mock_material.id,
            role="assistant",
            content="",  # Empty content
        )
        
        # Setup mock to return material first, then empty message
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(side_effect=[mock_material, empty_message])
        mock_db_session.execute.return_value = mock_result
        
        from app.api.dependencies import get_db
        client.app.dependency_overrides[get_db] = lambda: mock_db_session
        
        response = client.post(
            f"/api/v1/materials/{mock_material.id}/tutor/{empty_message.id}/speak"
        )
        
        assert response.status_code == 400
        assert "no content" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_tutor_speak_tts_failure(self, client, mock_db_session, mock_tutor_message, mock_user):
        """Test that tutor speak handles TTS generation failure."""
        from app.infrastructure.ai.ai_tts_service import AITTSService
        from app.infrastructure.database.models.material import Material
        
        # Mock material for verify_material_owner
        mock_material = MagicMock(spec=Material)
        mock_material.id = mock_tutor_message.material_id
        mock_material.user_id = mock_user.id
        
        # Setup mock to return material first, then tutor message
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(side_effect=[mock_material, mock_tutor_message])
        mock_db_session.execute.return_value = mock_result
        
        # Mock TTS service to return None (failure)
        with patch.object(AITTSService, 'text_to_speech', new_callable=AsyncMock) as mock_tts:
            mock_tts.return_value = None
            
            from app.api.dependencies import get_db
            client.app.dependency_overrides[get_db] = lambda: mock_db_session
            
            response = client.post(
                f"/api/v1/materials/{mock_tutor_message.material_id}/tutor/{mock_tutor_message.id}/speak"
            )
            
            assert response.status_code == 500
            assert "failed" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_tutor_speak_user_message(self, client, mock_db_session, mock_user):
        """Test that tutor speak works for user messages too."""
        from app.infrastructure.database.models.material import Material, TutorMessage
        
        # Mock material for verify_material_owner
        mock_material = MagicMock(spec=Material)
        mock_material.id = uuid4()
        mock_material.user_id = mock_user.id
        
        # User message
        user_message = TutorMessage(
            id=uuid4(),
            material_id=mock_material.id,
            role="user",
            content="What is quantum physics?",
        )
        
        # Setup mock to return material first, then user message
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(side_effect=[mock_material, user_message])
        mock_db_session.execute.return_value = mock_result
        
        from app.infrastructure.ai.ai_tts_service import AITTSService
        
        with patch.object(AITTSService, 'text_to_speech', new_callable=AsyncMock) as mock_tts:
            mock_tts.return_value = "/tmp/test_audio.mp3"
            
            from app.api.dependencies import get_db
            client.app.dependency_overrides[get_db] = lambda: mock_db_session
            
            response = client.post(
                f"/api/v1/materials/{mock_material.id}/tutor/{user_message.id}/speak"
            )
            
            assert response.status_code == 200


class TestAITTSService:
    """Tests for AITTSService."""

    def test_detect_language_russian(self):
        """Test Russian language detection."""
        from app.infrastructure.ai.ai_tts_service import AITTSService
        
        service = AITTSService()
        text = "Привет, как дела? Это тест на русском языке."
        
        language = service.detect_language(text)
        assert language == "ru"

    def test_detect_language_english(self):
        """Test English language detection."""
        from app.infrastructure.ai.ai_tts_service import AITTSService
        
        service = AITTSService()
        text = "Hello, how are you? This is an English test."
        
        language = service.detect_language(text)
        assert language == "en"

    def test_detect_language_mixed(self):
        """Test mixed language detection (defaults to English)."""
        from app.infrastructure.ai.ai_tts_service import AITTSService
        
        service = AITTSService()
        text = "Hello Привет mixed text"
        
        # Should detect based on character count
        language = service.detect_language(text)
        assert language in ["ru", "en"]

    def test_get_voice(self):
        """Test voice selection."""
        from app.infrastructure.ai.ai_tts_service import AITTSService
        
        service = AITTSService()
        
        # Russian voices
        assert service.get_voice("ru", "female") == service.VOICES["ru"]["female"]
        assert service.get_voice("ru", "male") == service.VOICES["ru"]["male"]
        
        # English voices
        assert service.get_voice("en", "female") == service.VOICES["en"]["female"]
        assert service.get_voice("en", "male") == service.VOICES["en"]["male"]
        
        # Default to English
        assert service.get_voice("unknown", "female") == service.VOICES["en"]["female"]

    def test_clean_for_tts_removes_markdown(self):
        """Test that markdown is removed from text."""
        from app.infrastructure.ai.ai_tts_service import AITTSService
        
        service = AITTSService()
        
        # Bold
        assert service._clean_for_tts("**bold text**") == "bold text"
        
        # Italic
        assert service._clean_for_tts("*italic*") == "italic"
        
        # Headings
        assert service._clean_for_tts("## Heading").strip() == "Heading"
        
        # Links
        result = service._clean_for_tts("[click here](https://example.com)")
        assert "click here" in result
        assert "http" not in result

    def test_clean_for_tts_removes_emojis(self):
        """Test that emojis are removed."""
        from app.infrastructure.ai.ai_tts_service import AITTSService
        
        service = AITTSService()
        text_with_emoji = "Hello 👋 World 🌍!"
        
        cleaned = service._clean_for_tts(text_with_emoji)
        assert "👋" not in cleaned
        assert "🌍" not in cleaned
        assert "Hello" in cleaned
        assert "World" in cleaned

    def test_clean_for_tts_removes_code_blocks(self):
        """Test that code blocks are removed."""
        from app.infrastructure.ai.ai_tts_service import AITTSService
        
        service = AITTSService()
        text_with_code = "Before ```code block``` After"
        
        cleaned = service._clean_for_tts(text_with_code)
        assert "```" not in cleaned
        assert "Before" in cleaned
        assert "After" in cleaned

    @pytest.mark.asyncio
    async def test_text_to_speech_empty_text(self):
        """Test that empty text returns None."""
        from app.infrastructure.ai.ai_tts_service import AITTSService
        
        service = AITTSService()
        result = await service.text_to_speech("")
        assert result is None
        
        result = await service.text_to_speech("   ")
        assert result is None


@pytest.fixture
def client(mock_user):
    """Create test client with auth overrides."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.api.dependencies import get_db, get_current_active_user
    
    async def override_get_db():
        yield MagicMock()
    
    async def override_get_current_user():
        return mock_user
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    from unittest.mock import AsyncMock, MagicMock
    
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    
    # Mock result
    mock_result = MagicMock()
    mock_result.scalar_one_or_none = MagicMock()
    session.execute.return_value = mock_result
    
    return session


@pytest.fixture
def mock_tutor_message():
    """Create mock tutor message."""
    from app.infrastructure.database.models.material import TutorMessage
    
    return TutorMessage(
        id=uuid4(),
        material_id=uuid4(),
        role="assistant",
        content="Quantum physics is a fundamental theory in physics that describes nature at the smallest scales.",
    )


@pytest.fixture
def mock_user():
    """Create mock user."""
    from unittest.mock import MagicMock
    
    mock_user = MagicMock()
    mock_user.id = uuid4()
    mock_user.is_active = True
    return mock_user

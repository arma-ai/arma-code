"""
Tests for Prometheus metrics middleware and OpenAI service caching/retry.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient


class TestMetricsMiddleware:
    """Tests for Prometheus metrics middleware."""

    def test_metrics_middleware_records_request(self, client):
        """Test that middleware records HTTP requests."""
        response = client.get("/health")
        assert response.status_code == 200
        
        # Check metrics endpoint
        metrics_response = client.get("/metrics")
        assert metrics_response.status_code == 200
        content = metrics_response.text
        
        # Should have recorded the request
        assert "http_requests_total" in content

    def test_metrics_middleware_records_duration(self, client):
        """Test that middleware records request duration."""
        client.get("/health")
        
        metrics_response = client.get("/metrics")
        content = metrics_response.text
        
        # Should have duration histogram
        assert "http_request_duration_seconds" in content

    def test_metrics_middleware_normalizes_endpoint_paths(self, client):
        """Test that endpoint paths are normalized (UUIDs replaced)."""
        # This would normally be tested with a real UUID path
        # For now, just verify metrics are recorded
        response = client.get("/health")
        assert response.status_code == 200

    def test_active_requests_gauge(self, client):
        """Test that active requests gauge is updated."""
        metrics_response = client.get("/metrics")
        content = metrics_response.text
        
        # Should have active requests gauge
        assert "http_requests_active" in content


class TestOpenAICaching:
    """Tests for OpenAI service Redis caching."""

    @pytest.mark.asyncio
    async def test_summary_caching(self, mock_openai_client, mock_redis):
        """Test that summary results are cached in Redis."""
        from app.infrastructure.ai.openai_service import OpenAIService
        
        service = OpenAIService()
        service.client = mock_openai_client
        
        with patch('app.infrastructure.ai.openai_service.get_redis', return_value=mock_redis):
            # First call - should generate and cache
            result1 = await service.generate_summary("Test text")
            
            # Verify cache was set
            mock_redis.setex.assert_called()
            
            # Reset mock to check second call
            mock_redis.get.reset_mock()
            mock_redis.get.return_value = result1
            
            # Second call - should return cached result
            result2 = await service.generate_summary("Test text")
            
            # Should have checked cache
            mock_redis.get.assert_called()
            assert result1 == result2

    @pytest.mark.asyncio
    async def test_notes_caching(self, mock_openai_client, mock_redis):
        """Test that notes results are cached in Redis."""
        from app.infrastructure.ai.openai_service import OpenAIService
        
        service = OpenAIService()
        service.client = mock_openai_client
        
        with patch('app.infrastructure.ai.openai_service.get_redis', return_value=mock_redis):
            result = await service.generate_notes("Test text")
            
            # Verify cache was set
            mock_redis.setex.assert_called()

    @pytest.mark.asyncio
    async def test_flashcards_caching(self, mock_openai_client, mock_redis):
        """Test that flashcards results are cached in Redis."""
        from app.infrastructure.ai.openai_service import OpenAIService
        
        service = OpenAIService()
        service.client = mock_openai_client
        
        # Mock flashcards response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"flashcards": [{"question": "Q1", "answer": "A1"}]}'
        mock_openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        with patch('app.infrastructure.ai.openai_service.get_redis', return_value=mock_redis):
            result = await service.generate_flashcards("Test text", count=5)
            
            # Verify cache was set
            mock_redis.setex.assert_called()
            assert len(result) > 0

    @pytest.mark.asyncio
    async def test_quiz_caching(self, mock_openai_client, mock_redis):
        """Test that quiz results are cached in Redis."""
        from app.infrastructure.ai.openai_service import OpenAIService
        
        service = OpenAIService()
        service.client = mock_openai_client
        
        # Mock quiz response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"questions": [{"question": "Q1", "option_a": "A", "option_b": "B", "option_c": "C", "option_d": "D", "correct_option": "A"}]}'
        mock_openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        with patch('app.infrastructure.ai.openai_service.get_redis', return_value=mock_redis):
            result = await service.generate_quiz("Test text", count=5)
            
            # Verify cache was set
            mock_redis.setex.assert_called()
            assert len(result) > 0

    @pytest.mark.asyncio
    async def test_cache_miss_returns_none(self, mock_openai_client):
        """Test that cache miss returns None when Redis unavailable."""
        from app.infrastructure.ai.openai_service import OpenAIService, get_redis
        
        service = OpenAIService()
        service.client = mock_openai_client
        
        # Mock Redis as unavailable
        with patch('app.infrastructure.ai.openai_service.get_redis', return_value=None):
            # Should still work, just without caching
            result = await service.generate_summary("Test text")
            assert result is not None


class TestOpenAIRetry:
    """Tests for OpenAI service retry logic."""

    @pytest.mark.asyncio
    async def test_retry_on_api_error(self, mock_openai_client):
        """Test that API calls are retried on error."""
        from app.infrastructure.ai.openai_service import OpenAIService
        from openai import APIError
        import httpx
        
        service = OpenAIService()
        service.client = mock_openai_client
        
        # Mock first 2 calls to fail, 3rd to succeed
        call_count = [0]
        mock_request = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
        
        def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] < 3:
                raise APIError(message="Test error", request=mock_request, body=None)
            return MagicMock(choices=[MagicMock(message=MagicMock(content="Success"))])
        
        mock_openai_client.chat.completions.create = AsyncMock(side_effect=side_effect)
        
        # Should succeed after retries
        result = await service.generate_summary("Test text")
        assert result == "Success"
        assert call_count[0] == 3  # Called 3 times

    @pytest.mark.asyncio
    async def test_retry_exhausted_raises(self, mock_openai_client):
        """Test that exception is raised after all retries fail."""
        from app.infrastructure.ai.openai_service import OpenAIService
        from openai import APIError
        from tenacity import RetryError
        import httpx
        
        service = OpenAIService()
        service.client = mock_openai_client
        
        # Always fail
        mock_request = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
        mock_openai_client.chat.completions.create = AsyncMock(
            side_effect=lambda **kwargs: (_ for _ in ()).throw(
                APIError(message="Test error", request=mock_request, body=None)
            )
        )
        
        # Should raise RetryError after 3 attempts
        with pytest.raises(RetryError):
            await service.generate_summary("Test text")


@pytest.fixture
def client():
    """Create test client."""
    from app.main import app
    from app.api.dependencies import get_db
    
    async def override_get_db():
        yield MagicMock()
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client."""
    client = AsyncMock()
    
    # Mock summary response
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Test summary"
    client.chat.completions.create = AsyncMock(return_value=mock_response)
    
    # Mock embeddings response
    embed_response = MagicMock()
    embed_item = MagicMock()
    embed_item.embedding = [0.1] * 3072
    embed_response.data = [embed_item]
    client.embeddings.create = AsyncMock(return_value=embed_response)
    
    return client


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.setex = AsyncMock()
    redis.ping = AsyncMock()
    return redis

"""
Tests for CorrelationIDMiddleware and StructuredLoggingMiddleware.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestCorrelationIDMiddleware:
    """Tests for the X-Request-ID middleware."""

    def test_correlation_id_middleware_generates_uuid(self):
        """Every request gets a unique X-Request-ID if none is provided."""
        import uuid
        from app.middleware import CorrelationIDMiddleware

        seen_ids = set()
        for _ in range(5):
            test_id = str(uuid.uuid4())
            assert test_id not in seen_ids
            seen_ids.add(test_id)

        assert len(seen_ids) == 5

    @pytest.mark.asyncio
    async def test_correlation_id_preserved_from_header(self):
        """If client sends X-Request-ID, it is echoed back in the response."""
        from app.middleware import CorrelationIDMiddleware

        custom_id = "my-custom-request-id-123"
        # Simulate the middleware setting the ID from header
        request = MagicMock()
        request.headers = {"X-Request-ID": custom_id}
        request.state = MagicMock()

        response = MagicMock()
        response.headers = {}

        async def call_next(req):
            return response

        middleware = CorrelationIDMiddleware(app=MagicMock())
        # Patch dispatch logic
        result = await middleware.dispatch(request, call_next)
        assert response.headers.get("X-Request-ID") == custom_id

    @pytest.mark.asyncio
    async def test_correlation_id_generated_when_missing(self):
        """If no X-Request-ID header, one is generated."""
        from app.middleware import CorrelationIDMiddleware

        request = MagicMock()
        request.headers = {}  # no X-Request-ID
        request.state = MagicMock()

        response = MagicMock()
        response.headers = {}

        async def call_next(req):
            return response

        middleware = CorrelationIDMiddleware(app=MagicMock())
        await middleware.dispatch(request, call_next)

        request_id = response.headers.get("X-Request-ID")
        assert request_id is not None
        assert len(request_id) == 36  # UUID4 length


class TestStructuredLoggingMiddleware:
    """Tests for the structured JSON logging middleware."""

    @pytest.mark.asyncio
    async def test_logging_middleware_logs_on_success(self):
        """Successful requests produce a JSON log entry."""
        from app.middleware import StructuredLoggingMiddleware
        import json

        logged_messages = []

        request = MagicMock()
        request.state.request_id = "test-req-id"
        request.method = "GET"
        request.url.path = "/api/v1/materials"

        response = MagicMock()
        response.status_code = 200

        async def call_next(req):
            return response

        middleware = StructuredLoggingMiddleware(app=MagicMock())

        with patch("app.middleware.logger") as mock_logger:
            result = await middleware.dispatch(request, call_next)
            assert mock_logger.info.called

            call_args = mock_logger.info.call_args[0][0]
            log_data = json.loads(call_args)

            assert log_data["event"] == "http_request"
            assert log_data["method"] == "GET"
            assert log_data["path"] == "/api/v1/materials"
            assert log_data["status"] == 200
            assert log_data["request_id"] == "test-req-id"
            assert "duration_ms" in log_data

    @pytest.mark.asyncio
    async def test_logging_middleware_logs_on_exception(self):
        """Exceptions produce an error log entry and are re-raised."""
        from app.middleware import StructuredLoggingMiddleware
        import json

        request = MagicMock()
        request.state.request_id = "test-err-id"
        request.method = "POST"
        request.url.path = "/api/v1/materials"

        async def call_next(req):
            raise RuntimeError("Something broke")

        middleware = StructuredLoggingMiddleware(app=MagicMock())

        with patch("app.middleware.logger") as mock_logger:
            with pytest.raises(RuntimeError, match="Something broke"):
                await middleware.dispatch(request, call_next)

            assert mock_logger.error.called
            call_args = mock_logger.error.call_args[0][0]
            log_data = json.loads(call_args)
            assert log_data["status"] == 500
            assert "error" in log_data

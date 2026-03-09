"""
Request ID middleware for request tracing and structured logging.
"""
import logging
import uuid
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds a unique request ID to every request.
    This enables request tracing across services and structured logging.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())[:8]

        # Store in request state for access in endpoints
        request.state.request_id = request_id

        # Log the incoming request
        start_time = time.time()
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} - started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": str(request.url.path),
                "client_ip": request.client.host if request.client else "unknown",
            }
        )

        try:
            response = await call_next(request)

            # Calculate request duration
            duration_ms = round((time.time() - start_time) * 1000, 2)

            # Add request ID and timing to response headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{duration_ms}ms"

            logger.info(
                f"[{request_id}] {request.method} {request.url.path} "
                f"- {response.status_code} ({duration_ms}ms)",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": str(request.url.path),
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                }
            )

            return response

        except Exception as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            logger.error(
                f"[{request_id}] {request.method} {request.url.path} "
                f"- ERROR ({duration_ms}ms): {str(e)}",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": str(request.url.path),
                    "error": str(e),
                    "duration_ms": duration_ms,
                }
            )
            raise


def setup_structured_logging():
    """
    Configure structured JSON logging for the application.
    Should be called during app startup.
    """
    import json

    class JSONFormatter(logging.Formatter):
        """Format log records as JSON for structured logging."""

        def format(self, record):
            log_dict = {
                "timestamp": self.formatTime(record),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            }
            # Add extra fields if available
            for field in ("request_id", "method", "path", "status_code",
                         "duration_ms", "client_ip", "error"):
                if hasattr(record, field):
                    log_dict[field] = getattr(record, field)

            return json.dumps(log_dict, ensure_ascii=False)

    # Apply JSON formatter to root logger
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.INFO)

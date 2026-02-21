"""
Custom FastAPI middleware: Correlation ID propagation + structured request logging.
"""
import json
import logging
import time
import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique X-Request-ID to every request / response pair.

    Priority:
      1. Use the value from the incoming ``X-Request-ID`` header (so callers
         that already set it keep their ID).
      2. Generate a fresh UUID4 otherwise.

    The ID is stored on ``request.state.request_id`` so downstream handlers
    can include it in their own log records.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Log every HTTP request/response pair as a single JSON record.

    Example output::

        {
          "event": "http_request",
          "request_id": "a1b2-...",
          "method": "POST",
          "path": "/api/v1/auth/login",
          "status": 200,
          "duration_ms": 142
        }
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        request_id = getattr(request.state, "request_id", "-")

        try:
            response = await call_next(request)
            status = response.status_code
        except Exception as exc:
            duration_ms = int((time.perf_counter() - start) * 1000)
            logger.error(
                json.dumps({
                    "event": "http_request",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": 500,
                    "duration_ms": duration_ms,
                    "error": str(exc),
                })
            )
            raise

        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            json.dumps({
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": status,
                "duration_ms": duration_ms,
            })
        )
        return response

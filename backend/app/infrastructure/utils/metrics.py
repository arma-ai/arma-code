"""
Prometheus metrics middleware for tracking API performance and errors.
"""
import time
import logging
from typing import Callable
from fastapi import Request, Response
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

logger = logging.getLogger(__name__)

# ── Metrics definitions ──────────────────────────────────────────────────────

# Counter for total HTTP requests
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Histogram for request duration
REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
)

# Counter for exceptions
EXCEPTION_COUNT = Counter(
    'http_exceptions_total',
    'Total HTTP exceptions',
    ['method', 'endpoint', 'exception_type']
)

# Gauge for active requests
ACTIVE_REQUESTS = Gauge(
    'http_requests_active',
    'Number of active HTTP requests'
)

# Counter for materials processed
MATERIALS_PROCESSED = Counter(
    'materials_processed_total',
    'Total materials processed',
    ['status', 'type']
)

# Histogram for material processing time
MATERIAL_PROCESSING_TIME = Histogram(
    'material_processing_seconds',
    'Time spent processing material',
    ['type'],
    buckets=(1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0)
)

# Counter for AI API calls
AI_API_CALLS = Counter(
    'ai_api_calls_total',
    'Total AI API calls',
    ['provider', 'endpoint', 'status']
)

# Histogram for AI API latency
AI_API_LATENCY = Histogram(
    'ai_api_latency_seconds',
    'AI API call latency',
    ['provider', 'endpoint'],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0)
)


# ── Metrics endpoint ─────────────────────────────────────────────────────────

async def metrics_endpoint(request: Request) -> Response:
    """Expose Prometheus metrics at /metrics."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


# ── Middleware ───────────────────────────────────────────────────────────────

async def metrics_middleware(
    request: Request,
    call_next: Callable
) -> Response:
    """
    Middleware to collect Prometheus metrics for all HTTP requests.
    
    Tracks:
    - Total request count (by method, endpoint, status)
    - Request duration histogram
    - Exception count
    - Active requests gauge
    """
    # Normalize endpoint path (remove IDs)
    endpoint = _normalize_endpoint(request.url.path)
    method = request.method
    
    # Increment active requests
    ACTIVE_REQUESTS.inc()
    
    start_time = time.time()
    
    try:
        response = await call_next(request)
        
        # Record request duration
        duration = time.time() - start_time
        REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
        
        # Record request count
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=response.status_code).inc()
        
        return response
        
    except Exception as e:
        # Record exception
        duration = time.time() - start_time
        REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
        EXCEPTION_COUNT.labels(
            method=method,
            endpoint=endpoint,
            exception_type=type(e).__name__
        ).inc()
        
        logger.error(
            "Request failed",
            extra={
                "method": method,
                "endpoint": endpoint,
                "exception": type(e).__name__,
                "duration": duration
            }
        )
        
        raise
        
    finally:
        # Decrement active requests
        ACTIVE_REQUESTS.dec()


def _normalize_endpoint(path: str) -> str:
    """
    Normalize endpoint path by replacing UUIDs and numeric IDs with placeholders.
    
    Examples:
        /api/v1/materials/123e4567-e89b-12d3-a456-426614174000/summary
        → /api/v1/materials/{id}/summary
        
        /api/v1/users/42/profile
        → /api/v1/users/{id}/profile
    """
    import re
    
    # Replace UUIDs
    normalized = re.sub(
        r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        '/{id}',
        path
    )
    
    # Replace numeric IDs
    normalized = re.sub(r'/\d+', '/{id}', normalized)
    
    return normalized

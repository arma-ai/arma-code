"""
Prometheus metrics for EduPlatform API.

Centralised metric definitions so every module imports from one place.
The /metrics endpoint is mounted separately via make_asgi_app().
"""
from prometheus_client import Counter, Histogram

# ── HTTP layer ──────────────────────────────────────────────────────────────
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)

HTTP_REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

# ── Material processing ────────────────────────────────────────────────────
MATERIALS_PROCESSED = Counter(
    "materials_processed_total",
    "Total materials processed",
    ["status"],  # completed | failed
)

MATERIAL_PROCESSING_DURATION = Histogram(
    "material_processing_seconds",
    "Time spent processing a single material",
    ["material_type"],
    buckets=(1, 5, 10, 30, 60, 120, 300),
)

# ── OpenAI / external API ──────────────────────────────────────────────────
OPENAI_REQUESTS = Counter(
    "openai_requests_total",
    "Total requests to OpenAI API",
    ["endpoint", "status"],  # endpoint: summary|notes|flashcards|quiz, status: ok|error
)

"""
FastAPI Application Entry Point
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_client import make_asgi_app

from app.core.config import settings
from app.api.v1.router import api_router
from app.api.v1.endpoints import health as health_endpoints
from app.middleware import CorrelationIDMiddleware, StructuredLoggingMiddleware
from app.infrastructure.utils.metrics import metrics_middleware


def create_application() -> FastAPI:
    """
    Create and configure FastAPI application.

    Returns:
        FastAPI: Configured application
    """
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ── Middleware (order matters: first added = outermost wrapper) ──────────
    # CORSMiddleware must be outermost so pre-flight OPTIONS requests are
    # handled before any auth middleware.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_origin_regex=settings.BACKEND_CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Structured request logging (reads request_id set by CorrelationID)
    app.add_middleware(StructuredLoggingMiddleware)
    # Correlation ID must run before logging so request_id is available
    app.add_middleware(CorrelationIDMiddleware)
    
    # Prometheus metrics middleware (Bug 10.1)
    app.middleware("http")(metrics_middleware)

    # Mount static files for podcasts / uploaded materials
    storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")
    os.makedirs(storage_dir, exist_ok=True)
    app.mount("/storage", StaticFiles(directory=storage_dir), name="storage")

    # Include API router
    app.include_router(api_router, prefix="/api/v1")
    
    # Include health check endpoints (Bug 9.3)
    app.include_router(health_endpoints.router)

    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "message": "EduPlatform API",
            "version": "1.0.0",
            "docs": "/docs",
        }

    # Prometheus metrics endpoint (Bug 10.1)
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

    return app


app = create_application()

"""Health check endpoints for monitoring and load balancers."""
import logging
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Track last successful health check
_last_successful_check = datetime.now(timezone.utc)


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Basic health check endpoint.
    
    Returns 200 OK if the service is running.
    Used by load balancers and orchestrators.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "eduplatform-backend"
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Readiness check endpoint.
    
    Returns 200 OK if the service is ready to accept traffic.
    Checks database and Redis connectivity.
    """
    checks = {}
    overall_status = "ready"
    status_code = 200
    
    # Check database connectivity
    try:
        start = time.time()
        await db.execute(text("SELECT 1"))
        db_latency = (time.time() - start) * 1000  # ms
        checks["database"] = {
            "status": "healthy",
            "latency_ms": round(db_latency, 2)
        }
    except Exception as e:
        checks["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_status = "not_ready"
        status_code = 503
    
    # Check Redis connectivity
    try:
        import redis.asyncio as aioredis
        start = time.time()
        redis_client = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        try:
            await redis_client.ping()
            redis_latency = (time.time() - start) * 1000  # ms
            checks["redis"] = {
                "status": "healthy",
                "latency_ms": round(redis_latency, 2)
            }
        finally:
            # Bug fix #2.2: Always close Redis connection
            await redis_client.close()
    except Exception as e:
        checks["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        # Redis is optional for some features, so don't fail readiness
    
    # Check OpenAI API key configured
    if settings.OPENAI_API_KEY:
        checks["openai"] = {
            "status": "configured"
        }
    else:
        checks["openai"] = {
            "status": "not_configured",
            "warning": "OPENAI_API_KEY not set"
        }
    
    response_data = {
        "status": overall_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "eduplatform-backend",
        "version": "1.0.0",
        "checks": checks
    }
    
    if overall_status == "ready":
        global _last_successful_check
        _last_successful_check = datetime.now(timezone.utc)
    
    return JSONResponse(status_code=status_code, content=response_data)


@router.get("/live", status_code=status.HTTP_200_OK)
async def liveness_check():
    """
    Liveness check endpoint.
    
    Returns 200 OK if the service is alive (not deadlocked).
    Used by Kubernetes to detect deadlocks.
    """
    # Check if we've had a successful readiness check recently
    time_since_last_check = (datetime.now(timezone.utc) - _last_successful_check).total_seconds()
    
    # Consider unhealthy if no successful check in last 5 minutes
    if time_since_last_check > 300:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "reason": "No successful readiness check in last 5 minutes",
                "time_since_last_check_seconds": time_since_last_check
            }
        )
    
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "eduplatform-backend"
    }

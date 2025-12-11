"""
Celery application configuration
"""
from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "eduplatform",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.infrastructure.queue.tasks"]  # Auto-discover tasks
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task execution settings
    task_acks_late=True,  # Acknowledge tasks after completion
    task_reject_on_worker_lost=True,  # Reject task if worker is lost
    worker_prefetch_multiplier=1,  # Take 1 task at a time

    # Result backend settings
    result_expires=3600,  # 1 hour
    result_persistent=True,

    # Task routing
    task_routes={
        "app.infrastructure.queue.tasks.process_material": {"queue": "materials"},
        "app.infrastructure.queue.tasks.generate_podcast": {"queue": "ai"},
        "app.infrastructure.queue.tasks.generate_presentation": {"queue": "ai"},
    },

    # Rate limiting
    task_time_limit=600,  # 10 minutes hard limit
    task_soft_time_limit=540,  # 9 minutes soft limit
)

# Optional: Celery Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    # Example: cleanup old quiz attempts
    # 'cleanup-old-attempts': {
    #     'task': 'app.infrastructure.queue.tasks.cleanup_old_attempts',
    #     'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    # },
}

#!/bin/bash

# Start Celery worker for EduPlatform
# This script should be run from the backend directory

echo "Starting Celery worker..."

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Start Celery worker with multiple queues
celery -A app.infrastructure.queue.celery_app worker \
    --loglevel=info \
    --concurrency=2 \
    --queues=materials,ai,celery \
    --max-tasks-per-child=10 \
    --time-limit=600 \
    --soft-time-limit=540

# Alternative for development (single worker, auto-reload):
# celery -A app.infrastructure.queue.celery_app worker --loglevel=info --pool=solo --autoreload

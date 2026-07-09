"""
Celery application configuration.
Uses Redis as message broker and result backend.
"""

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "studyai",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

# Celery configuration
celery_app.conf.update(
    # Task behavior
    task_acks_late=True,                  # ACK after task completes (not when received)
    worker_prefetch_multiplier=1,         # Don't prefetch — one task at a time per worker
    task_reject_on_worker_lost=True,      # Re-queue if worker crashes

    # Serialization
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Time limits
    task_soft_time_limit=600,             # 10 minutes soft limit
    task_time_limit=900,                  # 15 minutes hard kill

    # Result expiry
    result_expires=3600,                  # Results expire after 1 hour

    # Timezone
    timezone="UTC",
    enable_utc=True,
)

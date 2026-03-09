"""
Celery Configuration
─────────────────────
Background task queue for long-running jobs:
- Lead evaluation (batch scoring)
- Email generation (personalized content)
- Email sending (ReachInbox API calls)
"""
from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "leadflow",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_default_queue="leadflow",
)

# Auto-discover tasks in app/tasks/
celery_app.autodiscover_tasks(["app.tasks"])

"""Celery application using the already running RabbitMQ and Redis services."""

from celery import Celery

from clauseguard_core.config import get_settings

settings = get_settings()
celery_app = Celery(
    "clauseguard",
    broker=settings.rabbitmq_url,
    backend=settings.redis_url,
    include=["clauseguard_worker.tasks"],
)
celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    beat_schedule={
        "dispatch-database-outbox": {
            "task": "clauseguard.dispatch_outbox",
            "schedule": 5.0,
        }
    },
)

"""
Celery 应用初始化
"""
from celery import Celery
from core.config import settings

celery_app = Celery(
    "ai_eval_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# 自动从 worker/tasks.py 发现任务
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
    task_store_eager_result=True,
    task_time_limit=3600,  # 强制超时 1 小时
)

celery_app.autodiscover_tasks(["worker"])

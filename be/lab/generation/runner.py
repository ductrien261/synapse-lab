"""Chạy luồng sinh bài nền, không cần Celery.

- `start` chạy luồng trong một thread; `LAB_GEN_INLINE=True` (test) chạy ngay trong tiến trình gọi.
- Tải lại trang không ảnh hưởng: tiến trình nằm trong DB. Nếu tiến trình backend bị khởi động lại giữa chừng thì lần sinh
  bị bỏ dở (heartbeat quá cũ) sẽ được nhặt lại khi có ai hỏi trạng thái (`ensure_running`) và chạy tiếp từ bước đã lưu.
- `claim` dùng một lệnh UPDATE có điều kiện nên không bao giờ có hai nơi cùng chạy một lần sinh.
"""

import logging
import threading
from datetime import timedelta

from django.conf import settings
from django.db import close_old_connections
from django.db.models import Q
from django.utils import timezone

from ..models import Generation
from .pipeline import Pipeline

log = logging.getLogger(__name__)


def stale_seconds() -> int:
    return getattr(settings, 'LAB_GEN_STALE_SECONDS', 180)


def claim(gen_id: int) -> bool:
    """Giành quyền chạy: chỉ thành công khi lần sinh còn dang dở và chưa ai đang chạy (heartbeat chưa có hoặc đã cũ)."""
    now = timezone.now()
    rows = (Generation.objects.filter(pk=gen_id, status__in=Generation.ACTIVE)
            .filter(Q(heartbeat_at__isnull=True) | Q(heartbeat_at__lt=now - timedelta(seconds=stale_seconds())))
            .update(status=Generation.Status.RUNNING, heartbeat_at=now))
    return rows == 1


def run_now(gen_id: int) -> None:
    if not claim(gen_id):
        return
    gen = Generation.objects.get(pk=gen_id)
    Pipeline(gen).run()


def _target(gen_id: int) -> None:
    close_old_connections()
    try:
        run_now(gen_id)
    except Exception:  # noqa: BLE001
        log.exception('Lần sinh bài #%s bị lỗi ngoài dự kiến', gen_id)
    finally:
        close_old_connections()


def start(gen_id: int) -> None:
    if getattr(settings, 'LAB_GEN_INLINE', False):
        run_now(gen_id)
        return
    threading.Thread(target=_target, args=(gen_id,), name=f'lab-gen-{gen_id}', daemon=True).start()


def ensure_running(gen: Generation) -> None:
    """Gọi khi ai đó hỏi trạng thái: lần sinh dang dở mà không còn ai chạy thì chạy tiếp."""
    if not gen.is_active:
        return
    last = gen.heartbeat_at or gen.created_at
    if timezone.now() - last > timedelta(seconds=stale_seconds() if gen.heartbeat_at else 10):
        start(gen.pk)

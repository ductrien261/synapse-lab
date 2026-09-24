"""
Langfuse (tùy chọn): mỗi lượt chạy là 1 trace; các bước LangChain/LangGraph tự ghi vào trace đó.
Không cấu hình key -> bỏ qua, mọi thứ vẫn chạy.
"""

import logging
from contextlib import contextmanager
from functools import lru_cache

from ..config import get_settings
from .context import RunContext

log = logging.getLogger(__name__)


@lru_cache
def _client():
    settings = get_settings()
    if not settings.langfuse_enabled:
        return None
    try:
        from langfuse import Langfuse

        return Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
    except Exception:  # noqa: BLE001
        log.exception('Không khởi tạo được Langfuse')
        return None


@contextmanager
def run_context(name: str, feature: str, user_id: str = '', metadata: dict | None = None):
    """with run_context('tutor', 'tutor', user_id) as ctx: ... (ctx.callbacks truyền vào LangChain)"""
    ctx = RunContext(feature=feature, user_id=user_id)
    client = _client()
    if client is None:
        yield ctx
        return
    try:
        from langfuse import propagate_attributes
        from langfuse.langchain import CallbackHandler
    except Exception:  # noqa: BLE001
        yield ctx
        return

    with client.start_as_current_observation(name=name, as_type='chain', metadata=metadata or {}) as span:
        with propagate_attributes(user_id=user_id or None, tags=[feature], trace_name=name,
                                  metadata={k: str(v) for k, v in (metadata or {}).items()}):
            try:
                ctx.trace_id = client.get_current_trace_id()
                ctx.trace_url = client.get_trace_url(trace_id=ctx.trace_id) if ctx.trace_id else None
            except Exception:  # noqa: BLE001
                ctx.trace_url = None
            ctx.callbacks = [CallbackHandler()]
            yield ctx
            try:
                span.update(output={'usage': len(ctx.usage)})
            except Exception:  # noqa: BLE001
                pass


def shutdown():
    client = _client()
    if client is not None:
        try:
            client.flush()
        except Exception:  # noqa: BLE001
            pass

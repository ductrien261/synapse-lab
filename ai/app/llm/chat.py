"""
Gọi LLM qua LangChain (ChatOpenAI trỏ tới Groq).
- Giãn cách tối thiểu giữa các lần gọi (gói miễn phí giới hạn lượt/phút); thư viện tự thử lại khi 429/5xx/mất mạng
- Ghi lại token + độ trễ của từng lần gọi vào RunContext
"""

import json
import re
import threading
import time
from functools import lru_cache

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from ..config import get_settings
from .context import RunContext, UsageEntry

THINK_RE = re.compile(r'<think>.*?</think>', re.DOTALL)
JSON_RE = re.compile(r'\{.*\}', re.DOTALL)

_lock = threading.Lock()
_last = [0.0]


class LLMError(Exception):
    pass


class LLMNotConfigured(LLMError):
    pass


@lru_cache
def _model(temperature: float) -> ChatOpenAI:
    s = get_settings()
    return ChatOpenAI(
        model=s.groq_model,
        api_key=s.groq_api_key or 'missing',
        base_url=s.groq_base_url,
        temperature=temperature,
        max_retries=4,
        timeout=90,
        extra_body={'reasoning_format': 'hidden'},  # Qwen: ẩn phần "suy nghĩ"
    )


def _throttle():
    interval = get_settings().llm_min_interval
    with _lock:
        wait = interval - (time.monotonic() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.monotonic()


def chat(ctx: RunContext, step: str, system: str, user: str, *, json_mode: bool = False, temperature: float = 0.2,
         history: list[BaseMessage] | None = None) -> str:
    settings = get_settings()
    if not settings.groq_api_key:
        raise LLMNotConfigured('Chưa cấu hình GROQ_API_KEY.')
    messages = [SystemMessage(system), *(history or []), HumanMessage(user)]
    model = _model(temperature)
    runnable = model.bind(response_format={'type': 'json_object'}) if json_mode else model
    config = {'callbacks': ctx.callbacks, 'run_name': step, 'metadata': {'feature': ctx.feature}}

    _throttle()
    started = time.monotonic()
    try:
        try:
            msg = runnable.invoke(messages, config=config)
        except Exception as exc:  # model không hỗ trợ JSON mode -> gọi lại thường
            if json_mode and 'response_format' in str(exc):
                msg = model.invoke(messages, config=config)
            else:
                raise
    except Exception as exc:  # noqa: BLE001
        ctx.record(UsageEntry(step=step, kind='chat', provider='groq', model=settings.groq_model,
                              latency_ms=int((time.monotonic() - started) * 1000), status='error', error=str(exc)[:300]))
        raise LLMError(f'LLM lỗi: {exc.__class__.__name__}') from exc

    usage = getattr(msg, 'usage_metadata', None) or {}
    ctx.record(UsageEntry(
        step=step, kind='chat', provider='groq',
        model=(getattr(msg, 'response_metadata', None) or {}).get('model_name') or settings.groq_model,
        input_tokens=int(usage.get('input_tokens', 0)), output_tokens=int(usage.get('output_tokens', 0)),
        latency_ms=int((time.monotonic() - started) * 1000),
    ))
    return THINK_RE.sub('', msg.content if isinstance(msg.content, str) else str(msg.content)).strip()


def parse_json(text: str) -> dict:
    """Lấy object JSON trong câu trả lời (kể cả khi model bọc trong ```json ... ```)."""
    match = JSON_RE.search(text or '')
    if not match:
        raise LLMError('AI không trả về đúng định dạng JSON.')
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise LLMError('AI trả về JSON lỗi.') from exc
    if not isinstance(data, dict):
        raise LLMError('AI trả về JSON không phải object.')
    return data

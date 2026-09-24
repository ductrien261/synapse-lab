"""
Gọi LLM (Groq, API tương thích OpenAI) cho các tác vụ viết nội dung.
- Giãn cách tối thiểu giữa các lần gọi + tự thử lại khi quá tải (429/5xx) hoặc rớt mạng
- Trả về cả số token để theo dõi chi phí

Cấu hình: GROQ_API_KEY, GROQ_MODEL trong .env
"""

import json
import re
import threading
import time
from dataclasses import dataclass

import requests
from django.conf import settings

GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
MIN_INTERVAL = 2.0  # giây giữa 2 lần gọi (gói miễn phí giới hạn số lượt/phút)
THINK_RE = re.compile(r'<think>.*?</think>', re.DOTALL)
JSON_RE = re.compile(r'\{.*\}', re.DOTALL)


class LLMError(Exception):
    pass


class LLMNotConfigured(LLMError):
    pass


@dataclass
class LLMResult:
    text: str
    prompt_tokens: int
    completion_tokens: int
    model: str


_lock = threading.Lock()
_state = {'last': 0.0}


def is_configured() -> bool:
    return bool(getattr(settings, 'GROQ_API_KEY', ''))


def complete(prompt: str, system: str = '', temperature: float = 0.2, max_retries: int = 5, json_mode: bool = False) -> LLMResult:
    if not is_configured():
        raise LLMNotConfigured('Chưa cấu hình GROQ_API_KEY.')
    messages = ([{'role': 'system', 'content': system}] if system else []) + [{'role': 'user', 'content': prompt}]
    body = {'model': settings.GROQ_MODEL, 'messages': messages, 'temperature': temperature, 'reasoning_format': 'hidden'}
    if json_mode:
        body['response_format'] = {'type': 'json_object'}

    for attempt in range(max_retries):
        with _lock:
            wait = MIN_INTERVAL - (time.monotonic() - _state['last'])
            if wait > 0:
                time.sleep(wait)
            _state['last'] = time.monotonic()
        try:
            res = requests.post(GROQ_URL, json=body, headers={'Authorization': f'Bearer {settings.GROQ_API_KEY}'}, timeout=90)
        except (requests.ConnectionError, requests.Timeout):
            time.sleep(2 ** attempt * 2)
            continue
        if res.status_code == 429 or res.status_code >= 500:
            retry_after = float(res.headers.get('retry-after', 0) or 0)
            time.sleep(min(60.0, max(retry_after, 2 ** attempt * 3)))
            continue
        if res.status_code == 400 and json_mode:
            # Model không hỗ trợ JSON mode -> gọi lại bình thường, tự tách JSON
            body.pop('response_format', None)
            json_mode = False
            continue
        if not res.ok:
            raise LLMError(f'LLM trả lỗi {res.status_code}: {res.text[:200]}')
        data = res.json()
        usage = data.get('usage') or {}
        text = THINK_RE.sub('', data['choices'][0]['message'].get('content') or '').strip()
        return LLMResult(text, usage.get('prompt_tokens', 0), usage.get('completion_tokens', 0), data.get('model', settings.GROQ_MODEL))
    raise LLMError('LLM liên tục quá tải hoặc mất mạng, thử lại sau.')


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

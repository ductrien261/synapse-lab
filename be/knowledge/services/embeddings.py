"""
Tạo vector bằng Gemini (gemini-embedding-001, 768 chiều).
- Gọi hàng loạt (batchEmbedContents); key bị chặn gọi hàng loạt (403) -> tự chuyển sang gọi từng đoạn
- Tự thử lại khi quá tải (429/5xx) hoặc rớt mạng
Không dùng LLM, chi phí rất thấp (mỗi đoạn tạo vector 1 lần khi nạp).
"""

import math
import threading
import time

import requests
from django.conf import settings

from ..models import EMBEDDING_DIMENSIONS

BASE = 'https://generativelanguage.googleapis.com/v1beta/models/{model}:{method}'
BATCH_SIZE = 50


class EmbeddingError(RuntimeError):
    pass


class EmbeddingNotConfigured(EmbeddingError):
    pass


class _HTTPError(EmbeddingError):
    def __init__(self, status: int, body: str):
        super().__init__(f'Gemini embedding lỗi {status}: {body}')
        self.status = status


_lock = threading.Lock()
_state = {'last': 0.0, 'batch_ok': True}


def is_configured() -> bool:
    return bool(settings.GEMINI_API_KEY)


def _request(method: str, body: dict, interval: float) -> dict:
    if not settings.GEMINI_API_KEY:
        raise EmbeddingNotConfigured('Chưa cấu hình GEMINI_API_KEY để tạo vector.')
    url = BASE.format(model=settings.GEMINI_EMBED_MODEL, method=method)
    for attempt in range(6):
        with _lock:
            wait = interval - (time.monotonic() - _state['last'])
            if wait > 0:
                time.sleep(wait)
            _state['last'] = time.monotonic()
        try:
            res = requests.post(url, json=body, headers={'x-goog-api-key': settings.GEMINI_API_KEY}, timeout=60)
        except (requests.ConnectionError, requests.Timeout):
            time.sleep(2 ** attempt * 2)
            continue
        if res.status_code == 429 or res.status_code >= 500:
            time.sleep(2 ** attempt * 3)
            continue
        if not res.ok:
            raise _HTTPError(res.status_code, res.text[:300])
        return res.json()
    raise EmbeddingError('Gemini embedding liên tục lỗi (quá tải hoặc mất mạng).')


def _item(text: str, task: str) -> dict:
    return {'content': {'parts': [{'text': text}]}, 'taskType': task, 'outputDimensionality': EMBEDDING_DIMENSIONS}


def _normalize(vec: list[float]) -> list[float]:
    # outputDimensionality < 3072 -> Gemini khuyên chuẩn hóa lại độ dài vector
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _embed_batch(texts: list[str], task: str) -> list[list[float]]:
    if _state['batch_ok']:
        try:
            body = {'requests': [{'model': f'models/{settings.GEMINI_EMBED_MODEL}', **_item(t, task)} for t in texts]}
            data = _request('batchEmbedContents', body, 0.7)
            return [e['values'] for e in data['embeddings']]
        except _HTTPError as exc:
            if exc.status != 403:
                raise
            _state['batch_ok'] = False  # key không được gọi hàng loạt
    return [_request('embedContent', _item(t, task), 0.15)['embedding']['values'] for t in texts]


def embed_documents(texts: list[str], on_batch=None) -> list[list[float]]:
    """on_batch(số đoạn đã xong, tổng) — để lượt chạy nền báo tiến độ / giữ nhịp."""
    out: list[list[float]] = []
    for i in range(0, len(texts), BATCH_SIZE):
        out.extend(_normalize(v) for v in _embed_batch(texts[i: i + BATCH_SIZE], 'RETRIEVAL_DOCUMENT'))
        if on_batch:
            on_batch(len(out), len(texts))
    return out


def embed_query(text: str) -> list[float]:
    return _normalize(_embed_batch([text], 'RETRIEVAL_QUERY')[0])

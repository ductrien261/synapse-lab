"""Vector cho câu hỏi (Gemini, 768 chiều) — cùng loại vector với lúc nạp tài liệu ở backend."""

import math
import time

import requests

from ..config import get_settings
from ..llm.context import RunContext, UsageEntry

URL = 'https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent'


class EmbeddingError(Exception):
    pass


def embed_query(ctx: RunContext, text: str) -> list[float]:
    s = get_settings()
    if not s.gemini_api_key:
        raise EmbeddingError('Chưa cấu hình GEMINI_API_KEY.')
    body = {
        'content': {'parts': [{'text': text}]},
        'taskType': 'RETRIEVAL_QUERY',
        'outputDimensionality': s.embed_dimensions,
    }
    started = time.monotonic()
    for attempt in range(5):
        try:
            res = requests.post(URL.format(model=s.gemini_embed_model), json=body,
                                headers={'x-goog-api-key': s.gemini_api_key}, timeout=30)
        except (requests.ConnectionError, requests.Timeout):
            time.sleep(2 ** attempt)
            continue
        if res.status_code == 429 or res.status_code >= 500:
            time.sleep(2 ** attempt * 2)
            continue
        if not res.ok:
            break
        values = res.json()['embedding']['values']
        norm = math.sqrt(sum(v * v for v in values)) or 1.0
        ctx.record(UsageEntry(step='embed_query', kind='embedding', provider='gemini', model=s.gemini_embed_model,
                              input_tokens=max(1, len(text) // 4), latency_ms=int((time.monotonic() - started) * 1000)))
        return [v / norm for v in values]
    ctx.record(UsageEntry(step='embed_query', kind='embedding', provider='gemini', model=s.gemini_embed_model,
                          latency_ms=int((time.monotonic() - started) * 1000), status='error'))
    raise EmbeddingError('Không tạo được vector cho câu hỏi.')

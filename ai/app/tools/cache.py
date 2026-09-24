"""Cache Redis cho kết quả tốn AI (dịch câu hỏi...). Redis lỗi -> coi như không có cache."""

import hashlib
import json
import logging
from functools import lru_cache

import redis

from ..config import get_settings

log = logging.getLogger(__name__)
DEFAULT_TTL = 60 * 60 * 24 * 60  # 60 ngày


@lru_cache
def _client():
    try:
        return redis.Redis.from_url(get_settings().redis_url, socket_timeout=2, decode_responses=True)
    except Exception:  # noqa: BLE001
        return None


def key(namespace: str, *parts: str) -> str:
    digest = hashlib.sha256('␟'.join(parts).encode('utf-8')).hexdigest()[:32]
    return f'synapse:ai:{namespace}:{digest}'


def get(k: str):
    client = _client()
    if client is None:
        return None
    try:
        raw = client.get(k)
        return json.loads(raw) if raw else None
    except Exception:  # noqa: BLE001
        return None


def set(k: str, value, ttl: int = DEFAULT_TTL):  # noqa: A001 - tên hàm ngắn gọn có chủ đích
    client = _client()
    if client is None:
        return
    try:
        client.set(k, json.dumps(value, ensure_ascii=False), ex=ttl)
    except Exception:  # noqa: BLE001
        log.warning('Không ghi được cache Redis')

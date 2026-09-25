"""
Gọi service AI + hạn mức + nhật ký + chi phí.

    data = call_ai('/v1/translate', {...}, user=request.user, feature='translate')

- count_quota=True: kiểm tra còn token hôm nay không (admin không giới hạn); token dùng xong được trừ
- Mọi lần gọi (kể cả lỗi) đều được ghi AIRequest
"""

from dataclasses import dataclass
from datetime import datetime, time, timedelta
from decimal import Decimal

import requests
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone

from users.permissions import is_admin

from .models import AIRequest, AISettings, ModelPrice, UserAIQuota

MILLION = Decimal(1_000_000)


class AIError(Exception):
    status_code = 502


class AIUnavailable(AIError):
    status_code = 503


class QuotaExceeded(AIError):
    status_code = 429


# ------------------------------------------------------------
# Hạn mức
# ------------------------------------------------------------

def day_start(now: datetime | None = None) -> datetime:
    now = timezone.localtime(now or timezone.now())
    return timezone.make_aware(datetime.combine(now.date(), time.min), now.tzinfo)


@dataclass
class QuotaStatus:
    unlimited: bool
    limit: int
    used: int
    resets_at: datetime

    @property
    def remaining(self) -> int:
        return max(0, self.limit - self.used)

    @property
    def exhausted(self) -> bool:
        return not self.unlimited and self.used >= self.limit

    def as_dict(self) -> dict:
        return {
            'unlimited': self.unlimited, 'limit': self.limit, 'used': self.used,
            'remaining': self.remaining, 'resets_at': self.resets_at,
        }


def daily_limit(user) -> int:
    override = UserAIQuota.objects.filter(user=user).values_list('daily_tokens', flat=True).first()
    return override if override is not None else AISettings.get().default_daily_tokens


def used_today(user) -> int:
    agg = AIRequest.objects.filter(user=user, counted=True, created_at__gte=day_start()).aggregate(
        i=Sum('input_tokens'), o=Sum('output_tokens')
    )
    return (agg['i'] or 0) + (agg['o'] or 0)


def quota_status(user) -> QuotaStatus:
    start = day_start()
    return QuotaStatus(
        unlimited=is_admin(user),
        limit=daily_limit(user),
        used=used_today(user),
        resets_at=start + timedelta(days=1),
    )


# ------------------------------------------------------------
# Chi phí
# ------------------------------------------------------------

def price_table() -> dict[tuple[str, str], ModelPrice]:
    return {(p.provider, p.model): p for p in ModelPrice.objects.all()}


def cost_of(steps: list[dict], prices: dict[tuple[str, str], ModelPrice]) -> Decimal:
    total = Decimal('0')
    for s in steps:
        price = prices.get((s.get('provider', ''), s.get('model', '')))
        if price is None:
            continue
        total += Decimal(int(s.get('input_tokens') or 0)) * price.input_per_million / MILLION
        if s.get('kind') == 'chat':
            total += Decimal(int(s.get('output_tokens') or 0)) * price.output_per_million / MILLION
    return total.quantize(Decimal('0.000001'))


def summarize(steps: list[dict]) -> dict:
    chats = [s for s in steps if s.get('kind') == 'chat']
    return {
        'input_tokens': sum(int(s.get('input_tokens') or 0) for s in chats),
        'output_tokens': sum(int(s.get('output_tokens') or 0) for s in chats),
        'embed_tokens': sum(int(s.get('input_tokens') or 0) for s in steps if s.get('kind') == 'embedding'),
        'llm_calls': len(chats),
        'models_used': sorted({f"{s.get('provider')}/{s.get('model')}" for s in steps if s.get('model')}),
    }


# ------------------------------------------------------------
# Ghi nhật ký
# ------------------------------------------------------------

def _user_or_none(user):
    return user if getattr(user, 'is_authenticated', False) else None


def record(user, feature: str, meta: dict | None, *, status: str = AIRequest.Status.OK, counted: bool = True,
           latency_ms: int = 0, error: str = '') -> AIRequest:
    meta = meta or {}
    steps = meta.get('usage') or []
    if status == AIRequest.Status.OK and any(s.get('status') == 'error' for s in steps) and not summarize(steps)['llm_calls']:
        status = AIRequest.Status.ERROR
    return AIRequest.objects.create(
        user=_user_or_none(user),
        feature=feature,
        status=status,
        counted=counted and not is_admin(user),
        cost_usd=cost_of(steps, price_table()),
        latency_ms=latency_ms,
        steps=steps,
        trace_id=meta.get('trace_id') or '',
        trace_url=meta.get('trace_url') or '',
        error=error[:2000],
        **summarize(steps),
    )


def record_cached(user, feature: str) -> AIRequest:
    """Kết quả lấy từ cache của backend: 0 token, vẫn ghi để thống kê tỉ lệ cache."""
    return AIRequest.objects.create(user=_user_or_none(user), feature=feature, status=AIRequest.Status.CACHED, counted=False)


# ------------------------------------------------------------
# Gọi service AI
# ------------------------------------------------------------

def call_ai(path: str, payload: dict, *, user, feature: str, count_quota: bool = True, timeout: int = 120) -> dict:
    if count_quota and not is_admin(user):
        status = quota_status(user)
        if status.exhausted:
            record(user, feature, None, status=AIRequest.Status.QUOTA, counted=False)
            raise QuotaExceeded(
                f'Bạn đã dùng hết {status.limit:,} token AI hôm nay. Hạn mức làm mới lúc 0h.'.replace(',', '.')
            )

    url = settings.AI_SERVICE_URL.rstrip('/') + path
    body = {**payload, 'user_id': str(getattr(user, 'pk', '') or '')}
    started = timezone.now()
    try:
        res = requests.post(url, json=body, headers={'X-Internal-Token': settings.AI_SERVICE_TOKEN}, timeout=timeout)
    except requests.RequestException as exc:
        record(user, feature, None, status=AIRequest.Status.ERROR, counted=False, error=f'Không kết nối được service AI: {exc}')
        raise AIUnavailable('Service AI chưa chạy hoặc không kết nối được.') from exc
    latency = int((timezone.now() - started).total_seconds() * 1000)

    try:
        data = res.json()
    except ValueError:
        data = {}

    if not res.ok:
        detail = data.get('detail') if isinstance(data, dict) else None
        meta = detail.get('meta') if isinstance(detail, dict) else None
        message = (detail.get('message') if isinstance(detail, dict) else detail) or f'Service AI trả lỗi {res.status_code}'
        record(user, feature, meta, status=AIRequest.Status.ERROR, counted=count_quota, latency_ms=latency, error=str(message))
        if res.status_code == 401:
            raise AIUnavailable('Backend và service AI chưa khớp AI_SERVICE_TOKEN.')
        raise (AIUnavailable if res.status_code == 503 else AIError)(str(message))

    record(user, feature, data.get('meta'), counted=count_quota, latency_ms=latency)
    return data


def ai_health() -> dict | None:
    try:
        res = requests.get(settings.AI_SERVICE_URL.rstrip('/') + '/health', timeout=3)
        return res.json() if res.ok else None
    except requests.RequestException:
        return None


# ------------------------------------------------------------
# Gọi service AI dạng stream (Server-Sent Events) — dùng cho gia sư
# ------------------------------------------------------------

def check_quota(user, feature: str):
    if is_admin(user):
        return
    status = quota_status(user)
    if status.exhausted:
        record(user, feature, None, status=AIRequest.Status.QUOTA, counted=False)
        raise QuotaExceeded(f'Bạn đã dùng hết {status.limit:,} token AI hôm nay. Hạn mức làm mới lúc 0h.'.replace(',', '.'))


def open_ai_stream(path: str, payload: dict, *, user, feature: str, count_quota: bool = True, timeout: int = 180):
    """Mở kết nối stream tới service AI. Lỗi trước khi stream bắt đầu -> raise (để trả JSON lỗi)."""
    if count_quota:
        check_quota(user, feature)
    url = settings.AI_SERVICE_URL.rstrip('/') + path
    body = {**payload, 'user_id': str(getattr(user, 'pk', '') or '')}
    try:
        res = requests.post(url, json=body, headers={'X-Internal-Token': settings.AI_SERVICE_TOKEN},
                            stream=True, timeout=(5, timeout))
    except requests.RequestException as exc:
        record(user, feature, None, status=AIRequest.Status.ERROR, counted=False, error=f'Không kết nối được service AI: {exc}')
        raise AIUnavailable('Service AI chưa chạy hoặc không kết nối được.') from exc
    if not res.ok:
        record(user, feature, None, status=AIRequest.Status.ERROR, counted=False, error=f'Service AI trả lỗi {res.status_code}')
        res.close()
        raise (AIUnavailable if res.status_code in (401, 503) else AIError)(f'Service AI trả lỗi {res.status_code}.')
    res.encoding = 'utf-8'
    return res


def iter_sse(res):
    """Đọc luồng SSE -> (event, data dict)."""
    import json

    event, data_lines = 'message', []
    for line in res.iter_lines(decode_unicode=True):
        if line is None:
            continue
        if line == '':
            if data_lines:
                try:
                    yield event, json.loads('\n'.join(data_lines))
                except ValueError:
                    pass
            event, data_lines = 'message', []
        elif line.startswith('event:'):
            event = line[6:].strip()
        elif line.startswith('data:'):
            data_lines.append(line[5:].lstrip())

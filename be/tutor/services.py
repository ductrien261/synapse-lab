"""Chuẩn bị ngữ cảnh cho gia sư + cache câu hỏi lặp lại."""

import hashlib
import re
from datetime import timedelta

from django.utils import timezone

from anatomy.models import AnatomyModel
from core.models import ContentStatus

from .models import AnswerCache, Conversation

CACHE_DAYS = 14
TRACK_LABEL = {'med': 'Y khoa', 'cs': 'Khoa học máy tính'}


def normalize(question: str) -> str:
    q = re.sub(r'\s+', ' ', question.strip().lower())
    return q.rstrip('?.! ')


def cache_key(question: str, model_uid: str, part_index, track: str, variant: str = '') -> str:
    raw = '|'.join([normalize(question), model_uid or '', '' if part_index is None else str(part_index), track or '', variant])
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def cached_answer(key: str) -> AnswerCache | None:
    return AnswerCache.objects.filter(key=key, created_at__gte=timezone.now() - timedelta(days=CACHE_DAYS)).first()


def model_parts(model: AnatomyModel | None) -> list[dict]:
    if model is None:
        return []
    parts = []
    for a in model.annotations.select_related('structure').all():
        s = a.structure
        published = bool(s and s.status == ContentStatus.PUBLISHED)
        parts.append({
            'index': a.index,
            'name_en': (s.name_en if s else '') or a.label,
            'name_vi': s.name_vi if published else '',
        })
    return parts


def history(conversation: Conversation, limit: int = 12) -> list[dict]:
    rows = list(conversation.messages.exclude(status='error').order_by('-created_at')[:limit])
    return [{'role': m.role, 'content': m.content} for m in reversed(rows)]


def learner_context(user, model: AnatomyModel | None = None) -> dict:
    """Chuyên ngành + hồ sơ học tập (trình độ, cách giải thích, chỗ yếu, hiểu nhầm) để gia sư cá nhân hóa."""
    from learner.services import learner_context as profile_context

    return {'track': TRACK_LABEL.get(getattr(user, 'track', '') or '', ''), **profile_context(user, model)}


def cacheable(learner: dict) -> bool:
    """Chỉ dùng chung câu trả lời khi người học chưa có ghi nhận riêng (hiểu nhầm / chỗ yếu)."""
    return not learner.get('notes') and not learner.get('weak') and not learner.get('goals')

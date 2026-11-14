"""Quy tắc nghiệp vụ của bài thực hành: băm nội dung, phát hiện trùng, duyệt đóng góp."""

import hashlib
import json
from difflib import SequenceMatcher

from django.utils import timezone

from .models import Lesson

TITLE_SIMILARITY = 0.9


def normalize_title(title: str) -> str:
    return ' '.join(title.lower().split())


def content_hash(spec: dict) -> str:
    """Băm phần nội dung, bỏ slug, tiêu đề và phụ đề để hai bài giống nhau chỉ khác tên vẫn bị nhận ra."""
    body = {k: v for k, v in spec.items() if k not in ('slug', 'title', 'subtitle')}
    raw = json.dumps(body, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def find_duplicate(spec: dict, *, exclude_id=None, public_only=False) -> Lesson | None:
    """Tìm bài trùng nội dung (cùng băm). `public_only` để so với bài đã công khai."""
    qs = Lesson.objects.alive().filter(content_hash=content_hash(spec))
    if public_only:
        qs = qs.filter(visibility=Lesson.Visibility.PUBLIC)
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return qs.first()


def find_similar_public(lesson: Lesson) -> Lesson | None:
    """Bài công khai có tiêu đề rất giống (tỉ lệ từ 0,9 trở lên). Dùng khi gửi đóng góp."""
    mine = normalize_title(lesson.title)
    for other in Lesson.objects.alive().filter(visibility=Lesson.Visibility.PUBLIC).exclude(pk=lesson.pk).only('id', 'title', 'slug'):
        if SequenceMatcher(None, mine, normalize_title(other.title)).ratio() >= TITLE_SIMILARITY:
            return other
    return None


class SubmitError(Exception):
    pass


def submit_for_review(lesson: Lesson) -> Lesson:
    if lesson.is_deleted:
        raise SubmitError('Bài đã bị xóa.')
    if lesson.visibility != Lesson.Visibility.PRIVATE:
        raise SubmitError('Bài này đã được gửi hoặc đã công khai.')
    dup = find_duplicate(lesson.spec, exclude_id=lesson.pk, public_only=True)
    if dup:
        raise SubmitError(f'Nội dung trùng với bài công khai "{dup.title}".')
    similar = find_similar_public(lesson)
    if similar:
        raise SubmitError(f'Tiêu đề quá giống bài công khai "{similar.title}". Hãy đổi tiêu đề hoặc nội dung.')
    lesson.visibility = Lesson.Visibility.PENDING
    lesson.submitted_at = timezone.now()
    lesson.review_note = ''
    lesson.save(update_fields=['visibility', 'submitted_at', 'review_note', 'updated_at'])
    return lesson


def review(lesson: Lesson, admin_user, *, approve: bool, note: str = '') -> Lesson:
    if lesson.is_deleted or lesson.visibility != Lesson.Visibility.PENDING:
        raise SubmitError('Chỉ duyệt được bài đang chờ duyệt.')
    lesson.visibility = Lesson.Visibility.PUBLIC if approve else Lesson.Visibility.PRIVATE
    lesson.reviewed_by = admin_user
    lesson.reviewed_at = timezone.now()
    lesson.review_note = note
    lesson.save(update_fields=['visibility', 'reviewed_by', 'reviewed_at', 'review_note', 'updated_at'])
    return lesson

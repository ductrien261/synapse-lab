"""Các lớp dùng chung cho mọi app."""

from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ContentStatus(models.TextChoices):
    """Nội dung học (do admin hoặc AI soạn) phải được duyệt trước khi học viên thấy."""

    DRAFT = 'draft', 'Nháp'
    PUBLISHED = 'published', 'Đã duyệt'


class Track(models.TextChoices):
    CS = 'cs', 'Khoa học máy tính'
    MED = 'med', 'Y khoa'

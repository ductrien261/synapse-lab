"""Bài thực hành do người dùng (hoặc AI) tạo, lưu dưới dạng gói JSON (lab package)."""

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel


class LessonQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(is_deleted=False)


class Lesson(TimeStampedModel):
    class Visibility(models.TextChoices):
        PRIVATE = 'private', 'Riêng tư'
        PENDING = 'pending', 'Chờ duyệt'
        PUBLIC = 'public', 'Công khai'

    slug = models.SlugField(max_length=61, unique=True)  # duy nhất cả với bài đã xóa mềm
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=400, blank=True)
    schema_version = models.PositiveSmallIntegerField(default=1)
    spec = models.JSONField()  # toàn bộ gói bài đã kiểm tra
    content_hash = models.CharField(max_length=64, db_index=True)  # băm nội dung đã chuẩn hóa, để phát hiện trùng
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='lab_lessons')

    visibility = models.CharField(max_length=10, choices=Visibility.choices, default=Visibility.PRIVATE, db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)

    # Xóa mềm: không bao giờ xóa hẳn dòng
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    objects = LessonQuerySet.as_manager()

    class Meta:
        db_table = 'lab_lesson'
        ordering = ['-updated_at']
        verbose_name = 'Bài thực hành'
        verbose_name_plural = 'Bài thực hành'
        indexes = [models.Index(fields=['visibility', 'is_deleted'])]

    def __str__(self):
        return f'{self.title} ({self.slug})'

    def soft_delete(self, user):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        # Bài đã xóa không còn nằm trong hàng chờ hay công khai
        self.visibility = self.Visibility.PRIVATE
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'visibility', 'updated_at'])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])

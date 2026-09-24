"""Lịch sử học của người dùng (thay cho localStorage ở frontend)."""

from django.conf import settings
from django.db import models

from core.models import Track


class LearningActivity(models.Model):
    """Mỗi (người dùng, bài học) một dòng; mở lại thì tăng visit_count."""

    class Kind(models.TextChoices):
        ALGORITHM = 'algorithm', 'Thuật toán'
        ANATOMY_MODEL = 'anatomy_model', 'Mô hình giải phẫu'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activities')
    track = models.CharField(max_length=10, choices=Track.choices)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    object_key = models.CharField('Mã bài học', max_length=255, help_text='vd. backtracking/n-queens hoặc mã Sketchfab')
    href = models.CharField(max_length=500)
    title = models.CharField(max_length=300)
    subtitle = models.CharField(max_length=300, blank=True)
    group = models.CharField('Nhóm (để gợi ý)', max_length=100, blank=True)

    visit_count = models.PositiveIntegerField(default=1)
    first_visited_at = models.DateTimeField(auto_now_add=True)
    last_visited_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ['-last_visited_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'kind', 'object_key'], name='uniq_activity_per_user_object'),
        ]
        verbose_name = 'Hoạt động học'
        verbose_name_plural = 'Hoạt động học'

    def __str__(self):
        return f'{self.user} · {self.title}'


class StudyDay(models.Model):
    """Ngày người dùng có học — dùng tính chuỗi ngày học và mục tiêu tuần."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_days')
    date = models.DateField()

    class Meta:
        ordering = ['-date']
        constraints = [models.UniqueConstraint(fields=['user', 'date'], name='uniq_study_day')]
        verbose_name = 'Ngày học'
        verbose_name_plural = 'Ngày học'


class StudyNote(models.Model):
    """Ghi chú riêng của học viên cho một bài học (hoặc một bộ phận trong mô hình)."""

    WHOLE = -1  # part_index = -1: ghi chú cho cả bài / cả mô hình

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notes')
    kind = models.CharField(max_length=20, choices=LearningActivity.Kind.choices)
    object_key = models.CharField(max_length=255)
    part_index = models.SmallIntegerField(default=WHOLE)
    content = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['part_index']
        constraints = [
            models.UniqueConstraint(fields=['user', 'kind', 'object_key', 'part_index'], name='uniq_note_per_part'),
        ]
        verbose_name = 'Ghi chú'
        verbose_name_plural = 'Ghi chú'

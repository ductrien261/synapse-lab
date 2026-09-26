"""Góp ý của người dùng (nút Góp ý ở mọi trang)."""

from django.conf import settings
from django.db import models


class Feedback(models.Model):
    class Kind(models.TextChoices):
        BUG = 'bug', 'Báo lỗi'
        CONTENT = 'content', 'Nội dung chưa đúng'
        IDEA = 'idea', 'Đề xuất'
        OTHER = 'other', 'Khác'

    class Status(models.TextChoices):
        NEW = 'new', 'Mới'
        IN_PROGRESS = 'in_progress', 'Đang xử lý'
        DONE = 'done', 'Đã xử lý'
        DISMISSED = 'dismissed', 'Bỏ qua'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    email = models.EmailField(blank=True)  # khách để lại nếu muốn được phản hồi
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.OTHER)
    message = models.TextField()
    page_url = models.CharField(max_length=500, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW, db_index=True)
    admin_note = models.TextField(blank=True)
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Góp ý'
        verbose_name_plural = 'Góp ý'

    def __str__(self):
        return f'{self.get_kind_display()}: {self.message[:60]}'

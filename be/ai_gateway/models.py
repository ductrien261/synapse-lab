"""
Cổng AI phía backend: mọi lần gọi service AI đều đi qua đây để
- kiểm tra hạn mức token/ngày của người dùng
- ghi nhật ký (token vào/ra, độ trễ, trace Langfuse)
- tính chi phí theo bảng giá model
"""

from decimal import Decimal

from django.conf import settings
from django.db import models


class AISettings(models.Model):
    """Cài đặt chung (chỉ 1 dòng)."""

    default_daily_tokens = models.PositiveIntegerField('Hạn mức mặc định (token/ngày)', default=50_000)
    llm_judge_enabled = models.BooleanField('Bật "AI chấm lại" khi kiểm chứng', default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cài đặt AI'
        verbose_name_plural = 'Cài đặt AI'

    def __str__(self):
        return 'Cài đặt AI'

    @classmethod
    def get(cls) -> 'AISettings':
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ModelPrice(models.Model):
    """Giá model (USD / 1 triệu token). Admin tự nhập theo bảng giá nhà cung cấp."""

    provider = models.CharField(max_length=50)
    model = models.CharField(max_length=150)
    input_per_million = models.DecimalField(max_digits=10, decimal_places=4, default=Decimal('0'))
    output_per_million = models.DecimalField(max_digits=10, decimal_places=4, default=Decimal('0'))
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['provider', 'model']
        constraints = [models.UniqueConstraint(fields=['provider', 'model'], name='uniq_model_price')]
        verbose_name = 'Giá model'
        verbose_name_plural = 'Giá model'

    def __str__(self):
        return f'{self.provider}/{self.model}'


class UserAIQuota(models.Model):
    """Hạn mức riêng cho 1 người (ghi đè mặc định). daily_tokens = None -> dùng mặc định."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_quota')
    daily_tokens = models.PositiveIntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Hạn mức AI riêng'
        verbose_name_plural = 'Hạn mức AI riêng'


class AIRequest(models.Model):
    """1 lượt dùng AI (có thể gồm nhiều lần gọi model — xem `steps`)."""

    class Status(models.TextChoices):
        OK = 'ok', 'Thành công'
        CACHED = 'cached', 'Lấy từ cache'
        ERROR = 'error', 'Lỗi'
        QUOTA = 'quota', 'Hết hạn mức'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='ai_requests')
    feature = models.CharField(max_length=30, db_index=True)  # translate | search | draft | tutor | quiz ...
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OK, db_index=True)
    counted = models.BooleanField(default=True)  # có trừ vào hạn mức người dùng không

    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    embed_tokens = models.PositiveIntegerField(default=0)
    llm_calls = models.PositiveSmallIntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=12, decimal_places=6, default=Decimal('0'))
    latency_ms = models.PositiveIntegerField(default=0)
    models_used = models.JSONField(default=list, blank=True)
    steps = models.JSONField(default=list, blank=True)  # chi tiết từng lần gọi model (từ service AI)

    trace_id = models.CharField(max_length=64, blank=True)
    trace_url = models.URLField(max_length=500, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'created_at'], name='ai_req_user_time')]
        verbose_name = 'Lượt dùng AI'
        verbose_name_plural = 'Lượt dùng AI'

    def __str__(self):
        return f'{self.feature} · {self.status} · {self.total_tokens} token'

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens

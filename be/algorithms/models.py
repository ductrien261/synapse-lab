"""
Thuật toán.

Algo-server tạo mô phỏng từ mã nguồn; backend lưu các ví dụ đã biên soạn để phát lại.
Backend lưu danh mục (đồng bộ từ algo-server) và phần GIẢI THÍCH do admin/AI soạn,
khóa theo (category_key, algorithm_key) giống đường dẫn /algorithms/<category>/<algo>.
"""

import uuid

from django.conf import settings
from django.db import models

from core.models import ContentStatus, TimeStampedModel


class AlgorithmCategory(models.Model):
    key = models.SlugField('Mã nhóm (từ algo-server)', max_length=100, unique=True)
    name_en = models.CharField(max_length=100)
    name_vi = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name_en']
        verbose_name = 'Nhóm thuật toán'
        verbose_name_plural = 'Nhóm thuật toán'

    def __str__(self):
        return self.name_vi or self.name_en


class Algorithm(models.Model):
    category = models.ForeignKey(AlgorithmCategory, on_delete=models.CASCADE, related_name='algorithms')
    key = models.SlugField('Mã thuật toán (từ algo-server)', max_length=150)
    name = models.CharField(max_length=200)
    is_published = models.BooleanField('Hiện với học viên', default=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['category', 'name']
        constraints = [models.UniqueConstraint(fields=['category', 'key'], name='uniq_algorithm_key_per_category')]
        verbose_name = 'Thuật toán'
        verbose_name_plural = 'Thuật toán'

    def __str__(self):
        return self.name

    @property
    def path(self) -> str:
        return f'{self.category.key}/{self.key}'


class AlgorithmContent(TimeStampedModel):
    """Phần giải thích hiển thị cạnh mô phỏng."""

    algorithm = models.OneToOneField(Algorithm, on_delete=models.CASCADE, related_name='content')
    summary = models.TextField('Tóm tắt', blank=True)
    lesson_fields = models.JSONField('Nội dung bài học', default=dict, blank=True)
    lesson_blocks = models.JSONField('Nội dung có cấu trúc', default=list, blank=True)
    code_lesson = models.JSONField('Hướng dẫn viết code', default=dict, blank=True)
    application_scenarios = models.JSONField('Tình huống ứng dụng', default=list, blank=True)
    simulation = models.JSONField('Các ví dụ mô phỏng đã biên soạn', default=dict, blank=True)
    theory = models.TextField('Lý thuyết (Markdown)', blank=True)
    time_best = models.CharField('Thời gian - tốt nhất', max_length=50, blank=True)
    time_average = models.CharField('Thời gian - trung bình', max_length=50, blank=True)
    time_worst = models.CharField('Thời gian - xấu nhất', max_length=50, blank=True)
    space = models.CharField('Bộ nhớ', max_length=50, blank=True)
    applications = models.JSONField('Ứng dụng thực tế', default=list, blank=True)

    status = models.CharField(max_length=20, choices=ContentStatus.choices, default=ContentStatus.DRAFT, db_index=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        verbose_name = 'Nội dung thuật toán'
        verbose_name_plural = 'Nội dung thuật toán'

    def __str__(self):
        return f'Nội dung: {self.algorithm}'


class AlgorithmReference(models.Model):
    algorithm = models.ForeignKey(Algorithm, on_delete=models.CASCADE, related_name='references')
    document = models.ForeignKey('knowledge.Document', on_delete=models.CASCADE, related_name='algorithm_references')
    chunk = models.ForeignKey('knowledge.DocumentChunk', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    page_start = models.PositiveIntegerField(null=True, blank=True)
    page_end = models.PositiveIntegerField(null=True, blank=True)
    excerpt = models.TextField(blank=True)

    class Meta:
        ordering = ['algorithm', 'page_start']
        verbose_name = 'Trích dẫn giáo trình'
        verbose_name_plural = 'Trích dẫn giáo trình'


class AlgorithmSource(TimeStampedModel):
    """Nguồn được phép dùng để đề xuất nội dung thuật toán."""

    class Kind(models.TextChoices):
        DOCUMENT = 'document', 'Tài liệu trong kho'
        URL = 'url', 'Trang web được duyệt'

    name = models.CharField(max_length=300)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    document = models.OneToOneField(
        'knowledge.Document', null=True, blank=True, on_delete=models.CASCADE,
        related_name='algorithm_source',
    )
    url = models.URLField(max_length=600, blank=True)
    allowed_domain = models.CharField(max_length=253, blank=True)
    license_name = models.CharField(max_length=200, blank=True)
    enabled = models.BooleanField(default=True, db_index=True)
    priority = models.PositiveSmallIntegerField(default=100)

    class Meta:
        ordering = ['priority', 'name']
        constraints = [
            models.CheckConstraint(
                condition=(
                    (models.Q(kind='document', document__isnull=False) & models.Q(url='') & models.Q(allowed_domain=''))
                    | (models.Q(kind='url', document__isnull=True) & ~models.Q(url='') & ~models.Q(allowed_domain=''))
                ),
                name='algorithm_source_has_backing_data',
            ),
        ]
        verbose_name = 'Nguồn thuật toán'
        verbose_name_plural = 'Nguồn thuật toán'

    def __str__(self):
        return self.name


class AlgorithmScanJob(TimeStampedModel):
    class Status(models.TextChoices):
        QUEUED = 'queued', 'Chờ chạy'
        RUNNING = 'running', 'Đang chạy'
        DONE = 'done', 'Hoàn tất'
        FAILED = 'failed', 'Lỗi'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED, db_index=True)
    params = models.JSONField(default=dict, blank=True)
    total = models.PositiveIntegerField(default=0)
    processed = models.PositiveIntegerField(default=0)
    succeeded = models.PositiveIntegerField(default=0)
    failed = models.PositiveIntegerField(default=0)
    log = models.JSONField(default=list, blank=True)
    error = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Lượt quét nội dung thuật toán'
        verbose_name_plural = 'Lượt quét nội dung thuật toán'


class AlgorithmDraftCandidate(TimeStampedModel):
    """Đề xuất có nguồn; chỉ được ghi vào bài học sau khi admin áp dụng."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Chờ duyệt'
        APPLIED = 'applied', 'Đã áp dụng'
        DISCARDED = 'discarded', 'Đã bỏ'
        NO_SOURCE = 'no_source', 'Không đủ nguồn'
        FAILED = 'failed', 'Lỗi'

    algorithm = models.ForeignKey(Algorithm, on_delete=models.CASCADE, related_name='draft_candidates')
    job = models.ForeignKey(AlgorithmScanJob, null=True, blank=True, on_delete=models.SET_NULL, related_name='candidates')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    fields = models.JSONField(default=dict, blank=True)
    citations = models.JSONField(default=list, blank=True)
    source_ids = models.JSONField(default=list, blank=True)
    query = models.CharField(max_length=500, blank=True)
    prompt_version = models.CharField(max_length=50, blank=True)
    warnings = models.JSONField(default=list, blank=True)
    error = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Đề xuất bài học thuật toán'
        verbose_name_plural = 'Đề xuất bài học thuật toán'

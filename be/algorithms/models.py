"""
Thuật toán.

Mã nguồn và dữ liệu mô phỏng nằm ở algo-server (packages/algo-viz, bạn A).
Backend chỉ lưu danh mục (đồng bộ từ algo-server) và phần GIẢI THÍCH do admin/AI soạn,
khóa theo (category_key, algorithm_key) giống đường dẫn /algorithms/<category>/<algo>.
"""

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

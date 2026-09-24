"""
Giải phẫu 3D.

    BodySystem (hệ cơ quan)
      └─ AnatomyModel (1 mô hình Sketchfab)
           └─ ModelAnnotation (chú thích số (1), (2)... trên mô hình)
                └─ Structure (cấu trúc giải phẫu: "Tâm thất trái")  ← nội dung kiến thức nằm ở đây
                     └─ StructureReference (trích dẫn giáo trình kèm số trang)

Tách Structure khỏi ModelAnnotation vì cùng một cấu trúc (ví dụ tâm thất trái) xuất hiện
trong nhiều mô hình: soạn kiến thức 1 lần, mọi mô hình dùng chung.
"""

import uuid

from django.conf import settings
from django.db import models

from core.models import ContentStatus, TimeStampedModel


class BodySystem(models.Model):
    slug = models.SlugField(unique=True)
    name_vi = models.CharField('Tên tiếng Việt', max_length=100)
    name_en = models.CharField('Tên tiếng Anh', max_length=100)
    description = models.TextField(blank=True)
    color = models.CharField('Màu (hex)', max_length=7, default='#1E3F82')
    order = models.PositiveSmallIntegerField(default=0)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'name_vi']
        verbose_name = 'Hệ cơ quan'
        verbose_name_plural = 'Hệ cơ quan'

    def __str__(self):
        return self.name_vi


class Structure(TimeStampedModel):
    """Cấu trúc giải phẫu chuẩn (thuật ngữ), mang nội dung kiến thức."""

    name_en = models.CharField('Tên tiếng Anh', max_length=200, unique=True)
    name_vi = models.CharField('Tên tiếng Việt', max_length=200, blank=True)
    latin_name = models.CharField('Tên Latin (TA)', max_length=200, blank=True)
    system = models.ForeignKey(BodySystem, null=True, blank=True, on_delete=models.SET_NULL, related_name='structures')

    definition = models.TextField('Định nghĩa / mô tả', blank=True)
    function = models.TextField('Chức năng / sinh lý', blank=True)
    clinical_note = models.TextField('Liên hệ lâm sàng', blank=True)

    status = models.CharField(max_length=20, choices=ContentStatus.choices, default=ContentStatus.DRAFT, db_index=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        ordering = ['name_vi', 'name_en']
        verbose_name = 'Cấu trúc giải phẫu'
        verbose_name_plural = 'Cấu trúc giải phẫu'

    def __str__(self):
        return self.name_vi or self.name_en


class AnatomyModel(TimeStampedModel):
    """Một mô hình 3D trên Sketchfab."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sketchfab_uid = models.CharField('Mã Sketchfab', max_length=32, unique=True)
    system = models.ForeignKey(BodySystem, null=True, blank=True, on_delete=models.SET_NULL, related_name='models')

    title = models.CharField('Tên gốc', max_length=300)
    title_vi = models.CharField('Tên tiếng Việt', max_length=300, blank=True)
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)

    # Ghi công tác giả (giấy phép Creative Commons bắt buộc)
    author_name = models.CharField(max_length=200, blank=True)
    author_url = models.URLField(blank=True)
    license_label = models.CharField(max_length=200, blank=True)
    license_url = models.URLField(blank=True)

    thumbnail_url = models.URLField(max_length=500, blank=True)
    source_url = models.URLField('Trang nguồn (vd. anatomytool.org)', max_length=500, blank=True)

    is_published = models.BooleanField(default=False, db_index=True)
    order = models.PositiveSmallIntegerField(default=0)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        ordering = ['order', 'title']
        verbose_name = 'Mô hình 3D'
        verbose_name_plural = 'Mô hình 3D'

    def __str__(self):
        return self.title_vi or self.title

    @property
    def embed_url(self) -> str:
        return f'https://sketchfab.com/models/{self.sketchfab_uid}/embed'

    @property
    def sketchfab_url(self) -> str:
        return f'https://sketchfab.com/3d-models/{self.sketchfab_uid}'


class ModelAnnotation(models.Model):
    """Chú thích (1), (2)... trên mô hình. index bắt đầu từ 0, trùng với Sketchfab Viewer API."""

    model = models.ForeignKey(AnatomyModel, on_delete=models.CASCADE, related_name='annotations')
    index = models.PositiveSmallIntegerField()
    label = models.CharField('Tên trên Sketchfab', max_length=300)
    raw_content = models.TextField('Nội dung gốc trên Sketchfab', blank=True)
    structure = models.ForeignKey(Structure, null=True, blank=True, on_delete=models.SET_NULL, related_name='annotations')

    class Meta:
        ordering = ['model', 'index']
        constraints = [models.UniqueConstraint(fields=['model', 'index'], name='uniq_annotation_index_per_model')]
        verbose_name = 'Chú thích mô hình'
        verbose_name_plural = 'Chú thích mô hình'

    def __str__(self):
        return f'({self.index + 1}) {self.label}'


class StructureReference(models.Model):
    """Trích dẫn giáo trình cho một cấu trúc, kèm số trang."""

    structure = models.ForeignKey(Structure, on_delete=models.CASCADE, related_name='references')
    document = models.ForeignKey('knowledge.Document', on_delete=models.CASCADE, related_name='anatomy_references')
    chunk = models.ForeignKey('knowledge.DocumentChunk', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    page_start = models.PositiveIntegerField(null=True, blank=True)
    page_end = models.PositiveIntegerField(null=True, blank=True)
    excerpt = models.TextField('Đoạn trích', blank=True)

    class Meta:
        ordering = ['structure', 'page_start']
        verbose_name = 'Trích dẫn giáo trình'
        verbose_name_plural = 'Trích dẫn giáo trình'

    def __str__(self):
        return f'{self.structure} → {self.document} tr.{self.page_start or "?"}'

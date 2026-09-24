"""
Kho tri thức: giáo trình / tài liệu do admin upload, được chia thành đoạn (chunk)
và tạo vector để AI tra cứu, trích dẫn kèm số trang.
"""

import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from pgvector.django import HnswIndex, VectorField

from core.models import TimeStampedModel

EMBEDDING_DIMENSIONS = 768  # Gemini embedding, output_dimensionality=768


def document_upload_path(instance: 'Document', filename: str) -> str:
    return f'documents/{instance.id}{Path(filename).suffix.lower()}'


class Document(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Chờ xử lý'
        PROCESSING = 'processing', 'Đang xử lý'
        READY = 'ready', 'Sẵn sàng'
        FAILED = 'failed', 'Lỗi'

    class Scope(models.TextChoices):
        CS = 'cs', 'Khoa học máy tính'
        MED = 'med', 'Y khoa'
        GENERAL = 'general', 'Chung'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Thông tin nguồn (để trích dẫn)
    title = models.CharField('Tên tài liệu', max_length=300)
    authors = models.CharField('Tác giả', max_length=300, blank=True)
    publisher = models.CharField('Nhà xuất bản', max_length=200, blank=True)
    year = models.PositiveSmallIntegerField('Năm', null=True, blank=True)
    edition = models.CharField('Lần xuất bản', max_length=50, blank=True)
    language = models.CharField('Ngôn ngữ', max_length=10, default='vi')
    scope = models.CharField('Chuyên ngành', max_length=10, choices=Scope.choices, default=Scope.GENERAL)

    # File
    file = models.FileField(upload_to=document_upload_path)
    original_filename = models.CharField(max_length=255, blank=True)
    file_size = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)
    page_count = models.PositiveIntegerField(null=True, blank=True)

    # Xử lý (Docling -> chunk -> embedding)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    error_message = models.TextField(blank=True)
    chunk_count = models.PositiveIntegerField(default=0)
    processed_at = models.DateTimeField(null=True, blank=True)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='documents'
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Tài liệu'
        verbose_name_plural = 'Tài liệu'

    def __str__(self):
        return self.title

    @property
    def citation(self) -> str:
        """Ví dụ: 'Giải phẫu người – Trịnh Văn Minh (2019)'"""
        parts = [self.title]
        if self.authors:
            parts.append(f'– {self.authors}')
        if self.year:
            parts.append(f'({self.year})')
        return ' '.join(parts)


class DocumentChunk(models.Model):
    """Một đoạn văn bản của tài liệu, kèm vị trí trang để trích dẫn."""

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    index = models.PositiveIntegerField('Thứ tự trong tài liệu')
    heading = models.CharField('Mục / chương', max_length=500, blank=True)
    content = models.TextField()
    page_start = models.PositiveIntegerField(null=True, blank=True)
    page_end = models.PositiveIntegerField(null=True, blank=True)
    token_count = models.PositiveIntegerField(default=0)
    embedding = VectorField(dimensions=EMBEDDING_DIMENSIONS, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['document', 'index']
        constraints = [models.UniqueConstraint(fields=['document', 'index'], name='uniq_chunk_index_per_document')]
        indexes = [
            HnswIndex(
                name='chunk_embedding_hnsw',
                fields=['embedding'],
                m=16,
                ef_construction=64,
                opclasses=['vector_cosine_ops'],
            )
        ]
        verbose_name = 'Đoạn tài liệu'
        verbose_name_plural = 'Đoạn tài liệu'

    def __str__(self):
        return f'{self.document.title} #{self.index}'

    @property
    def page_label(self) -> str:
        if self.page_start is None:
            return ''
        if self.page_end and self.page_end != self.page_start:
            return f'tr. {self.page_start}–{self.page_end}'
        return f'tr. {self.page_start}'

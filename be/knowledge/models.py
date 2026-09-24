"""
Kho tri thức: giáo trình / tài liệu làm nguồn cho AI.
- Nguồn OpenStax: crawl trang sách (HTML) theo chương admin chọn, trích dẫn bằng link có neo
- Nguồn PDF: admin tải file lên, trích dẫn bằng số trang
Mỗi tài liệu được chia thành đoạn (chunk) theo cấu trúc tiêu đề, có vector (pgvector)
và chỉ mục từ khóa (Postgres full-text) để tìm kiếm lai (hybrid).
"""

import uuid
from pathlib import Path

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
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

    class SourceType(models.TextChoices):
        OPENSTAX = 'openstax', 'Sách OpenStax'
        PDF = 'pdf', 'File PDF'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_type = models.CharField('Loại nguồn', max_length=20, choices=SourceType.choices, default=SourceType.PDF)
    source_key = models.CharField('Mã nguồn', max_length=200, blank=True, db_index=True)  # vd. slug sách OpenStax
    source_url = models.URLField('Link nguồn', max_length=500, blank=True)
    license_name = models.CharField('Giấy phép', max_length=200, blank=True)
    license_url = models.URLField(max_length=300, blank=True)
    meta = models.JSONField(default=dict, blank=True)  # OpenStax: {'toc': [...]} để chọn thêm chương

    # Thông tin nguồn (để trích dẫn)
    title = models.CharField('Tên tài liệu', max_length=300)
    authors = models.CharField('Tác giả', max_length=300, blank=True)
    publisher = models.CharField('Nhà xuất bản', max_length=200, blank=True)
    year = models.PositiveSmallIntegerField('Năm', null=True, blank=True)
    edition = models.CharField('Lần xuất bản', max_length=50, blank=True)
    language = models.CharField('Ngôn ngữ', max_length=10, default='vi')
    scope = models.CharField('Chuyên ngành', max_length=10, choices=Scope.choices, default=Scope.GENERAL)

    # File
    file = models.FileField(upload_to=document_upload_path, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    file_size = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)
    page_count = models.PositiveIntegerField(null=True, blank=True)

    # Xử lý (đọc -> chia đoạn -> embedding)
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
    """Một đoạn văn bản của tài liệu, kèm vị trí (link neo hoặc số trang) để trích dẫn."""

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    index = models.PositiveIntegerField('Thứ tự trong tài liệu')
    # Trang nguồn: OpenStax = slug trang sách (vd. 19-1-heart-anatomy); PDF = 'pdf'
    section_key = models.CharField(max_length=200, blank=True, db_index=True)
    section_title = models.CharField(max_length=300, blank=True)
    heading = models.CharField('Đường dẫn tiêu đề', max_length=500, blank=True)  # Chương › Bài › Mục
    url = models.URLField('Link trích dẫn', max_length=600, blank=True)
    content = models.TextField()
    page_start = models.PositiveIntegerField(null=True, blank=True)
    page_end = models.PositiveIntegerField(null=True, blank=True)
    token_count = models.PositiveIntegerField(default=0)
    embedding = VectorField(dimensions=EMBEDDING_DIMENSIONS, null=True, blank=True)
    search_vector = SearchVectorField(null=True, blank=True)  # tìm theo từ khóa (thay BM25)
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
            ),
            GinIndex(name='chunk_search_gin', fields=['search_vector']),
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


class IngestJob(models.Model):
    """Một lượt nạp tài liệu chạy nền; trang admin hỏi định kỳ để hiện tiến độ."""

    class Kind(models.TextChoices):
        OPENSTAX = 'openstax', 'Nạp sách OpenStax'
        PDF = 'pdf', 'Nạp file PDF'

    class Status(models.TextChoices):
        QUEUED = 'queued', 'Chờ chạy'
        RUNNING = 'running', 'Đang chạy'
        DONE = 'done', 'Hoàn tất'
        FAILED = 'failed', 'Lỗi'
        CANCELLED = 'cancelled', 'Đã dừng'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED, db_index=True)
    document = models.ForeignKey(Document, null=True, blank=True, on_delete=models.SET_NULL, related_name='jobs')
    params = models.JSONField(default=dict, blank=True)

    total = models.PositiveIntegerField(default=0)
    processed = models.PositiveIntegerField(default=0)
    created_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    log = models.JSONField(default=list, blank=True)
    cancel_requested = models.BooleanField(default=False)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Lượt nạp tài liệu'
        verbose_name_plural = 'Lượt nạp tài liệu'

    def __str__(self):
        return f'{self.get_kind_display()} · {self.get_status_display()}'

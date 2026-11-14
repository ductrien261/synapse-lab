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


class Generation(TimeStampedModel):
    """Một lần AI sinh bài từ yêu cầu của người dùng. Ghi lại sau mỗi bước để xem tiến trình và chạy tiếp được."""

    class Status(models.TextChoices):
        QUEUED = 'queued', 'Đang chờ'
        RUNNING = 'running', 'Đang chạy'
        SUCCEEDED = 'succeeded', 'Đã tạo bài'
        STOPPED = 'stopped', 'Dừng sớm'  # thiếu mẫu, thiếu linh kiện hoặc không an toàn
        NEEDS_WORK = 'needs_work', 'Chưa đạt'  # hết vòng sửa hoặc hết ngân sách
        FAILED = 'failed', 'Lỗi'
        CANCELLED = 'cancelled', 'Đã hủy'

    ACTIVE = (Status.QUEUED, Status.RUNNING)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='lab_generations')
    request = models.CharField(max_length=500)
    request_hash = models.CharField(max_length=64, db_index=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.QUEUED, db_index=True)
    steps = models.JSONField(default=list)  # nhật ký từng bước (khóa, trạng thái, tóm tắt, token)
    state = models.JSONField(default=dict)  # kết quả trung gian: kế hoạch, linh kiện, nội dung, gói bài đang ghép
    stage = models.CharField(max_length=20, blank=True)  # bước logic sẽ chạy tiếp (để tiếp tục sau khi bị bỏ dở)
    repair_rounds = models.PositiveSmallIntegerField(default=0)
    tokens_used = models.PositiveIntegerField(default=0)
    message = models.TextField(blank=True)  # lý do khi dừng, chưa đạt hoặc lỗi
    errors = models.JSONField(default=list)  # lỗi còn lại khi chưa đạt
    lesson = models.ForeignKey(Lesson, null=True, blank=True, on_delete=models.SET_NULL, related_name='generations')
    heartbeat_at = models.DateTimeField(null=True, blank=True)
    cancel_requested = models.BooleanField(default=False)

    class Meta:
        db_table = 'lab_generation'
        ordering = ['-created_at']
        verbose_name = 'Lần sinh bài'
        verbose_name_plural = 'Lần sinh bài'

    def __str__(self):
        return f'#{self.pk} {self.request[:50]} ({self.status})'

    @property
    def is_active(self) -> bool:
        return self.status in self.ACTIVE

"""
Lớp học — PHẦN CỦA BẠN B.

Đây chỉ là khung tối thiểu theo quy ước chung (người tạo lớp = chủ lớp, người tham gia = thành viên).
B cứ thoải mái sửa / thêm model (bài tập, phiên học, câu hỏi...).
"""

import secrets
import string
import uuid

from django.conf import settings
from django.db import models

from core.models import TimeStampedModel, Track

CODE_ALPHABET = string.ascii_uppercase + string.digits


def generate_class_code(length: int = 6) -> str:
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def lesson_resource_upload_path(instance, filename: str) -> str:
    return f'classrooms/{instance.section.plan.classroom.code}/lesson-resources/{instance.id}/{filename}'


def lesson_resource_preview_pdf_path(instance, filename: str) -> str:
    return f'classrooms/{instance.section.plan.classroom.code}/lesson-resources/{instance.id}/preview/{filename}'


class Classroom(TimeStampedModel):
    class Purpose(models.TextChoices):
        STUDY = 'study', 'Tự học tập trung'
        GROUP = 'group', 'Học nhóm'
        PRESENTATION = 'presentation', 'Mock presentation'
        TEACHING = 'teaching', 'Buổi hướng dẫn'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    code = models.CharField('Mã tham gia', max_length=8, unique=True, default=generate_class_code)
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.GROUP)
    track = models.CharField(max_length=10, choices=Track.choices, null=True, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_classrooms')
    is_archived = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Lớp học'
        verbose_name_plural = 'Lớp học'

    def __str__(self):
        return f'{self.name} ({self.code})'


class ClassMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = 'owner', 'Chủ lớp'
        MEMBER = 'member', 'Thành viên'

    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='class_memberships')
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['classroom', '-role', 'joined_at']
        constraints = [models.UniqueConstraint(fields=['classroom', 'user'], name='uniq_class_member')]
        verbose_name = 'Thành viên lớp'
        verbose_name_plural = 'Thành viên lớp'


class LiveSession(TimeStampedModel):
    class Status(models.TextChoices):
        LIVE = 'live', 'Đang diễn ra'
        ENDED = 'ended', 'Đã kết thúc'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='sessions')
    title = models.CharField(max_length=200)
    bbb_meeting_id = models.CharField(max_length=100, unique=True, editable=False)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.LIVE)
    record = models.BooleanField(default=False)
    participant_count = models.PositiveIntegerField(default=0)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_live_sessions',
    )

    class Meta:
        ordering = ['-started_at']
        constraints = [
            models.UniqueConstraint(
                fields=['classroom'],
                condition=models.Q(status='live'),
                name='uniq_live_session_per_classroom',
            ),
        ]
        verbose_name = 'Phiên học trực tiếp'
        verbose_name_plural = 'Phiên học trực tiếp'

    def __str__(self):
        return f'{self.classroom.code}: {self.title}'


class SessionAttendance(models.Model):
    session = models.ForeignKey(LiveSession, on_delete=models.CASCADE, related_name='attendances')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_attendances')
    joined_at = models.DateTimeField(auto_now_add=True)
    last_joined_at = models.DateTimeField(auto_now=True)
    left_at = models.DateTimeField(null=True, blank=True)
    join_count = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['session', 'user'], name='uniq_session_attendance'),
        ]
        ordering = ['joined_at']
        verbose_name = 'Lượt tham gia phiên học'
        verbose_name_plural = 'Lượt tham gia phiên học'


class LessonPlan(TimeStampedModel):
    class Subject(models.TextChoices):
        ANATOMY = 'anatomy', 'Giải phẫu'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    classroom = models.OneToOneField(Classroom, on_delete=models.CASCADE, related_name='lesson_plan')
    subject = models.CharField(max_length=30, choices=Subject.choices, default=Subject.ANATOMY)
    title = models.CharField(max_length=250)
    objective = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Kế hoạch bài dạy'
        verbose_name_plural = 'Kế hoạch bài dạy'

    def __str__(self):
        return f'{self.classroom.code}: {self.title}'


class LessonSection(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(LessonPlan, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=250)
    objective = models.TextField(blank=True)
    teacher_notes = models.TextField(blank=True)
    duration_minutes = models.PositiveSmallIntegerField(default=10)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position', 'created_at']
        verbose_name = 'Phần bài dạy'
        verbose_name_plural = 'Phần bài dạy'

    def __str__(self):
        return self.title


class LessonResource(TimeStampedModel):
    class PreviewStatus(models.TextChoices):
        NONE = 'none', 'Không cần xử lý'
        PROCESSING = 'processing', 'Đang xử lý'
        READY = 'ready', 'Sẵn sàng'
        FAILED = 'failed', 'Xử lý thất bại'

    class Kind(models.TextChoices):
        SLIDE = 'slide', 'Slide'
        PDF = 'pdf', 'PDF'
        DOC = 'doc', 'Tài liệu'
        MODEL_3D = 'model_3d', 'Mô hình 3D'
        QUIZ = 'quiz', 'Quiz'
        VIDEO = 'video', 'Video'
        LINK = 'link', 'Liên kết'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey(LessonSection, on_delete=models.CASCADE, related_name='resources')
    kind = models.CharField(max_length=20, choices=Kind.choices)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=lesson_resource_upload_path, blank=True)
    preview_pdf = models.FileField(upload_to=lesson_resource_preview_pdf_path, blank=True)
    preview_slides = models.JSONField(default=list, blank=True)
    preview_status = models.CharField(max_length=20, choices=PreviewStatus.choices, default=PreviewStatus.NONE)
    preview_error = models.TextField(blank=True)
    preview_page_count = models.PositiveIntegerField(default=0)
    external_url = models.URLField(max_length=600, blank=True)
    anatomy_model = models.ForeignKey(
        'anatomy.AnatomyModel', null=True, blank=True, on_delete=models.SET_NULL, related_name='lesson_resources',
    )
    duration_minutes = models.PositiveSmallIntegerField(default=10)
    position = models.PositiveIntegerField(default=0)
    visible_to_students = models.BooleanField(default=True)
    allow_download = models.BooleanField(default=False)
    show_page_number = models.BooleanField(default=True)
    learning_objectives = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['position', 'created_at']
        verbose_name = 'Tài nguyên bài dạy'
        verbose_name_plural = 'Tài nguyên bài dạy'

    def __str__(self):
        return self.title


class LessonQuiz(models.Model):
    class TriggerMode(models.TextChoices):
        MANUAL = 'manual', 'Giáo viên phát thủ công'
        AFTER_RESOURCE = 'after_resource', 'Sau tài liệu'
        AT_MINUTE = 'at_minute', 'Tại mốc thời gian'

    resource = models.OneToOneField(LessonResource, on_delete=models.CASCADE, related_name='quiz')
    question = models.TextField()
    options = models.JSONField(default=list)
    correct_option = models.PositiveSmallIntegerField(default=0)
    duration_seconds = models.PositiveSmallIntegerField(default=60)
    trigger_mode = models.CharField(max_length=20, choices=TriggerMode.choices, default=TriggerMode.MANUAL)
    trigger_minute = models.PositiveSmallIntegerField(default=0)
    delay_seconds = models.PositiveSmallIntegerField(default=0)
    success_threshold = models.PositiveSmallIntegerField(default=70)

    class Meta:
        verbose_name = 'Cấu hình quiz'
        verbose_name_plural = 'Cấu hình quiz'

    def __str__(self):
        return self.resource.title

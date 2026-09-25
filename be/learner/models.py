"""
Hồ sơ học tập (AI "ghi nhớ" về người học) + ngân hàng câu hỏi + phiên ôn tập thích ứng.

- ConceptMastery : mức nắm vững từng cấu trúc (hộp Leitner -> lịch ôn lại ngắt quãng)
- Misconception  : hiểu nhầm AI ghi nhận được (người học xem / đánh dấu đã hiểu / xóa được)
- QuizItem       : câu hỏi đã kiểm chứng, dùng lại cho mọi người (kho càng lớn càng ít gọi AI)
"""

import uuid

from django.conf import settings
from django.db import models


class LearnerProfile(models.Model):
    class Level(models.TextChoices):
        BEGINNER = 'beginner', 'Mới bắt đầu'
        INTERMEDIATE = 'intermediate', 'Đã có nền tảng'
        ADVANCED = 'advanced', 'Ôn thi / nâng cao'

    class Style(models.TextChoices):
        CONCISE = 'concise', 'Ngắn gọn, ý chính'
        DETAILED = 'detailed', 'Chi tiết, có ví dụ'
        SOCRATIC = 'socratic', 'Gợi mở, để mình tự suy nghĩ'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='learner_profile')
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.BEGINNER)
    style = models.CharField(max_length=20, choices=Style.choices, default=Style.CONCISE)
    goals = models.CharField('Mục tiêu học', max_length=300, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Hồ sơ học tập'
        verbose_name_plural = 'Hồ sơ học tập'


class ConceptMastery(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mastery')
    structure = models.ForeignKey('anatomy.Structure', on_delete=models.CASCADE, related_name='+')
    box = models.PositiveSmallIntegerField(default=0)  # 0..5 (Leitner)
    score = models.FloatField(default=0.0)  # 0..1, trung bình trượt
    attempts = models.PositiveIntegerField(default=0)
    correct = models.PositiveIntegerField(default=0)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    next_review_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'structure'], name='uniq_mastery')]
        verbose_name = 'Mức nắm vững'
        verbose_name_plural = 'Mức nắm vững'


class Misconception(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Đang theo dõi'
        RESOLVED = 'resolved', 'Đã hiểu'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='misconceptions')
    structure = models.ForeignKey('anatomy.Structure', null=True, blank=True, on_delete=models.CASCADE, related_name='+')
    key = models.CharField(max_length=64)  # chuẩn hóa để gộp trùng
    text = models.CharField(max_length=300)
    evidence = models.PositiveIntegerField(default=1)
    source = models.CharField(max_length=20, default='quiz')  # quiz | grade | tutor
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        constraints = [models.UniqueConstraint(fields=['user', 'key'], name='uniq_misconception')]
        verbose_name = 'Hiểu nhầm'
        verbose_name_plural = 'Hiểu nhầm'


class QuizItem(models.Model):
    class Kind(models.TextChoices):
        IDENTIFY = 'identify', 'Bấm đúng bộ phận trên 3D'
        MCQ = 'mcq', 'Trắc nghiệm'
        CASE = 'case', 'Tình huống lâm sàng'
        SHORT = 'short', 'Tự luận ngắn'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Đang dùng'
        REVIEW = 'review', 'Chờ duyệt'
        DISABLED = 'disabled', 'Đã tắt'

    structure = models.ForeignKey('anatomy.Structure', on_delete=models.CASCADE, related_name='quiz_items')
    anatomy_model = models.ForeignKey('anatomy.AnatomyModel', null=True, blank=True, on_delete=models.CASCADE, related_name='+')
    kind = models.CharField(max_length=10, choices=Kind.choices)
    difficulty = models.PositiveSmallIntegerField(default=1)
    question = models.TextField()
    options = models.JSONField(default=list, blank=True)
    correct_index = models.SmallIntegerField(null=True, blank=True)
    distractor_notes = models.JSONField(default=list, blank=True)  # hiểu nhầm ứng với từng lựa chọn sai
    rubric = models.JSONField(default=list, blank=True)  # tự luận: các ý cần có
    explanation = models.TextField(blank=True)
    citations = models.JSONField(default=list, blank=True)  # [{n, heading, url, excerpt, document_title}]
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    source = models.CharField(max_length=10, default='ai')  # ai | template
    prompt_version = models.CharField(max_length=40, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    served = models.PositiveIntegerField(default=0)
    correct_count = models.PositiveIntegerField(default=0)
    reports = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Câu hỏi ôn tập'
        verbose_name_plural = 'Câu hỏi ôn tập'

    def __str__(self):
        return self.question[:80]


class ReviewSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='review_sessions')
    anatomy_model = models.ForeignKey('anatomy.AnatomyModel', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    plan = models.JSONField(default=list)  # [{structure_id, kind, difficulty, reason, item_id?}]
    position = models.PositiveSmallIntegerField(default=0)
    correct = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Phiên ôn tập'
        verbose_name_plural = 'Phiên ôn tập'


class QuizAttempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')
    session = models.ForeignKey(ReviewSession, null=True, blank=True, on_delete=models.SET_NULL, related_name='attempts')
    item = models.ForeignKey(QuizItem, on_delete=models.CASCADE, related_name='attempts')
    answer = models.JSONField(default=dict)
    correct = models.BooleanField(default=False)
    score = models.FloatField(default=0.0)
    feedback = models.TextField(blank=True)
    misconception = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Lượt trả lời'
        verbose_name_plural = 'Lượt trả lời'

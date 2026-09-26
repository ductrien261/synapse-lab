"""Gia sư "Hỏi AI": hội thoại theo từng mô hình 3D, câu trả lời có trích dẫn, phản hồi 👍/👎, cache câu hỏi lặp lại."""

import uuid

from django.conf import settings
from django.db import models


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tutor_conversations')
    anatomy_model = models.ForeignKey('anatomy.AnatomyModel', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Hội thoại gia sư'
        verbose_name_plural = 'Hội thoại gia sư'

    def __str__(self):
        return self.title or str(self.id)


class TutorMessage(models.Model):
    class Role(models.TextChoices):
        USER = 'user', 'Người học'
        ASSISTANT = 'assistant', 'Gia sư'

    class Status(models.TextChoices):
        OK = 'ok', 'Đã kiểm chứng'
        UNVERIFIED = 'unverified', 'Chưa đạt kiểm chứng'
        NO_SOURCE = 'no_source', 'Giáo trình chưa có'
        ERROR = 'error', 'Lỗi'

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, blank=True)
    part_index = models.SmallIntegerField(null=True, blank=True)  # bộ phận đang chọn khi hỏi
    citations = models.JSONField(default=list, blank=True)
    highlights = models.JSONField(default=list, blank=True)  # chỉ số bộ phận cần làm sáng trên 3D
    suggestions = models.JSONField(default=list, blank=True)
    from_cache = models.BooleanField(default=False)
    ai_request = models.ForeignKey('ai_gateway.AIRequest', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    feedback = models.SmallIntegerField(null=True, blank=True)  # 1 = hữu ích, -1 = chưa tốt
    feedback_note = models.CharField(max_length=500, blank=True)
    feedback_reviewed = models.BooleanField(default=False)  # admin đã xem phản hồi này
    # "Kiểm tra nhanh": {question, options, correct_index, explanation, answered_index?, correct?}
    quick_check = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Tin nhắn gia sư'
        verbose_name_plural = 'Tin nhắn gia sư'


class AnswerCache(models.Model):
    """Câu hỏi đầu tiên giống nhau (cùng mô hình, bộ phận, chuyên ngành) -> dùng lại câu trả lời, 0 token."""

    key = models.CharField(max_length=64, unique=True)
    question = models.TextField()
    answer = models.TextField()
    citations = models.JSONField(default=list, blank=True)
    highlights = models.JSONField(default=list, blank=True)
    suggestions = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=12, default='ok')
    prompt_version = models.CharField(max_length=40, blank=True)
    hit_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Cache câu trả lời'
        verbose_name_plural = 'Cache câu trả lời'

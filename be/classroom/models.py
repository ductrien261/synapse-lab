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


class Classroom(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    code = models.CharField('Mã tham gia', max_length=8, unique=True, default=generate_class_code)
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

"""Cache bản dịch: đoạn nào đã dịch thì lần sau lấy từ DB, không gọi API nữa."""

import hashlib

from django.db import models


def text_hash(text: str) -> str:
    return hashlib.sha256(text.strip().encode('utf-8')).hexdigest()


class Translation(models.Model):
    source_hash = models.CharField(max_length=64)
    target_lang = models.CharField(max_length=10, default='vi')
    source_text = models.TextField()
    translated_text = models.TextField()
    provider = models.CharField(max_length=50)
    model = models.CharField(max_length=100, blank=True)
    hit_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['source_hash', 'target_lang'], name='uniq_translation_per_lang'),
        ]
        verbose_name = 'Bản dịch'
        verbose_name_plural = 'Bản dịch'

    def __str__(self):
        return self.source_text[:60]

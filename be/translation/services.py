"""
Dịch văn bản qua Groq (API tương thích OpenAI), có cache trong DB.

Cấu hình trong .env:
    GROQ_API_KEY=...
    GROQ_MODEL=qwen/qwen3.8-27b
"""

import re

import requests
from django.conf import settings

from .models import Translation, text_hash

GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
MAX_CHARS = 6000

LANG_NAMES = {'vi': 'tiếng Việt', 'en': 'English'}

SYSTEM_PROMPT = (
    'Bạn là công cụ dịch thuật chuyên ngành y khoa. Dịch đoạn văn người dùng gửi sang {lang}. '
    'Quy tắc: chỉ trả về bản dịch, không giải thích, không thêm lời chào; '
    'giữ nguyên xuống dòng và danh sách; với thuật ngữ giải phẫu quan trọng, '
    'ghi thuật ngữ gốc tiếng Anh trong ngoặc ở lần xuất hiện đầu tiên, ví dụ "tâm thất trái (left ventricle)".'
)

THINK_RE = re.compile(r'<think>.*?</think>', re.DOTALL)


class TranslationError(Exception):
    pass


class TranslationNotConfigured(TranslationError):
    pass


def _call_groq(text: str, target_lang: str) -> str:
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key:
        raise TranslationNotConfigured('Chưa cấu hình dịch tự động (thiếu GROQ_API_KEY).')

    payload = {
        'model': settings.GROQ_MODEL,
        'temperature': 0.2,
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT.format(lang=LANG_NAMES.get(target_lang, target_lang))},
            {'role': 'user', 'content': text},
        ],
        # Model Qwen có chế độ "suy nghĩ": ẩn phần đó đi, chỉ lấy câu trả lời
        'reasoning_format': 'hidden',
    }
    try:
        res = requests.post(
            GROQ_URL,
            json=payload,
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=45,
        )
    except requests.RequestException as exc:
        raise TranslationError('Không kết nối được dịch vụ dịch.') from exc

    if res.status_code == 429:
        raise TranslationError('Dịch vụ dịch đang quá tải, thử lại sau ít phút.')
    if not res.ok:
        raise TranslationError(f'Dịch vụ dịch trả lỗi {res.status_code}.')

    content = res.json()['choices'][0]['message']['content'] or ''
    return THINK_RE.sub('', content).strip()


def translate(text: str, target_lang: str = 'vi') -> tuple[str, bool]:
    """Trả về (bản dịch, lấy_từ_cache)."""
    text = (text or '').strip()
    if not text:
        return '', True
    if len(text) > MAX_CHARS:
        raise TranslationError(f'Đoạn văn quá dài (tối đa {MAX_CHARS} ký tự).')

    key = text_hash(text)
    cached = Translation.objects.filter(source_hash=key, target_lang=target_lang).first()
    if cached:
        Translation.objects.filter(pk=cached.pk).update(hit_count=cached.hit_count + 1)
        return cached.translated_text, True

    translated = _call_groq(text, target_lang)
    if not translated:
        raise TranslationError('Không nhận được bản dịch.')
    Translation.objects.get_or_create(
        source_hash=key,
        target_lang=target_lang,
        defaults={
            'source_text': text,
            'translated_text': translated,
            'provider': 'groq',
            'model': settings.GROQ_MODEL,
        },
    )
    return translated, False

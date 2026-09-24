"""
Dịch văn bản cho người học (nút "Dịch"), có cache trong DB.
- Có trong cache -> trả ngay, 0 token
- Chưa có -> nhờ service AI dịch (tính vào hạn mức token/ngày của người dùng)
"""

from ai_gateway.services import AIError, call_ai, record_cached

from .models import Translation, text_hash

MAX_CHARS = 6000


class TranslationError(AIError):
    pass


def translate(text: str, target_lang: str = 'vi', user=None) -> tuple[str, bool]:
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
        record_cached(user, 'translate')
        return cached.translated_text, True

    data = call_ai('/v1/translate', {'text': text, 'target': target_lang}, user=user, feature='translate')
    translated = (data.get('text') or '').strip()
    if not translated:
        raise TranslationError('Không nhận được bản dịch.')
    models = [s.get('model', '') for s in data.get('meta', {}).get('usage', []) if s.get('kind') == 'chat']
    Translation.objects.get_or_create(
        source_hash=key,
        target_lang=target_lang,
        defaults={'source_text': text, 'translated_text': translated, 'provider': 'ai-service', 'model': (models or [''])[0][:100]},
    )
    return translated, False

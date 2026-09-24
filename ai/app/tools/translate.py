"""Dịch (nút Dịch cho người học) và dịch câu hỏi tìm kiếm Việt -> Anh (có cache Redis)."""

import re

from ..llm.chat import chat
from ..llm.context import RunContext
from ..prompts import translate as P
from . import cache

VI_CHARS = re.compile(r'[ăâđêôơưàảãáạằẳẵắặầẩẫấậèẻẽéẹềểễếệìỉĩíịòỏõóọồổỗốộờởỡớợùủũúụừửữứựỳỷỹýỵ]', re.I)


def is_vietnamese(text: str) -> bool:
    return bool(VI_CHARS.search(text or ''))


def translate_text(ctx: RunContext, text: str, target: str) -> tuple[str, bool]:
    k = cache.key('tr', P.VERSION, target, text)
    hit = cache.get(k)
    if hit:
        return hit, True
    out = chat(ctx, 'translate', P.UI_SYSTEM.format(lang=P.LANG_NAMES.get(target, target)), text)
    if out:
        cache.set(k, out)
    return out, False


def english_query(ctx: RunContext, query: str) -> tuple[str, bool]:
    """(câu tiếng Anh để tìm từ khóa, có dịch hay không). Lỗi AI -> dùng câu gốc (vector vẫn tìm được)."""
    if not is_vietnamese(query):
        return query, False
    k = cache.key('q-en', P.VERSION, query)
    hit = cache.get(k)
    if hit:
        return hit, True
    try:
        out = chat(ctx, 'translate_query', P.QUERY_SYSTEM, query, temperature=0)
    except Exception:  # noqa: BLE001
        return query, False
    if not out:
        return query, False
    cache.set(k, out)
    return out, True

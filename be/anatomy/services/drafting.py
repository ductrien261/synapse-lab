"""
AI viết nháp nội dung cho một cấu trúc giải phẫu, CHỈ dựa trên kho tri thức:
    1. Tìm lai (hybrid) các đoạn liên quan trong tài liệu Y khoa        -> không tốn LLM
    2. Không có đoạn nào nhắc tới cấu trúc -> dừng, báo "kho chưa có"   -> không tốn LLM
    3. Gọi LLM 1 lần: viết tên VI, định nghĩa, chức năng, lâm sàng, mỗi ý kèm [n]
    4. Lưu thành StructureDraft (chờ admin duyệt), không ghi đè nội dung đang có
"""

import re

from django.db.models import Q
from django.utils import timezone

from core import llm
from core.models import ContentStatus
from knowledge.services.embeddings import EmbeddingError
from knowledge.services.search import SearchHit, citation, hybrid_search

from ..models import Structure, StructureDraft

MAX_SOURCES = 6
EXCERPT_CHARS = 1500
CITE_RE = re.compile(r'\[(\d{1,2})\]')

SYSTEM_PROMPT = """Bạn là trợ lý soạn giáo trình giải phẫu cho sinh viên y khoa Việt Nam.
Quy tắc bắt buộc:
- CHỈ dùng thông tin có trong các đoạn trích được cung cấp. Không thêm kiến thức bên ngoài, không suy đoán.
- Viết tiếng Việt chuẩn thuật ngữ y khoa; ở lần đầu nhắc thuật ngữ quan trọng, ghi thuật ngữ tiếng Anh trong ngoặc.
- Mỗi câu phải kết thúc bằng số trích dẫn của đoạn làm căn cứ, dạng [1] hoặc [1][3].
- Mục nào đoạn trích không đề cập thì để chuỗi rỗng "".
- Ưu tiên dùng đúng bảng thuật ngữ nếu có. Lưu ý: ventricle = tâm thất (thất), atrium = tâm nhĩ (nhĩ),
  sinus = xoang, cusp/leaflet = lá van, chordae tendineae = thừng gân, papillary muscle = cơ nhú,
  trabeculae carneae = bè cơ, septum = vách.
Trả về DUY NHẤT một object JSON với các khóa:
{"name_vi": "...", "definition": "2-4 câu: là gì, nằm ở đâu, cấu tạo", "function": "2-4 câu: chức năng",
 "clinical_note": "1-2 câu liên hệ lâm sàng nếu đoạn trích có, không thì \\"\\"", "used_sources": [1, 2]}"""


def _terms(structure: Structure) -> list[str]:
    terms = set()
    for name in (structure.name_en, structure.latin_name):
        name = re.sub(r'\(.*?\)', '', name or '').strip().lower()
        if len(name) >= 3:
            terms.add(name)
            if name.endswith('s') and len(name) > 4:
                terms.add(name[:-1])
    return sorted(terms)


def _mentions(hit: SearchHit, terms: list[str]) -> bool:
    text = f'{hit.chunk.heading} {hit.chunk.content}'.lower()
    return any(t in text for t in terms)


def _glossary(structure: Structure, text: str) -> list[str]:
    """Thuật ngữ admin đã duyệt (name_en -> name_vi) có xuất hiện trong các đoạn trích."""
    lowered = text.lower()
    lines = []
    if structure.name_vi:
        lines.append(f'{structure.name_en} = {structure.name_vi}')
    rows = (
        Structure.objects.filter(status=ContentStatus.PUBLISHED)
        .exclude(Q(name_vi='') | Q(pk=structure.pk))
        .values_list('name_en', 'name_vi')
    )
    for en, vi in rows:
        if en.lower() in lowered:
            lines.append(f'{en} = {vi}')
        if len(lines) >= 40:
            break
    return lines


def _clean_citations(text: str, allowed: set[int]) -> str:
    """Bỏ số trích dẫn không tồn tại (AI đánh số sai)."""
    return CITE_RE.sub(lambda m: m.group(0) if int(m.group(1)) in allowed else '', text or '').strip()


def _save(structure: Structure, user, **fields) -> StructureDraft:
    defaults = {
        'status': StructureDraft.Status.PENDING, 'name_vi': '', 'definition': '', 'function': '', 'clinical_note': '',
        'citations': [], 'query': '', 'llm_model': '', 'prompt_tokens': 0, 'completion_tokens': 0, 'error': '',
        'created_by': user, 'reviewed_by': None, 'reviewed_at': None,
        **fields,
    }
    draft, _ = StructureDraft.objects.update_or_create(structure=structure, defaults=defaults)
    return draft


def draft_structure(structure: Structure, user=None) -> StructureDraft:
    terms = _terms(structure)
    query = ' '.join(dict.fromkeys([structure.name_en, structure.latin_name])).strip()

    try:
        hits, _info = hybrid_search(query, k=MAX_SOURCES + 2, scope='med', per_section=2)
    except EmbeddingError as exc:
        return _save(structure, user, status=StructureDraft.Status.FAILED, query=query, error=str(exc))

    relevant = [h for h in hits if _mentions(h, terms)]
    if not relevant:
        return _save(structure, user, status=StructureDraft.Status.NO_SOURCE, query=query,
                     error='Không có đoạn nào trong kho nhắc tới cấu trúc này. Hãy nạp thêm chương liên quan.')
    others = [h for h in hits if h not in relevant]
    sources = (relevant + others)[:MAX_SOURCES]

    excerpts = []
    for n, h in enumerate(sources, start=1):
        excerpts.append(f'[{n}] {h.chunk.document.title} — {h.chunk.heading}\n{h.chunk.content[:EXCERPT_CHARS]}')
    joined = '\n\n'.join(excerpts)
    glossary = _glossary(structure, joined)

    prompt = (
        f'Cấu trúc cần soạn: {structure.name_en}'
        + (f' (Latin: {structure.latin_name})' if structure.latin_name else '')
        + ('\n\nBảng thuật ngữ đã duyệt (dùng đúng các tên này):\n' + '\n'.join(glossary) if glossary else '')
        + f'\n\nCác đoạn trích:\n\n{joined}'
    )

    try:
        result = llm.complete(prompt, system=SYSTEM_PROMPT, json_mode=True)
        data = llm.parse_json(result.text)
    except llm.LLMError as exc:
        return _save(structure, user, status=StructureDraft.Status.FAILED, query=query, error=str(exc))

    allowed = set(range(1, len(sources) + 1))
    fields = {k: _clean_citations(str(data.get(k) or ''), allowed) for k in ('definition', 'function', 'clinical_note')}
    name_vi = str(data.get('name_vi') or '').strip()[:200]

    used = {int(n) for n in CITE_RE.findall(' '.join(fields.values()))}
    used |= {n for n in data.get('used_sources') or [] if isinstance(n, int) and n in allowed}
    citations = [
        {
            'n': n,
            'chunk_id': h.chunk.id,
            'document_id': str(h.chunk.document_id),
            'document_title': h.chunk.document.title,
            'heading': h.chunk.heading,
            'url': h.chunk.url,
            'page_label': h.chunk.page_label,
            'page_start': h.chunk.page_start,
            'excerpt': h.chunk.content[:600],
            'citation': citation(h.chunk),
        }
        for n, h in enumerate(sources, start=1)
        if n in used
    ]

    if not any(fields.values()):
        return _save(structure, user, status=StructureDraft.Status.NO_SOURCE, query=query,
                     llm_model=result.model, prompt_tokens=result.prompt_tokens, completion_tokens=result.completion_tokens,
                     error='AI không tìm thấy thông tin phù hợp trong các đoạn trích.')

    return _save(
        structure, user,
        status=StructureDraft.Status.PENDING, name_vi=name_vi, citations=citations, query=query,
        llm_model=result.model, prompt_tokens=result.prompt_tokens, completion_tokens=result.completion_tokens,
        **fields,
    )


def apply_draft(draft: StructureDraft, user, overrides: dict | None = None, publish: bool = True) -> Structure:
    """Admin duyệt: ghi nội dung (có thể đã sửa) vào Structure, lưu trích dẫn, đánh dấu đã duyệt."""
    from ..models import StructureReference

    overrides = overrides or {}
    structure = draft.structure
    for field in ('name_vi', 'definition', 'function', 'clinical_note'):
        value = overrides.get(field, getattr(draft, field))
        if field == 'name_vi' and not value:
            continue  # không xóa tên đang có
        setattr(structure, field, value)
    if publish:
        structure.status = ContentStatus.PUBLISHED
    structure.updated_by = user
    structure.save()

    # Tài liệu / đoạn có thể đã bị xóa hoặc nạp lại (đổi id) sau khi viết nháp
    from knowledge.models import Document, DocumentChunk

    doc_ids = {str(pk) for pk in Document.objects.filter(pk__in=[c.get('document_id') for c in draft.citations]).values_list('pk', flat=True)}
    chunk_ids = set(DocumentChunk.objects.filter(pk__in=[c.get('chunk_id') for c in draft.citations]).values_list('pk', flat=True))

    StructureReference.objects.filter(structure=structure).delete()
    StructureReference.objects.bulk_create([
        StructureReference(
            structure=structure,
            document_id=c['document_id'],
            chunk_id=c.get('chunk_id') if c.get('chunk_id') in chunk_ids else None,
            page_start=c.get('page_start'),
            page_end=c.get('page_start'),
            heading=(c.get('heading') or '')[:500],
            url=c.get('url') or '',
            excerpt=c.get('excerpt') or '',
            order=c['n'],
        )
        for c in draft.citations
        if c.get('document_id') in doc_ids
    ])

    draft.status = StructureDraft.Status.APPLIED
    draft.reviewed_by = user
    draft.reviewed_at = timezone.now()
    draft.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
    return structure

"""
AI viết nháp nội dung cho một cấu trúc giải phẫu.
Quy trình (tìm giáo trình -> viết -> kiểm chứng trích dẫn -> viết lại nếu cần) chạy ở service AI
(ai/app/graphs/draft.py). Ở đây chỉ: chuẩn bị bảng thuật ngữ đã duyệt, gọi service, lưu bản nháp.
"""

from django.db.models import Q
from django.utils import timezone

from ai_gateway.services import AIError, call_ai
from core.models import ContentStatus

from ..models import Structure, StructureDraft


def _glossary(structure: Structure) -> list[list[str]]:
    """Thuật ngữ admin đã duyệt (name_en -> name_vi); service AI tự lọc những từ có trong đoạn trích."""
    return [
        [en, vi]
        for en, vi in Structure.objects.filter(status=ContentStatus.PUBLISHED)
        .exclude(Q(name_vi='') | Q(pk=structure.pk))
        .values_list('name_en', 'name_vi')[:2000]
    ]


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
    query = ' '.join(dict.fromkeys([structure.name_en, structure.latin_name])).strip()
    try:
        data = call_ai(
            '/v1/draft/structure',
            {
                'name_en': structure.name_en, 'latin_name': structure.latin_name, 'name_vi': structure.name_vi,
                'glossary': _glossary(structure), 'scope': 'med',
            },
            user=user, feature='draft', count_quota=False, timeout=240,
        )
    except AIError as exc:
        return _save(structure, user, status=StructureDraft.Status.FAILED, query=query, error=str(exc))

    usage = [s for s in data.get('meta', {}).get('usage', []) if s.get('kind') == 'chat']
    tokens = {
        'llm_model': (usage[-1].get('model', '') if usage else '')[:100],
        'prompt_tokens': sum(int(s.get('input_tokens') or 0) for s in usage),
        'completion_tokens': sum(int(s.get('output_tokens') or 0) for s in usage),
    }
    status = data.get('status')
    if status == 'pending':
        return _save(
            structure, user, status=StructureDraft.Status.PENDING, query=query,
            name_vi=(data.get('name_vi') or '')[:200], definition=data.get('definition', ''), function=data.get('function', ''),
            clinical_note=data.get('clinical_note', ''), citations=data.get('citations', []),
            error='\n'.join(data.get('warnings') or []), **tokens,
        )
    if status == 'no_source':
        return _save(structure, user, status=StructureDraft.Status.NO_SOURCE, query=query, error=data.get('error', ''), **tokens)
    return _save(structure, user, status=StructureDraft.Status.FAILED, query=query,
                 error=data.get('error') or 'Service AI trả lỗi.', **tokens)


def apply_draft(draft: StructureDraft, user, overrides: dict | None = None, publish: bool = True) -> Structure:
    """Admin duyệt: ghi nội dung (có thể đã sửa) vào Structure, lưu trích dẫn, đánh dấu đã duyệt."""
    from knowledge.models import Document, DocumentChunk

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

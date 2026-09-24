"""Lưu danh sách chú thích (đọc từ Sketchfab Viewer API ở trình duyệt) và ghép với cấu trúc giải phẫu."""

import re

from django.db import transaction

from ..models import AnatomyModel, ModelAnnotation, Structure

NUMBER_PREFIX = re.compile(r'^\s*\(?\d+[\).:\-]?\s+')


def clean_label(label: str) -> str:
    """'3. Left ventricle' -> 'Left ventricle'"""
    return NUMBER_PREFIX.sub('', (label or '').strip())[:300]


@transaction.atomic
def sync_annotations(model: AnatomyModel, items: list[dict]) -> dict:
    """
    items: [{index, label, content}]
    - Tạo/cập nhật ModelAnnotation theo index; xóa index không còn trên Sketchfab.
    - Chú thích chưa gắn cấu trúc -> tìm Structure cùng tên tiếng Anh (không phân biệt hoa thường),
      chưa có thì tạo mới ở trạng thái Nháp.
    """
    seen = set()
    created_structures = 0
    linked = 0
    for item in items:
        index = int(item['index'])
        seen.add(index)
        label = clean_label(item.get('label', '')) or f'Chú thích {index + 1}'
        annotation, _ = ModelAnnotation.objects.update_or_create(
            model=model,
            index=index,
            defaults={'label': label, 'raw_content': (item.get('content') or '')[:5000]},
        )
        if annotation.structure_id is None:
            structure = Structure.objects.filter(name_en__iexact=label).first()
            if structure is None:
                structure = Structure.objects.create(name_en=label, system=model.system)
                created_structures += 1
            annotation.structure = structure
            annotation.save(update_fields=['structure'])
            linked += 1

    removed, _ = ModelAnnotation.objects.filter(model=model).exclude(index__in=seen).delete()
    return {'total': len(seen), 'linked': linked, 'new_structures': created_structures, 'removed': removed}

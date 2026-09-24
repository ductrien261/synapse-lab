"""Nhập / cập nhật một mô hình Sketchfab vào database (dùng chung cho lệnh quản lý và trang admin)."""

from django.utils import timezone

from ..models import AnatomyModel, BodySystem
from .sketchfab import SketchfabError, fetch_model_metadata, parse_uid


def import_model(
    link: str,
    *,
    system: BodySystem | None = None,
    source_url: str = '',
    publish: bool | None = None,
    user=None,
) -> tuple[AnatomyModel, bool]:
    """
    Nhận link embed / link trang Sketchfab / mã 32 ký tự.
    Mô hình đã có thì chỉ cập nhật thông tin từ Sketchfab, KHÔNG đổi nội dung admin đã soạn.
    Trả về (model, created).
    """
    uid = parse_uid(link)
    if not uid:
        raise SketchfabError('Link không chứa mã mô hình Sketchfab (32 ký tự).')

    meta = fetch_model_metadata(uid)
    model, created = AnatomyModel.objects.get_or_create(
        sketchfab_uid=uid,
        defaults={'title': meta['title'] or uid, 'created_by': user},
    )
    for field, value in meta.items():
        setattr(model, field, value)
    if system is not None:
        model.system = system
    if source_url:
        model.source_url = source_url
    if publish is not None:
        model.is_published = publish
    model.last_synced_at = timezone.now()
    model.save()
    return model, created

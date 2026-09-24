"""
Chạy lượt quét / nhập AnatomyTOOL trong luồng nền (thread).
Trạng thái + log lưu vào ImportJob để trang admin hỏi tiến độ.

Ghi chú: luồng nền đủ dùng cho đồ án (1 server). Nếu sau này chạy nhiều
server thì chuyển sang hàng đợi (Celery/RQ + Redis đã có sẵn).
"""

import threading
import traceback
from datetime import timedelta

from django.db import close_old_connections
from django.db.models import F
from django.utils import timezone

from ..models import AnatomyModel, AnatomyToolCollection, BodySystem, ImportJob, Structure, StructureDraft
from .anatomytool import (
    COLLECTIONS_URL,
    AnatomyToolError,
    CollectionItem,
    fetch,
    parse_collection_page,
    parse_collections_index,
    parse_item_page,
)
from .drafting import draft_structure
from .importer import import_model
from .sketchfab import SketchfabError, parse_uid

STALE_AFTER = timedelta(minutes=10)

# Gợi ý hệ cơ quan theo tên Collection (admin vẫn đổi được)
SYSTEM_HINTS = [
    ('cardiovascular', ['heart', 'cardi', 'coronar', 'vessel', 'arter', 'vein', 'aorta', 'vascular']),
    ('nervous', ['brain', 'neuro', 'nerve', 'spinal', 'cerebr', 'cranial', 'nervous']),
    ('respiratory', ['lung', 'respir', 'bronch', 'trache', 'larynx', 'thora']),
    ('musculoskeletal', ['bone', 'skelet', 'muscle', 'joint', 'knee', 'hip', 'shoulder', 'hand', 'foot', 'spine', 'vertebr', 'skull', 'pelvi', 'limb', 'elbow', 'wrist', 'ankle']),
    ('digestive', ['stomach', 'liver', 'bowel', 'intestin', 'digest', 'gastro', 'pancrea', 'abdom', 'esophag', 'oesophag']),
    ('urinary', ['kidney', 'renal', 'urin', 'bladder']),
    ('reproductive', ['reproduct', 'genital', 'uter', 'ovar', 'prostat', 'testi', 'pregnan']),
    ('endocrine', ['endocrin', 'thyroid', 'adrenal', 'pituitar']),
    ('lymphatic', ['lymph', 'spleen', 'immun']),
    ('sensory', ['eye', 'ear', 'orbit', 'nose', 'sense']),
    ('integumentary', ['skin', 'integument']),
]


def suggest_system(title: str) -> BodySystem | None:
    lowered = title.lower()
    for slug, words in SYSTEM_HINTS:
        if any(w in lowered for w in words):
            return BodySystem.objects.filter(slug=slug).first()
    return None


# ------------------------------------------------------------
# Tiện ích ghi log / tiến độ
# ------------------------------------------------------------

def _log(job: ImportJob, message: str, level: str = 'info'):
    entry = {'at': timezone.now().strftime('%H:%M:%S'), 'level': level, 'message': message}
    job.log = (job.log or [])[-199:] + [entry]
    job.save(update_fields=['log', 'updated_at'])


def _bump(job: ImportJob, **fields):
    ImportJob.objects.filter(pk=job.pk).update(**{k: F(k) + v for k, v in fields.items()}, updated_at=timezone.now())
    job.refresh_from_db()


def _cancelled(job: ImportJob) -> bool:
    job.refresh_from_db(fields=['cancel_requested'])
    return job.cancel_requested


def expire_stale_jobs():
    """Server khởi động lại giữa chừng -> lượt đang chạy bị 'treo'; đánh dấu lỗi."""
    ImportJob.objects.filter(
        status__in=[ImportJob.Status.RUNNING, ImportJob.Status.QUEUED],
        updated_at__lt=timezone.now() - STALE_AFTER,
    ).update(status=ImportJob.Status.FAILED, finished_at=timezone.now())


def has_active_job() -> ImportJob | None:
    expire_stale_jobs()
    return ImportJob.objects.filter(status__in=[ImportJob.Status.QUEUED, ImportJob.Status.RUNNING]).first()


# ------------------------------------------------------------
# Các lượt chạy
# ------------------------------------------------------------

def _run_scan_index(job: ImportJob):
    _log(job, 'Đang đọc trang danh mục Collection...')
    links = parse_collections_index(fetch(COLLECTIONS_URL))
    job.total = len(links)
    job.save(update_fields=['total'])
    if not links:
        raise AnatomyToolError('Không tìm thấy Collection nào (có thể trang đã đổi cấu trúc).')

    now = timezone.now()
    for link in links:
        collection, created = AnatomyToolCollection.objects.get_or_create(
            url=link.url, defaults={'title': link.title, 'suggested_system': suggest_system(link.title)}
        )
        if not created and link.title and collection.title != link.title:
            collection.title = link.title
        collection.last_scanned_at = now
        collection.save()
        _bump(job, processed=1, created_count=1 if created else 0, skipped_count=0 if created else 1)
    _log(job, f'Tìm thấy {len(links)} Collection.', 'success')


def _run_import(job: ImportJob):
    params = job.params or {}
    selections = params.get('collections', [])  # [{id, system}]
    links = [l for l in params.get('links', []) if l.strip()]

    # 1) Link dán trực tiếp
    if links:
        job.total += len(links)
        job.save(update_fields=['total'])
        system = BodySystem.objects.filter(slug=params.get('links_system') or '').first()
        for link in links:
            if _cancelled(job):
                return
            link = link.strip()
            try:
                if 'anatomytool.org' in link:
                    item = CollectionItem(url=link.split('?')[0].rstrip('/'), title=link)
                    _import_item_or_nested(job, item, system)
                elif parse_uid(link):
                    if AnatomyModel.objects.filter(sketchfab_uid=parse_uid(link)).exists():
                        _bump(job, processed=1, skipped_count=1)
                        _log(job, f'Bỏ qua (đã có): {link}')
                        continue
                    model, _ = import_model(link, system=system, publish=False, user=job.created_by)
                    _bump(job, processed=1, created_count=1)
                    _log(job, f'Đã nhập (nháp): {model.title}', 'success')
                else:
                    _bump(job, processed=1, failed_count=1)
                    _log(job, f'Link không hợp lệ: {link}', 'error')
            except (AnatomyToolError, SketchfabError) as exc:
                _bump(job, processed=1, failed_count=1)
                _log(job, str(exc), 'error')

    # 2) Collection đã tick
    for sel in selections:
        if _cancelled(job):
            return
        collection = AnatomyToolCollection.objects.filter(pk=sel.get('id')).first()
        if not collection:
            continue
        system = BodySystem.objects.filter(slug=sel.get('system') or '').first() or collection.suggested_system
        if system and collection.suggested_system_id != system.id:
            collection.suggested_system = system
        _log(job, f'Đang đọc Collection “{collection.title}”...')
        try:
            page = parse_collection_page(fetch(collection.url), collection.url)
        except AnatomyToolError as exc:
            _log(job, str(exc), 'error')
            continue

        candidates = page.candidates
        collection.candidate_count = len(candidates)
        collection.last_scanned_at = timezone.now()
        collection.save()
        job.total += len(candidates)
        job.save(update_fields=['total'])
        _log(job, f'“{collection.title}”: {len(candidates)} mục 3D.')

        before = job.created_count
        for item in candidates:
            if _cancelled(job):
                return
            try:
                _import_item_or_nested(job, item, system)
            except (AnatomyToolError, SketchfabError) as exc:
                _bump(job, processed=1, failed_count=1)
                _log(job, str(exc), 'error')

        AnatomyToolCollection.objects.filter(pk=collection.pk).update(
            imported_count=F('imported_count') + (job.created_count - before),
            last_imported_at=timezone.now(),
        )


def _import_item_or_nested(job: ImportJob, item: CollectionItem, system: BodySystem | None):
    """
    Mở trang mục: có Sketchfab -> nhập; không có mà lại là trang tổng hợp
    (vd. 'Congenital heart diseases') -> nhập tiếp các mục 3D bên trong (1 cấp).
    """
    html = fetch(item.url)
    page = parse_item_page(html, item.url)

    if page.sketchfab_uid:
        if AnatomyModel.objects.filter(sketchfab_uid=page.sketchfab_uid).exists():
            _bump(job, processed=1, skipped_count=1)
            _log(job, f'Bỏ qua (đã có): {page.title}')
            return
        model, _ = import_model(page.sketchfab_uid, system=system, source_url=item.url, publish=False, user=job.created_by)
        model.source_meta = page.as_meta()
        model.save(update_fields=['source_meta'])
        _bump(job, processed=1, created_count=1)
        _log(job, f'Đã nhập (nháp): {page.title}', 'success')
        return

    nested = [i for i in parse_collection_page(html, item.url).candidates if i.url != item.url]
    if nested:
        job.total += len(nested)
        job.save(update_fields=['total'])
        _bump(job, processed=1, skipped_count=1)
        _log(job, f'“{page.title}” là trang tổng hợp: thêm {len(nested)} mục 3D bên trong.')
        for sub in nested:
            if _cancelled(job):
                return
            try:
                sub_page = parse_item_page(fetch(sub.url), sub.url)
            except AnatomyToolError as exc:
                _bump(job, processed=1, failed_count=1)
                _log(job, str(exc), 'error')
                continue
            if not sub_page.sketchfab_uid:
                _bump(job, processed=1, skipped_count=1)
                _log(job, f'Bỏ qua (không có mô hình Sketchfab): {sub_page.title}')
                continue
            if AnatomyModel.objects.filter(sketchfab_uid=sub_page.sketchfab_uid).exists():
                _bump(job, processed=1, skipped_count=1)
                _log(job, f'Bỏ qua (đã có): {sub_page.title}')
                continue
            try:
                model, _ = import_model(sub_page.sketchfab_uid, system=system, source_url=sub.url, publish=False, user=job.created_by)
            except SketchfabError as exc:
                _bump(job, processed=1, failed_count=1)
                _log(job, f'Lỗi Sketchfab ({sub_page.title}): {exc}', 'error')
                continue
            model.source_meta = sub_page.as_meta()
            model.save(update_fields=['source_meta'])
            _bump(job, processed=1, created_count=1)
            _log(job, f'Đã nhập (nháp): {sub_page.title}', 'success')
        return

    _bump(job, processed=1, skipped_count=1)
    _log(job, f'Bỏ qua (không có mô hình Sketchfab): {page.title}')


def _run_ai_draft(job: ImportJob):
    """AI viết nháp cho danh sách cấu trúc (1 lần gọi LLM / cấu trúc có tài liệu)."""
    ids = job.params.get('structure_ids', [])
    job.total = len(ids)
    job.save(update_fields=['total'])
    _log(job, f'AI viết nháp cho {len(ids)} bộ phận (chỉ dựa trên kho tài liệu).')
    tokens = 0
    for structure in Structure.objects.filter(pk__in=ids).order_by('name_en'):
        if _cancelled(job):
            return
        draft = draft_structure(structure, job.created_by)
        tokens += draft.prompt_tokens + draft.completion_tokens
        name = structure.name_vi or structure.name_en
        if draft.status == StructureDraft.Status.PENDING:
            _bump(job, processed=1, created_count=1)
            _log(job, f'{name}: đã có bản nháp ({len(draft.citations)} nguồn).', 'success')
        elif draft.status == StructureDraft.Status.NO_SOURCE:
            _bump(job, processed=1, skipped_count=1)
            _log(job, f'{name}: kho chưa có tài liệu → bỏ qua (không tốn AI).', 'warning')
        else:
            _bump(job, processed=1, failed_count=1)
            _log(job, f'{name}: lỗi — {draft.error}', 'error')
    _log(job, f'Tổng token AI đã dùng: {tokens:,}.'.replace(',', '.'))


RUNNERS = {
    ImportJob.Kind.SCAN_INDEX: _run_scan_index,
    ImportJob.Kind.IMPORT: _run_import,
    ImportJob.Kind.AI_DRAFT: _run_ai_draft,
}


def _worker(job_id):
    close_old_connections()
    job = ImportJob.objects.get(pk=job_id)
    job.status = ImportJob.Status.RUNNING
    job.save(update_fields=['status', 'updated_at'])
    try:
        RUNNERS[job.kind](job)
        job.refresh_from_db()
        job.status = ImportJob.Status.CANCELLED if job.cancel_requested else ImportJob.Status.DONE
        if job.cancel_requested:
            _log(job, 'Đã dừng theo yêu cầu.', 'warning')
        else:
            _log(job, 'Hoàn tất.', 'success')
    except Exception as exc:  # noqa: BLE001
        job.refresh_from_db()
        job.status = ImportJob.Status.FAILED
        _log(job, f'Lỗi: {exc}', 'error')
        traceback.print_exc()
    finally:
        job.finished_at = timezone.now()
        job.save(update_fields=['status', 'finished_at', 'updated_at'])
        close_old_connections()


def start_job(kind: str, params: dict, user) -> ImportJob:
    job = ImportJob.objects.create(kind=kind, params=params, created_by=user)
    threading.Thread(target=_worker, args=(job.pk,), daemon=True, name=f'import-job-{job.pk}').start()
    return job

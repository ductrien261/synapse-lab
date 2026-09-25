"""
Nạp tài liệu vào kho tri thức (chạy nền, 1 lượt tại 1 thời điểm):
    đọc nguồn -> Section theo tiêu đề -> chia đoạn -> tạo vector (Gemini) -> lưu Neon (pgvector + full-text)
Không dùng LLM.

Trạng thái + log lưu vào IngestJob để trang admin hỏi tiến độ (giống lượt nhập AnatomyTOOL).
"""

import threading
import traceback
from datetime import timedelta

from django.contrib.postgres.search import SearchVector
from django.db import close_old_connections, transaction
from django.db.models import F, Max
from django.utils import timezone

from ..models import Document, DocumentChunk, IngestJob
from . import openstax
from .chunking import Section, chunk_sections, contextual_text
from .embeddings import embed_documents
from .pdf import parse_pdf

STALE_AFTER = timedelta(minutes=15)


# ------------------------------------------------------------
# Tiện ích log / tiến độ
# ------------------------------------------------------------

def _log(job: IngestJob, message: str, level: str = 'info'):
    entry = {'at': timezone.localtime().strftime('%H:%M:%S'), 'level': level, 'message': message}
    job.log = (job.log or [])[-199:] + [entry]
    job.save(update_fields=['log', 'updated_at'])


def _bump(job: IngestJob, **fields):
    IngestJob.objects.filter(pk=job.pk).update(**{k: F(k) + v for k, v in fields.items()}, updated_at=timezone.now())
    job.refresh_from_db()


def _cancelled(job: IngestJob) -> bool:
    job.refresh_from_db(fields=['cancel_requested'])
    return job.cancel_requested


def expire_stale_jobs():
    """Server khởi động lại giữa chừng -> lượt đang chạy bị 'treo'; đánh dấu lỗi."""
    stale = IngestJob.objects.filter(
        status__in=[IngestJob.Status.RUNNING, IngestJob.Status.QUEUED],
        updated_at__lt=timezone.now() - STALE_AFTER,
    )
    Document.objects.filter(jobs__in=stale, status=Document.Status.PROCESSING).update(status=Document.Status.FAILED)
    stale.update(status=IngestJob.Status.FAILED, finished_at=timezone.now())


def active_job() -> IngestJob | None:
    expire_stale_jobs()
    return IngestJob.objects.filter(status__in=[IngestJob.Status.QUEUED, IngestJob.Status.RUNNING]).first()


# ------------------------------------------------------------
# Lưu đoạn
# ------------------------------------------------------------

def save_sections(document: Document, section_key: str, section_title: str, sections: list[Section], on_batch=None) -> int:
    """Thay toàn bộ đoạn của 1 trang nguồn bằng bản mới. Trả về số đoạn."""
    drafts = chunk_sections(sections)
    # Đoạn giống hệt (cùng tiêu đề + nội dung) đã có vector trong tài liệu này -> dùng lại, khỏi gọi Gemini
    known: dict[tuple[str, str], object] = {}
    if drafts:
        headings = {d.section.breadcrumb[:500] for d in drafts}
        for heading, content, emb in DocumentChunk.objects.filter(
            document=document, heading__in=headings, embedding__isnull=False
        ).values_list('heading', 'content', 'embedding'):
            known[(heading, content)] = emb
    keys = [(d.section.breadcrumb[:500], d.text) for d in drafts]
    missing = [i for i, k in enumerate(keys) if k not in known]
    new_vectors = embed_documents(
        [contextual_text(document.title, drafts[i].section.breadcrumb, drafts[i].text) for i in missing], on_batch
    ) if missing else []
    fresh = dict(zip(missing, new_vectors))
    vectors = [fresh[i] if i in fresh else known[keys[i]] for i in range(len(drafts))]

    with transaction.atomic():
        DocumentChunk.objects.filter(document=document, section_key=section_key).delete()
        start = (DocumentChunk.objects.filter(document=document).aggregate(m=Max('index'))['m'] or -1) + 1
        DocumentChunk.objects.bulk_create([
            DocumentChunk(
                document=document,
                index=start + i,
                section_key=section_key,
                section_title=section_title[:300],
                heading=d.section.breadcrumb[:500],
                url=d.section.url,
                content=d.text,
                page_start=d.section.page,
                page_end=d.section.page,
                token_count=len(d.text) // 4,
                embedding=vec,
            )
            for i, (d, vec) in enumerate(zip(drafts, vectors))
        ])
        DocumentChunk.objects.filter(document=document, section_key=section_key).update(
            search_vector=SearchVector('heading', weight='A', config='english')
            + SearchVector('content', weight='B', config='english')
        )
    return len(drafts)


def refresh_document_stats(document: Document):
    document.chunk_count = document.chunks.count()
    document.save(update_fields=['chunk_count', 'updated_at'])


# ------------------------------------------------------------
# Các lượt chạy
# ------------------------------------------------------------

def _run_openstax(job: IngestJob):
    document = job.document
    toc = document.meta.get('toc', [])
    slugs: list[str] = job.params.get('pages', [])
    job.total = len(slugs)
    job.save(update_fields=['total'])
    _log(job, f'Nạp {len(slugs)} trang từ “{document.title}” (mỗi trang cách nhau ≥3 giây theo quy định của OpenStax).')

    for slug in slugs:
        if _cancelled(job):
            return
        found = openstax.find_page(toc, slug)
        chapter, page = found if found else ({'title': ''}, {'title': slug})
        url = openstax.page_url(document.source_key, slug)
        try:
            sections = openstax.parse_page(openstax.fetch(url), url, chapter['title'], page['title'])
            if not sections:
                _bump(job, processed=1, skipped_count=1)
                _log(job, f'Bỏ qua (không có nội dung): {page["title"]}', 'warning')
                continue
            count = save_sections(document, slug, page['title'], sections)
        except openstax.OpenStaxError as exc:
            _bump(job, processed=1, failed_count=1)
            _log(job, str(exc), 'error')
            continue
        _bump(job, processed=1, created_count=1)
        _log(job, f'{page["title"]}: {len(sections)} mục → {count} đoạn.', 'success')
        refresh_document_stats(document)


def _run_pdf(job: IngestJob):
    document = job.document
    _log(job, f'Đang đọc file “{document.original_filename or document.title}”...')
    with document.file.open('rb') as fh:
        data = fh.read()
    sections, page_count = parse_pdf(data, document.title)
    document.page_count = page_count
    document.save(update_fields=['page_count', 'updated_at'])
    _log(job, f'{page_count} trang, {len(sections)} mục. Đang chia đoạn và tạo vector...')

    def progress(done: int, total: int):
        IngestJob.objects.filter(pk=job.pk).update(total=total, processed=done, updated_at=timezone.now())

    count = save_sections(document, 'pdf', document.title, sections, on_batch=progress)
    job.refresh_from_db()
    _bump(job, created_count=1)
    _log(job, f'Đã lưu {count} đoạn.', 'success')
    refresh_document_stats(document)


RUNNERS = {
    IngestJob.Kind.OPENSTAX: _run_openstax,
    IngestJob.Kind.PDF: _run_pdf,
}


def _worker(job_id):
    close_old_connections()
    job = IngestJob.objects.select_related('document').get(pk=job_id)
    document = job.document
    job.status = IngestJob.Status.RUNNING
    job.save(update_fields=['status', 'updated_at'])
    Document.objects.filter(pk=document.pk).update(status=Document.Status.PROCESSING, error_message='')
    error = ''
    try:
        RUNNERS[job.kind](job)
        job.refresh_from_db()
        if job.cancel_requested:
            job.status = IngestJob.Status.CANCELLED
            _log(job, 'Đã dừng theo yêu cầu. Các trang đã nạp xong vẫn được giữ.', 'warning')
        else:
            job.status = IngestJob.Status.DONE
            _log(job, 'Hoàn tất.', 'success')
    except Exception as exc:  # noqa: BLE001
        job.refresh_from_db()
        job.status = IngestJob.Status.FAILED
        error = str(exc)
        _log(job, f'Lỗi: {exc}', 'error')
        traceback.print_exc()
    finally:
        job.finished_at = timezone.now()
        job.save(update_fields=['status', 'finished_at', 'updated_at'])
        document.refresh_from_db()
        has_chunks = document.chunks.exists()
        # Còn đoạn nào là tìm được -> Sẵn sàng (lỗi vẫn ghi lại để admin xem)
        if has_chunks:
            document.status = Document.Status.READY
        else:
            document.status = Document.Status.FAILED if error else Document.Status.PENDING
        document.error_message = error[:2000]
        document.processed_at = timezone.now()
        document.chunk_count = document.chunks.count()
        document.save(update_fields=['status', 'error_message', 'processed_at', 'chunk_count', 'updated_at'])
        close_old_connections()


def start_job(kind: str, document: Document, params: dict, user) -> IngestJob:
    job = IngestJob.objects.create(kind=kind, document=document, params=params, created_by=user)
    threading.Thread(target=_worker, args=(job.pk,), daemon=True, name=f'ingest-job-{job.pk}').start()
    return job

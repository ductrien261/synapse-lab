"""Algorithm-only scan and candidate workflow built on the shared knowledge/AI infrastructure."""

import threading
from datetime import timedelta

from django.db import close_old_connections, transaction
from django.db.models import Q
from django.utils import timezone

from ai_gateway.services import AIError, call_ai
from core.models import ContentStatus
from knowledge.models import Document, DocumentChunk

from algorithms.models import (
    Algorithm, AlgorithmContent, AlgorithmDraftCandidate, AlgorithmReference,
    AlgorithmScanJob, AlgorithmSource,
)
from algorithms.services.source_fetch import SourceFetchError, fetch_source_text

LESSON_FIELDS = (
    'title', 'summary', 'objectives', 'problem', 'inputOutput', 'example',
    'theory', 'pseudocode', 'complexity', 'applications', 'references',
)


def active_scan_job():
    AlgorithmScanJob.objects.filter(
        status__in=[AlgorithmScanJob.Status.QUEUED, AlgorithmScanJob.Status.RUNNING],
        updated_at__lt=timezone.now() - timedelta(minutes=30),
    ).update(
        status=AlgorithmScanJob.Status.FAILED,
        error='Lượt quét bị gián đoạn. Vui lòng chạy lại.',
        finished_at=timezone.now(),
    )
    return AlgorithmScanJob.objects.filter(
        status__in=[AlgorithmScanJob.Status.QUEUED, AlgorithmScanJob.Status.RUNNING],
    ).first()


def _log(job: AlgorithmScanJob, message: str, level: str = 'info'):
    job.refresh_from_db(fields=['log'])
    job.log = [*job.log, {'message': message, 'level': level, 'at': timezone.now().isoformat()}][-200:]
    job.save(update_fields=['log', 'updated_at'])


def _prepare_sources(sources: list[AlgorithmSource], job: AlgorithmScanJob) -> tuple[list[str], list[dict]]:
    document_ids, explicit = [], []
    for source in sources:
        if source.document_id:
            if (source.document.status == Document.Status.READY
                    and source.document.scope == Document.Scope.CS):
                document_ids.append(str(source.document_id))
            else:
                _log(job, f'Bỏ qua “{source.name}”: tài liệu không sẵn sàng cho phạm vi thuật toán.', 'warning')
            continue
        try:
            item = fetch_source_text(source.url, source.allowed_domain)
            explicit.append({**item, 'license_name': source.license_name})
        except SourceFetchError as exc:
            _log(job, f'Không đọc được “{source.name}”: {exc}', 'warning')
    return document_ids, explicit


def _save_candidate(job: AlgorithmScanJob, algorithm: Algorithm, sources: list[AlgorithmSource], data: dict):
    ai_status = data.get('status')
    status_map = {
        'pending': AlgorithmDraftCandidate.Status.PENDING,
        'no_source': AlgorithmDraftCandidate.Status.NO_SOURCE,
        'failed': AlgorithmDraftCandidate.Status.FAILED,
    }
    return AlgorithmDraftCandidate.objects.create(
        algorithm=algorithm,
        job=job,
        status=status_map.get(ai_status, AlgorithmDraftCandidate.Status.FAILED),
        fields=data.get('fields') if isinstance(data.get('fields'), dict) else {},
        citations=data.get('citations') if isinstance(data.get('citations'), list) else [],
        source_ids=[source.pk for source in sources],
        query=f'{algorithm.name} algorithm {algorithm.category.name_en}'[:500],
        prompt_version=str(data.get('prompt_version') or '')[:50],
        warnings=data.get('warnings') if isinstance(data.get('warnings'), list) else [],
        error=str(data.get('error') or ''),
        created_by=job.created_by,
    )


def run_scan_job(job_id):
    close_old_connections()
    job = AlgorithmScanJob.objects.get(pk=job_id)
    job.status = AlgorithmScanJob.Status.RUNNING
    job.save(update_fields=['status', 'updated_at'])
    try:
        paths = job.params.get('algorithm_paths', [])
        sources = list(AlgorithmSource.objects.select_related('document').filter(
            pk__in=job.params.get('source_ids', []), enabled=True,
        ).order_by('priority', 'name'))
        algorithms = {
            item.path: item
            for item in Algorithm.objects.select_related('category').filter(
                category__key__in={path.split('/', 1)[0] for path in paths if '/' in path},
            )
            if item.path in paths
        }
        if not sources:
            raise ValueError('Không có nguồn đang bật trong lựa chọn.')
        document_ids, explicit = _prepare_sources(sources, job)
        if not document_ids and not explicit:
            raise ValueError('Không đọc được nguồn hợp lệ nào.')
        for path in paths:
            algorithm = algorithms.get(path)
            if algorithm is None:
                job.failed += 1
                job.processed += 1
                _log(job, f'Không tìm thấy thuật toán {path}.', 'error')
                continue
            try:
                data = call_ai(
                    '/v1/draft/algorithm',
                    {
                        'name': algorithm.name, 'category': algorithm.category.name_en,
                        'document_ids': document_ids, 'explicit_sources': explicit,
                    },
                    user=job.created_by, feature='algorithm_draft', count_quota=False, timeout=300,
                )
                candidate = _save_candidate(job, algorithm, sources, data)
                if candidate.status == AlgorithmDraftCandidate.Status.PENDING:
                    job.succeeded += 1
                    _log(job, f'{algorithm.name}: đã tạo đề xuất để duyệt.', 'success')
                else:
                    job.failed += 1
                    _log(job, f'{algorithm.name}: {candidate.error or "nguồn chưa đủ"}.', 'warning')
            except AIError as exc:
                job.failed += 1
                AlgorithmDraftCandidate.objects.create(
                    algorithm=algorithm, job=job, status=AlgorithmDraftCandidate.Status.FAILED,
                    source_ids=[source.pk for source in sources], error=str(exc), created_by=job.created_by,
                )
                _log(job, f'{algorithm.name}: {exc}', 'error')
            job.processed += 1
            job.save(update_fields=['processed', 'succeeded', 'failed', 'updated_at'])
        job.status = AlgorithmScanJob.Status.DONE
    except Exception as exc:  # noqa: BLE001 - persist failure for the polling UI
        job.status = AlgorithmScanJob.Status.FAILED
        job.error = str(exc)
        _log(job, str(exc), 'error')
    finally:
        job.finished_at = timezone.now()
        job.save(update_fields=['status', 'error', 'finished_at', 'updated_at'])
        close_old_connections()


def start_scan_job(paths: list[str], source_ids: list[int], user) -> AlgorithmScanJob:
    job = AlgorithmScanJob.objects.create(
        params={'algorithm_paths': paths, 'source_ids': source_ids}, total=len(paths), created_by=user,
    )
    threading.Thread(target=run_scan_job, args=(job.pk,), daemon=True, name=f'algorithm-scan-{job.pk}').start()
    return job


def _reference_lines(citations: list[dict]) -> str:
    lines = []
    for citation in citations:
        title = str(citation.get('citation') or citation.get('document_title') or '').strip()
        url = str(citation.get('url') or '').strip()
        line = ' — '.join(part for part in (title, url) if part)
        if line and line not in lines:
            lines.append(line)
    return '\n'.join(lines)


@transaction.atomic
def apply_candidate(candidate: AlgorithmDraftCandidate, fields: list[str], user) -> AlgorithmContent:
    if candidate.status != AlgorithmDraftCandidate.Status.PENDING:
        raise ValueError('Đề xuất này không còn ở trạng thái chờ duyệt.')
    selected = [field for field in fields if field in LESSON_FIELDS]
    if not selected:
        raise ValueError('Hãy chọn ít nhất một mục nội dung để áp dụng.')
    usable_sources = AlgorithmSource.objects.filter(pk__in=candidate.source_ids, enabled=True).filter(
        Q(kind=AlgorithmSource.Kind.URL)
        | Q(
            document__status=Document.Status.READY,
            document__scope=Document.Scope.CS,
        ),
    ).count()
    if usable_sources != len(set(candidate.source_ids)):
        raise ValueError('Một nguồn của đề xuất đã bị tắt hoặc không còn hợp lệ. Hãy quét lại.')
    content, _ = AlgorithmContent.objects.select_for_update().get_or_create(algorithm=candidate.algorithm)
    current = {field: '' for field in LESSON_FIELDS}
    if isinstance(content.lesson_fields, dict):
        current.update({key: value for key, value in content.lesson_fields.items() if key in current and isinstance(value, str)})
    for field in selected:
        item = candidate.fields.get(field, {})
        value = item.get('value') if isinstance(item, dict) else ''
        if isinstance(value, str) and value.strip():
            current[field] = value.strip()
    if 'references' in selected:
        generated = _reference_lines(candidate.citations)
        if generated:
            current['references'] = generated
    content.lesson_fields = current
    content.summary = current['summary']
    content.theory = current['theory']
    content.applications = [line.strip() for line in current['applications'].splitlines() if line.strip()]
    content.status = ContentStatus.DRAFT
    content.updated_by = user
    content.save()

    document_ids = {str(value) for value in Document.objects.filter(
        pk__in=[item.get('document_id') for item in candidate.citations if item.get('document_id')],
        status=Document.Status.READY,
        scope=Document.Scope.CS,
    ).values_list('pk', flat=True)}
    chunk_documents = dict(DocumentChunk.objects.filter(
        pk__in=[item.get('chunk_id') for item in candidate.citations if item.get('chunk_id')],
        document_id__in=document_ids,
    ).values_list('pk', 'document_id'))
    for item in candidate.citations:
        if str(item.get('document_id') or '') not in document_ids:
            continue
        chunk_id = item.get('chunk_id')
        if str(chunk_documents.get(chunk_id)) != str(item['document_id']):
            chunk_id = None
        AlgorithmReference.objects.update_or_create(
            algorithm=candidate.algorithm, document_id=item['document_id'], chunk_id=chunk_id,
            defaults={
                'page_start': item.get('page_start'), 'page_end': item.get('page_end'),
                'excerpt': str(item.get('excerpt') or '')[:4000],
            },
        )
    candidate.status = AlgorithmDraftCandidate.Status.APPLIED
    candidate.reviewed_by = user
    candidate.reviewed_at = timezone.now()
    candidate.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
    return content

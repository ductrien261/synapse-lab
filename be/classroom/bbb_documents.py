from pathlib import Path
from urllib.parse import urlencode, urljoin

from django.conf import settings
from django.core import signing
from django.urls import reverse
from django.utils.text import slugify

from .models import Classroom, LessonResource


BBB_RESOURCE_TOKEN_SALT = 'classroom.bbb-resource-download'


def build_bbb_presentation_documents(classroom: Classroom) -> list[dict[str, str | bool]]:
    """Return ordered, BBB-compatible lesson documents for a classroom."""
    resources = (
        LessonResource.objects.filter(
            section__plan__classroom=classroom,
            visible_to_students=True,
        )
        .select_related('section')
        .order_by('section__position', 'position', 'created_at')
    )
    documents: list[dict[str, str | bool]] = []
    for resource in resources:
        source = _bbb_file_source(resource)
        if not source:
            continue
        download_url = _signed_resource_url(resource, source)
        filename_stem = slugify(Path(resource.title).stem) or f'lesson-{resource.id}'
        documents.append({
            'url': download_url,
            'filename': f'{filename_stem}.pdf',
            'downloadable': resource.allow_download,
            'removable': False,
            'current': not documents,
        })
    return documents


def build_bbb_pdf_reader_url(classroom: Classroom) -> str:
    """Return the first visible PDF in Synapse's synchronized HTML reader."""
    resource = (
        LessonResource.objects.filter(
            section__plan__classroom=classroom,
            kind=LessonResource.Kind.PDF,
            visible_to_students=True,
        )
        .exclude(file='')
        .order_by('section__position', 'position', 'created_at')
        .first()
    )
    return _signed_resource_url(resource, 'file', reader=True) if resource else ''


def _signed_resource_url(
    resource: LessonResource,
    source: str,
    *,
    inline=False,
    reader=False,
) -> str:
    token = signing.dumps(
        {'resource_id': str(resource.id), 'source': source},
        salt=BBB_RESOURCE_TOKEN_SALT,
        compress=True,
    )
    route_name = 'lesson-resource-bbb-reader' if reader else 'lesson-resource-bbb-download'
    path = reverse(route_name, kwargs={'resource_id': resource.id})
    base_url = settings.BBB_ASSET_BASE_URL.rstrip('/') + '/'
    query = {'token': token}
    if inline:
        query['inline'] = '1'
    return f'{urljoin(base_url, path.lstrip("/"))}?{urlencode(query)}'


def resolve_bbb_resource_download(resource_id, token: str):
    payload = signing.loads(
        token,
        salt=BBB_RESOURCE_TOKEN_SALT,
        max_age=settings.BBB_RESOURCE_URL_TTL,
    )
    if payload.get('resource_id') != str(resource_id):
        raise signing.BadSignature('Tài liệu không khớp token.')
    resource = LessonResource.objects.get(pk=resource_id, visible_to_students=True)
    source = payload.get('source')
    if source not in {'file', 'preview_pdf'}:
        raise signing.BadSignature('Nguồn tài liệu không hợp lệ.')
    file_field = getattr(resource, source)
    if not file_field:
        raise signing.BadSignature('Tài liệu không còn tồn tại.')
    return resource, file_field


def _bbb_file_source(resource: LessonResource) -> str | None:
    if (
        resource.kind == LessonResource.Kind.SLIDE
        and resource.preview_status == LessonResource.PreviewStatus.READY
        and resource.preview_pdf
    ):
        return 'preview_pdf'
    if resource.kind == LessonResource.Kind.PDF and resource.file:
        return 'file'
    return None

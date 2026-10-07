"""Small, reviewed PDF catalog for the computer-science knowledge base."""

from dataclasses import dataclass

import requests
from django.core.files.base import ContentFile

from ..models import Document


MAX_PDF_BYTES = 50 * 1024 * 1024
CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/'


@dataclass(frozen=True)
class CuratedPdf:
    key: str
    title: str
    authors: str
    year: int | None
    url: str
    landing_url: str
    license_name: str = 'CC BY 4.0'
    license_url: str = CC_BY_URL


SOURCES = {
    source.key: source for source in (
        CuratedPdf(
            key='erickson-backtracking', title='Algorithms — Backtracking',
            authors='Jeff Erickson', year=2019,
            url='https://jeffe.cs.illinois.edu/teaching/algorithms/book/02-backtracking.pdf',
            landing_url='https://jeffe.cs.illinois.edu/teaching/algorithms/',
        ),
        CuratedPdf(
            key='erickson-greedy', title='Algorithms — Greedy Algorithms',
            authors='Jeff Erickson', year=2019,
            url='https://jeffe.cs.illinois.edu/teaching/algorithms/book/04-greedy.pdf',
            landing_url='https://jeffe.cs.illinois.edu/teaching/algorithms/',
        ),
        CuratedPdf(
            key='morin-open-data-structures', title='Open Data Structures (Pseudocode Edition)',
            authors='Pat Morin', year=None,
            url='https://opendatastructures.org/ods-python.pdf',
            landing_url='https://opendatastructures.org/',
            license_name='CC BY 2.5 CA',
            license_url='https://creativecommons.org/licenses/by/2.5/ca/',
        ),
    )
}


class SourceDownloadError(RuntimeError):
    pass


def download_pdf(source: CuratedPdf) -> bytes:
    """Fetch only catalog URLs, with a hard byte cap and PDF signature check."""
    try:
        with requests.get(source.url, stream=True, timeout=(10, 45), allow_redirects=False) as response:
            response.raise_for_status()
            if int(response.headers.get('Content-Length', 0)) > MAX_PDF_BYTES:
                raise SourceDownloadError('File PDF vượt giới hạn 50 MB.')
            data = bytearray()
            for part in response.iter_content(chunk_size=64 * 1024):
                data.extend(part)
                if len(data) > MAX_PDF_BYTES:
                    raise SourceDownloadError('File PDF vượt giới hạn 50 MB.')
    except requests.RequestException as exc:
        raise SourceDownloadError('Không tải được PDF từ trang tác giả.') from exc
    if not data.startswith(b'%PDF-'):
        raise SourceDownloadError('Nguồn trả về không phải PDF hợp lệ.')
    return bytes(data)


def create_document(source: CuratedPdf, data: bytes, user=None) -> Document:
    document = Document(
        source_type=Document.SourceType.PDF, source_key=source.key,
        source_url=source.url, title=source.title, authors=source.authors,
        year=source.year, meta={'landing_url': source.landing_url},
        license_name=source.license_name, license_url=source.license_url,
        language='en', scope=Document.Scope.CS,
        original_filename=f'{source.key}.pdf', file_size=len(data),
        mime_type='application/pdf', uploaded_by=user,
    )
    document.file.save(f'{source.key}.pdf', ContentFile(data), save=False)
    document.save()
    return document

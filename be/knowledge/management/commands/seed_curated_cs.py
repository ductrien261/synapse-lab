"""Build and apply a reviewed, repeatable index for the three curated CS books.

The seed is plain JSON so source text, headings, and citation targets can be reviewed
before the database is changed. No medical or general documents are selected.
"""

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse

import pymupdf
from django.contrib.postgres.search import SearchVector
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from algorithms.models import AlgorithmReference
from knowledge.models import Document, DocumentChunk, IngestJob
from knowledge.services import curated
from knowledge.services.chunking import Section, chunk_sections
from knowledge.services.pdf import clean_pdf_text, parse_pdf


SEED_PATH = Path(__file__).resolve().parents[2] / 'data' / 'curated_cs_seed.json'
EXPECTED_PDFS = {
    'erickson-backtracking': ('fb4f7e09c7148ac077d6cfaa26918adcdfe422318d5525e9539076a26b980c8c', 26),
    'erickson-greedy': ('ceb162189ce7e9223656fdbae9b83dbb92bc3a258d82c57b02c01f645f55f090', 28),
    'morin-open-data-structures': ('2bdd7e8129fff83daf04cd594fce5236d72b1d8b8c72832fde22ea762a7e014f', 326),
}


def _document(key):
    matches = list(Document.objects.filter(scope=Document.Scope.CS, source_type=Document.SourceType.PDF, source_key=key))
    if len(matches) != 1 or not matches[0].file:
        raise CommandError(f'{key}: expected exactly one stored CS PDF')
    return matches[0]


def _verified_pdf(document):
    with document.file.open('rb') as source:
        data = source.read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_PDFS[document.source_key][0]:
        raise CommandError(f'{document.source_key}: stored PDF differs from reviewed source')
    return data


def _medical_fingerprint():
    """Read-only guard: record medical document and chunk identities/content."""
    digest = hashlib.sha256()
    for row in Document.objects.filter(scope=Document.Scope.MED).order_by('pk').values_list('pk', 'source_key', 'chunk_count'):
        digest.update(repr(row).encode('utf-8'))
    for row in DocumentChunk.objects.filter(document__scope=Document.Scope.MED).order_by('pk').values_list('pk', 'document_id', 'content'):
        digest.update(repr(row).encode('utf-8'))
    return digest.hexdigest()


def _ods_sections(data):
    """Use the PDF's authored table of contents for page-accurate citations."""
    pdf = pymupdf.open(stream=data, filetype='pdf')
    toc = pdf.get_toc()
    if len(toc) < 100 or pdf.page_count != EXPECTED_PDFS['morin-open-data-structures'][1]:
        raise CommandError('ODS PDF outline/page count differs from reviewed copy')
    sections = []
    path = []
    toc_index = 0
    for page_no, page in enumerate(pdf, start=1):
        while toc_index < len(toc) and toc[toc_index][2] <= page_no:
            level, title, _ = toc[toc_index]
            path = path[:level - 1] + [title.strip()]
            toc_index += 1
        if page_no < 13 or (path and path[0].casefold() in {'bibliography', 'index'}):
            continue
        text = ' '.join(clean_pdf_text(page.get_text('text', sort=True)).split())
        if len(text) >= 80:
            sections.append(Section(path.copy() or ['Open Data Structures'], text, page=page_no))
    pdf.close()
    if len(sections) < 250:
        raise CommandError(f'ODS text extraction is incomplete: {len(sections)} pages')
    return sections


def _erickson_sections(data, title):
    """Recover subsection names from the chapter's damaged numeric glyphs."""
    sections, pages = parse_pdf(data, title, normalize_text=True, split_pages=True)
    pdf = pymupdf.open(stream=data, filetype='pdf')
    page_titles = {}
    for page_no, page in enumerate(pdf, start=1):
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                raw = ' '.join(span['text'].strip() for span in line['spans']).strip()
                if not raw.startswith('\uffff.') or len(raw) > 120:
                    continue
                candidate = clean_pdf_text(raw).strip(' .')
                candidate = re.sub(r'^\d+\.\s*', '', candidate).strip()
                if 5 <= sum(char.isalpha() for char in candidate) and len(candidate) <= 80:
                    page_titles[page_no] = candidate
                    break
            if page_no in page_titles:
                break
    pdf.close()
    active_title = ''
    for section in sections:
        candidate = page_titles.get(section.page)
        if candidate and not (active_title and candidate.startswith(active_title)):
            active_title = candidate
        if active_title:
            section.heading_path = [title, active_title]
    return sections, pages


def _rows(key, sections):
    rows = []
    for draft in chunk_sections(sections):
        section = draft.section
        content = ''.join(' ' if 0xe000 <= ord(char) <= 0xf8ff else char for char in draft.text)
        content = ' '.join(content.split())
        if len(content) < 40:
            continue
        if key == 'morin-open-data-structures' and sum(char.isalpha() for char in content) / len(content) < 0.35:
            continue
        rows.append({
            'section_key': urlparse(section.url).path.rsplit('/', 1)[-1] if section.url else f'page-{section.page}',
            'section_title': section.heading_path[-1][:300],
            'heading': section.breadcrumb[:500],
            'url': section.url or f'{curated.SOURCES[key].url}#page={section.page}',
            'page': section.page,
            'content': content,
        })
    return rows


class Command(BaseCommand):
    help = 'Build a reviewed CS source seed, inspect it, then atomically apply to only three CS PDFs.'

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument('--build', action='store_true', help='Build JSON seed; do not change DB.')
        group.add_argument('--apply', action='store_true', help='Validate JSON and replace three CS indexes.')

    def handle(self, *args, **options):
        if options['build']:
            self.build()
        else:
            self.apply()

    def build(self):
        result = {'version': 1, 'sources': {}}
        for key in EXPECTED_PDFS:
            document = _document(key)
            data = _verified_pdf(document)
            if key == 'morin-open-data-structures':
                sections = _ods_sections(data)
                mode = 'outlined_pdf'
            else:
                sections, page_count = _erickson_sections(data, document.title)
                if page_count != EXPECTED_PDFS[key][1]:
                    raise CommandError(f'{key}: page count changed')
                mode = 'page_aware_pdf'
            rows = _rows(key, sections)
            result['sources'][key] = {
                'pdf_sha256': EXPECTED_PDFS[key][0], 'page_count': EXPECTED_PDFS[key][1],
                'source_url': curated.SOURCES[key].url,
                'license_name': curated.SOURCES[key].license_name,
                'license_url': curated.SOURCES[key].license_url,
                'extraction': mode, 'rows': rows,
            }
            self.stdout.write(f'{key}: {len(sections)} sections, {len(rows)} chunks')
        self._validate(result)
        SEED_PATH.parent.mkdir(parents=True, exist_ok=True)
        SEED_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        self.stdout.write(f'Seed written: {SEED_PATH}')

    def _validate(self, seed):
        if seed.get('version') != 1 or set(seed.get('sources', {})) != set(EXPECTED_PDFS):
            raise CommandError('Seed source list/version does not match reviewed CS catalog')
        for key, (digest, pages) in EXPECTED_PDFS.items():
            source = seed['sources'][key]
            rows = source.get('rows', [])
            if source.get('pdf_sha256') != digest or source.get('page_count') != pages:
                raise CommandError(f'{key}: source PDF metadata mismatch')
            catalog = curated.SOURCES[key]
            if (source.get('source_url'), source.get('license_name'), source.get('license_url')) != (
                catalog.url, catalog.license_name, catalog.license_url,
            ):
                raise CommandError(f'{key}: attribution metadata mismatch')
            if len(rows) < (200 if key == 'morin-open-data-structures' else 30):
                raise CommandError(f'{key}: too few chunks ({len(rows)})')
            if len({row['page'] for row in rows}) < (250 if key == 'morin-open-data-structures' else pages - 1):
                raise CommandError(f'{key}: too few distinct cited pages')
            if key == 'morin-open-data-structures' and len({row['heading'] for row in rows}) < 100:
                raise CommandError('ODS PDF outline headings were not preserved')
            if key != 'morin-open-data-structures' and len({row['heading'] for row in rows}) < 4:
                raise CommandError(f'{key}: Erickson subsection headings were not preserved')
            for row in rows:
                if not row.get('content') or not row.get('heading') or not row.get('url'):
                    raise CommandError(f'{key}: empty content/heading/citation')
                if row['page'] is not None and not (1 <= row['page'] <= pages):
                    raise CommandError(f'{key}: invalid PDF page')
                if row['page'] is None or not row['url'].startswith(curated.SOURCES[key].url + '#page='):
                    raise CommandError(f'{key}: missing PDF page')
                if '\ufffd' in row['content'] or any(0xe000 <= ord(char) <= 0xf8ff for char in row['content']):
                    raise CommandError(f'{key}: unrecoverable PDF glyph in seed')

    def apply(self):
        if not SEED_PATH.exists():
            raise CommandError('Seed file missing; run --build first')
        seed = json.loads(SEED_PATH.read_text(encoding='utf-8'))
        self._validate(seed)
        if IngestJob.objects.filter(status__in=[IngestJob.Status.RUNNING, IngestJob.Status.QUEUED]).exists():
            raise CommandError('Another document ingest is active')
        docs = {key: _document(key) for key in EXPECTED_PDFS}
        medical_before = _medical_fingerprint()
        for key, document in docs.items():
            _verified_pdf(document)
            if AlgorithmReference.objects.filter(document=document, chunk__isnull=False).exists():
                raise CommandError(f'{key}: a saved algorithm reference points to an old chunk')
        with transaction.atomic():
            for key, document in docs.items():
                locked = Document.objects.select_for_update().get(pk=document.pk)
                rows = seed['sources'][key]['rows']
                DocumentChunk.objects.filter(document=locked).delete()
                DocumentChunk.objects.bulk_create([
                    DocumentChunk(
                        document=locked, index=index, section_key=row['section_key'][:200],
                        section_title=row['section_title'][:300], heading=row['heading'][:500],
                        url=row['url'][:600], content=row['content'],
                        page_start=row['page'], page_end=row['page'],
                        token_count=len(row['content']) // 4,
                    ) for index, row in enumerate(rows)
                ], batch_size=200)
                DocumentChunk.objects.filter(document=locked).update(
                    search_vector=SearchVector('heading', weight='A', config='english')
                    + SearchVector('content', weight='B', config='english')
                )
                locked.chunk_count = len(rows)
                locked.page_count = seed['sources'][key]['page_count']
                locked.meta = {**locked.meta, 'index_mode': 'keyword',
                               'index_source': seed['sources'][key]['extraction'],
                               'seed_version': 1}
                locked.status = Document.Status.READY
                locked.error_message = ''
                locked.processed_at = timezone.now()
                locked.save(update_fields=['chunk_count', 'page_count', 'meta', 'status',
                                           'error_message', 'processed_at', 'updated_at'])
                self.stdout.write(f'{key}: indexed {len(rows)} chunks')
            if _medical_fingerprint() != medical_before:
                raise CommandError('Medical data changed during CS seed transaction; rolled back')
        self.stdout.write('Medical document and chunk fingerprint unchanged.')

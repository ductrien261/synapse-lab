"""Import reviewed, openly licensed CS PDFs through the normal ingest worker."""

from django.core.management.base import BaseCommand, CommandError

from knowledge.models import Document, IngestJob
from knowledge.services import curated
from knowledge.services.embeddings import is_configured
from knowledge.services.ingest import _worker, active_job


class Command(BaseCommand):
    help = 'Import selected CC BY computer-science PDFs into the knowledge base.'

    def add_arguments(self, parser):
        parser.add_argument('keys', nargs='+', choices=tuple(curated.SOURCES))
        parser.add_argument('--keyword-only', action='store_true', help='Build full-text index without calling Gemini.')
        parser.add_argument('--refresh', action='store_true', help='Reparse and replace chunks for existing sources.')

    def handle(self, *args, **options):
        if not options['keyword_only'] and not is_configured():
            raise CommandError('GEMINI_API_KEY is required to index these PDFs.')
        if active_job():
            raise CommandError('An ingest job is already running.')
        for key in dict.fromkeys(options['keys']):
            document = Document.objects.filter(
                source_type=Document.SourceType.PDF, scope=Document.Scope.CS, source_key=key,
            ).first()
            if document and document.status == Document.Status.READY and not options['refresh'] and (options['keyword_only'] or document.meta.get('index_mode') == 'hybrid'):
                self.stdout.write(f'{key}: already indexed; skipped')
                continue
            if document is None:
                source = curated.SOURCES[key]
                self.stdout.write(f'{key}: downloading {source.url}')
                try:
                    data = curated.download_pdf(source)
                except curated.SourceDownloadError as exc:
                    raise CommandError(str(exc)) from exc
                document = curated.create_document(source, data)
            job = IngestJob.objects.create(kind=IngestJob.Kind.PDF, document=document,
                                           params={'keyword_only': options['keyword_only']})
            _worker(job.pk)
            job.refresh_from_db()
            document.refresh_from_db()
            self.stdout.write(f'{key}: {job.status}, {document.page_count} pages, {document.chunk_count} chunks')
            if job.status != IngestJob.Status.DONE:
                raise CommandError(f'{key}: {document.error_message or "ingest failed"}')

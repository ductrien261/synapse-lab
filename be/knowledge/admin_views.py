"""API trang quản trị Tài liệu (chỉ admin)."""

from pathlib import Path

from django.core.cache import cache
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_gateway.services import AIError, call_ai
from users.permissions import IsAdminRole

from .models import Document, DocumentChunk, IngestJob
from .serializers import DocumentSerializer, IngestJobSerializer
from .services import embeddings, openstax
from .services.ingest import active_job, refresh_document_stats, start_job

MAX_PDF_BYTES = 50 * 1024 * 1024
BOOK_CACHE_SECONDS = 60 * 60


def _book_cache_key(slug: str) -> str:
    return f'knowledge:openstax:{slug}'


def _busy(job: IngestJob):
    return Response(
        {'detail': 'Đang có một lượt nạp tài liệu chạy. Đợi xong hoặc dừng lượt đó trước.', 'job': IngestJobSerializer(job).data},
        status=status.HTTP_409_CONFLICT,
    )


def _require_embeddings():
    if not embeddings.is_configured():
        return Response({'detail': 'Chưa cấu hình GEMINI_API_KEY nên chưa tạo vector được.'}, status=status.HTTP_400_BAD_REQUEST)
    return None


def _documents():
    return Document.objects.annotate(section_count=Count('chunks__section_key', distinct=True))


def _sections(document: Document) -> list[dict]:
    rows = (
        document.chunks.values('section_key', 'section_title')
        .annotate(chunks=Count('id'))
    )
    order = {}
    if document.source_type == Document.SourceType.OPENSTAX:
        for ci, chapter in enumerate(document.meta.get('toc', [])):
            for pi, page in enumerate(chapter['pages']):
                order[page['slug']] = (ci, pi)
    result = []
    for r in rows:
        key = r['section_key']
        url = openstax.page_url(document.source_key, key) if document.source_type == Document.SourceType.OPENSTAX else ''
        result.append({'key': key, 'title': r['section_title'] or key, 'chunks': r['chunks'], 'url': url})
    result.sort(key=lambda r: order.get(r['key'], (9999, r['key'])))
    return result


class StatsView(APIView):
    """GET /api/knowledge/admin/stats/"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        docs = Document.objects.aggregate(total=Count('id'), ready=Count('id', filter=Q(status=Document.Status.READY)))
        return Response({
            'documents': docs,
            'chunks': DocumentChunk.objects.count(),
            'sections': DocumentChunk.objects.values('document_id', 'section_key').distinct().count(),
            'embeddings_configured': embeddings.is_configured(),
        })


class DocumentListView(APIView):
    """GET /api/knowledge/admin/documents/"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(DocumentSerializer(_documents(), many=True).data)


class DocumentDetailView(APIView):
    """GET / PATCH / DELETE /api/knowledge/admin/documents/<id>/"""

    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        document = get_object_or_404(_documents(), pk=pk)
        data = DocumentSerializer(document).data
        data['sections'] = _sections(document)
        data['toc'] = document.meta.get('toc', []) if document.source_type == Document.SourceType.OPENSTAX else []
        return Response(data)

    def patch(self, request, pk):
        document = get_object_or_404(_documents(), pk=pk)
        serializer = DocumentSerializer(document, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        document = get_object_or_404(Document, pk=pk)
        job = active_job()
        if job and job.document_id == document.pk:
            return _busy(job)
        if document.file:
            document.file.delete(save=False)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RemoveSectionsView(APIView):
    """POST /api/knowledge/admin/documents/<id>/sections/remove/  {keys: [...]}"""

    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        document = get_object_or_404(Document, pk=pk)
        keys = [k for k in request.data.get('keys', []) if isinstance(k, str)]
        job = active_job()
        if job and job.document_id == document.pk:
            return _busy(job)
        deleted, _ = DocumentChunk.objects.filter(document=document, section_key__in=keys).delete()
        refresh_document_stats(document)
        if not document.chunks.exists():
            Document.objects.filter(pk=document.pk).update(status=Document.Status.PENDING)
        return Response({'deleted_chunks': deleted})


class OpenStaxScanView(APIView):
    """POST /api/knowledge/admin/openstax/scan/  {url} -> mục lục sách (chưa lưu gì vào kho)"""

    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        url = serializers.CharField(max_length=500)

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            book = openstax.load_book(data.validated_data['url'])
        except openstax.OpenStaxError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        cache.set(_book_cache_key(book['slug']), book, BOOK_CACHE_SECONDS)

        document = Document.objects.filter(source_type=Document.SourceType.OPENSTAX, source_key=book['slug']).first()
        ingested: list[str] = []
        if document:
            document.meta = {**document.meta, 'toc': book['toc']}
            document.license_name, document.license_url = book['license_name'], book['license_url']
            document.save(update_fields=['meta', 'license_name', 'license_url', 'updated_at'])
            ingested = list(document.chunks.values_list('section_key', flat=True).distinct())
        return Response({'book': book, 'document_id': str(document.pk) if document else None, 'ingested': ingested})


class OpenStaxIngestView(APIView):
    """POST /api/knowledge/admin/openstax/ingest/  {book: slug, pages: [slug...], scope}"""

    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        book = serializers.SlugField(max_length=200)
        pages = serializers.ListField(child=serializers.CharField(max_length=200), min_length=1, max_length=400)
        scope = serializers.ChoiceField(choices=Document.Scope.choices, required=False)

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        slug = data.validated_data['book']
        if (err := _require_embeddings()) is not None:
            return err
        if (job := active_job()) is not None:
            return _busy(job)

        document = Document.objects.filter(source_type=Document.SourceType.OPENSTAX, source_key=slug).first()
        book = cache.get(_book_cache_key(slug))
        if document is None and book is None:
            return Response({'detail': 'Hãy quét lại mục lục sách trước khi nạp.'}, status=status.HTTP_400_BAD_REQUEST)
        if document is None:
            document = Document.objects.create(
                source_type=Document.SourceType.OPENSTAX,
                source_key=slug,
                source_url=book['url'],
                title=book['title'],
                publisher='OpenStax',
                license_name=book['license_name'],
                license_url=book['license_url'],
                language='en',
                scope=data.validated_data.get('scope') or Document.Scope.MED,
                meta={'toc': book['toc']},
                uploaded_by=request.user,
            )
        elif data.validated_data.get('scope'):
            document.scope = data.validated_data['scope']
            document.save(update_fields=['scope', 'updated_at'])

        toc = document.meta.get('toc', [])
        pages = [p for p in dict.fromkeys(data.validated_data['pages']) if openstax.find_page(toc, p)]
        if not pages:
            return Response({'detail': 'Không có trang hợp lệ trong mục lục.'}, status=status.HTTP_400_BAD_REQUEST)
        job = start_job(IngestJob.Kind.OPENSTAX, document, {'pages': pages}, request.user)
        return Response(IngestJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class PdfUploadView(APIView):
    """POST /api/knowledge/admin/pdf/  (multipart) file, title, authors, year, scope"""

    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser]

    class Input(serializers.Serializer):
        file = serializers.FileField()
        title = serializers.CharField(max_length=300, required=False, allow_blank=True)
        authors = serializers.CharField(max_length=300, required=False, allow_blank=True)
        year = serializers.IntegerField(required=False, allow_null=True, min_value=1900, max_value=2100)
        scope = serializers.ChoiceField(choices=Document.Scope.choices, required=False)

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        upload = data.validated_data['file']
        if Path(upload.name).suffix.lower() != '.pdf':
            return Response({'detail': 'Chỉ nhận file .pdf'}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > MAX_PDF_BYTES:
            return Response({'detail': 'File quá lớn (tối đa 50 MB).'}, status=status.HTTP_400_BAD_REQUEST)
        if (err := _require_embeddings()) is not None:
            return err
        if (job := active_job()) is not None:
            return _busy(job)

        document = Document(
            source_type=Document.SourceType.PDF,
            title=data.validated_data.get('title') or Path(upload.name).stem,
            authors=data.validated_data.get('authors', ''),
            year=data.validated_data.get('year'),
            scope=data.validated_data.get('scope') or Document.Scope.GENERAL,
            original_filename=upload.name[:255],
            file_size=upload.size,
            mime_type='application/pdf',
            uploaded_by=request.user,
        )
        document.file.save(upload.name, upload, save=False)
        document.save()
        job = start_job(IngestJob.Kind.PDF, document, {}, request.user)
        return Response(IngestJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class JobView(APIView):
    """GET /api/knowledge/admin/jobs/latest/ hoặc /jobs/<id>/"""

    permission_classes = [IsAdminRole]

    def get(self, request, pk=None):
        active_job()  # dọn lượt treo
        job = IngestJob.objects.select_related('document').first() if pk is None else get_object_or_404(IngestJob, pk=pk)
        if job is None:
            return Response({'job': None})
        return Response(IngestJobSerializer(job).data)


class CancelJobView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        job = get_object_or_404(IngestJob, pk=pk)
        if job.status in (IngestJob.Status.QUEUED, IngestJob.Status.RUNNING):
            job.cancel_requested = True
            job.save(update_fields=['cancel_requested', 'updated_at'])
        return Response(IngestJobSerializer(job).data)


class SearchView(APIView):
    """GET /api/knowledge/admin/search/?q=&scope=&k=  -> thử tìm kiếm (không gọi LLM, trừ dịch câu tiếng Việt lần đầu)"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()[:500]
        if not q:
            return Response({'detail': 'Nhập câu hỏi để tìm.'}, status=status.HTTP_400_BAD_REQUEST)
        scope = request.query_params.get('scope') or None
        try:
            k = max(1, min(10, int(request.query_params.get('k') or 5)))
        except ValueError:
            k = 5
        try:
            data = call_ai('/v1/search', {'query': q, 'k': k, 'scope': scope}, user=request.user, feature='search', count_quota=False)
        except AIError as exc:
            return Response({'detail': str(exc)}, status=exc.status_code)
        data.pop('meta', None)
        return Response(data)

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone
from django.utils.text import slugify
from hashlib import sha256
from knowledge.models import Document
from urllib.parse import urlparse
from rest_framework import generics
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import ContentStatus
from users.permissions import IsAdminOrPublicRead, IsAdminRole, is_admin

from algorithms.services.imports import active_scan_job, apply_candidate, start_scan_job
from algorithms.services.missing import discover_missing
from algorithms.services.source_fetch import SourceFetchError, discover_algorithm_sources, fetch_source_text
from algorithms.models import (
    Algorithm, AlgorithmCategory, AlgorithmContent, AlgorithmDraftCandidate,
    AlgorithmScanJob, AlgorithmSource,
)
from .serializers import (
    AlgorithmCategorySerializer,
    AlgorithmContentSerializer,
    AlgorithmReferenceSerializer,
    AlgorithmDraftCandidateSerializer,
    AlgorithmScanJobSerializer,
    AlgorithmSourceSerializer,
    AlgorithmSerializer,
)

MAX_SCAN_SOURCES = 8
MAX_SCAN_ALGORITHMS = 30


class AlgorithmMissingDiscoveryView(APIView):
    """Read selected approved CS sources and suggest only topics absent from the catalog."""

    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        source_ids = serializers.ListField(
            child=serializers.IntegerField(min_value=1), min_length=1, max_length=MAX_SCAN_SOURCES,
        )

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        ids = list(dict.fromkeys(data.validated_data['source_ids']))
        sources = list(AlgorithmSource.objects.select_related('document').filter(pk__in=ids, enabled=True).filter(
            Q(kind=AlgorithmSource.Kind.URL)
            | Q(document__status=Document.Status.READY, document__scope=Document.Scope.CS),
        ))
        if len(sources) != len(ids):
            return Response({'detail': 'Có nguồn không tồn tại hoặc không thuộc kho CNTT.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(discover_missing(sources))


class AlgorithmCategoryListView(generics.ListAPIView):
    """GET /api/algorithms/ — danh mục đã đồng bộ từ algo-server."""

    serializer_class = AlgorithmCategorySerializer
    permission_classes = [IsAdminOrPublicRead]

    def get_queryset(self):
        include_drafts = is_admin(self.request.user) and self.request.query_params.get('include_drafts') == '1'
        algorithms = Algorithm.objects.select_related('category')
        categories = AlgorithmCategory.objects.all()
        if not include_drafts:
            algorithms = algorithms.filter(is_published=True)
            categories = categories.filter(algorithms__is_published=True).distinct()
        return categories.prefetch_related(Prefetch('algorithms', queryset=algorithms))


class AlgorithmDraftListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        contents = AlgorithmContent.objects.select_related('algorithm__category').defer('simulation')
        serializer = AlgorithmContentSerializer()
        serializer.fields.pop('simulation')
        return Response({content.algorithm.path: serializer.to_representation(content) for content in contents})


class AlgorithmDetailView(APIView):
    """
    GET /api/algorithms/<category_key>/<algorithm_key>/
        -> thông tin thuật toán + phần giải thích (học viên chỉ thấy bản đã duyệt)
    PUT /api/algorithms/<category_key>/<algorithm_key>/   (admin)
        -> tạo/cập nhật phần giải thích
    """

    permission_classes = [IsAdminOrPublicRead]

    def get_algorithm(self, category_key, algorithm_key):
        queryset = Algorithm.objects.select_related('category')
        if not is_admin(self.request.user):
            queryset = queryset.filter(is_published=True)
        return get_object_or_404(
            queryset,
            category__key=category_key,
            key=algorithm_key,
        )

    def get(self, request, category_key, algorithm_key):
        algorithm = self.get_algorithm(category_key, algorithm_key)
        content = getattr(algorithm, 'content', None)
        if content and content.status != ContentStatus.PUBLISHED and not is_admin(request.user):
            content = None
        return Response({
            'algorithm': AlgorithmSerializer(algorithm).data,
            'content': AlgorithmContentSerializer(content).data if content else None,
            'references': AlgorithmReferenceSerializer(algorithm.references.select_related('document'), many=True).data if content else [],
        })

    def put(self, request, category_key, algorithm_key):
        algorithm = self.get_algorithm(category_key, algorithm_key)
        content = getattr(algorithm, 'content', None)
        serializer = AlgorithmContentSerializer(content, data=request.data, partial=True, context={'algorithm_path': algorithm.path})
        serializer.is_valid(raise_exception=True)
        serializer.save(algorithm=algorithm, updated_by=request.user)
        return Response(serializer.data)


class AlgorithmSourceListView(APIView):
    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        name = serializers.CharField(max_length=300)
        kind = serializers.ChoiceField(choices=AlgorithmSource.Kind.choices)
        document = serializers.PrimaryKeyRelatedField(
            queryset=Document.objects.filter(
                status=Document.Status.READY, scope=Document.Scope.CS,
            ), required=False, allow_null=True,
        )
        url = serializers.URLField(max_length=600, required=False, allow_blank=True)
        allowed_domain = serializers.CharField(max_length=253, required=False, allow_blank=True)
        license_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
        priority = serializers.IntegerField(min_value=0, max_value=1000, required=False)

        def validate(self, attrs):
            kind = attrs['kind']
            if kind == AlgorithmSource.Kind.DOCUMENT and not attrs.get('document'):
                raise serializers.ValidationError('Nguồn tài liệu phải chọn một tài liệu đã sẵn sàng.')
            if kind == AlgorithmSource.Kind.DOCUMENT:
                if AlgorithmSource.objects.filter(document=attrs['document']).exists():
                    raise serializers.ValidationError('Tài liệu này đã có trong danh sách nguồn thuật toán.')
                attrs['url'] = ''
                attrs['allowed_domain'] = ''
            if kind == AlgorithmSource.Kind.URL:
                parsed = urlparse(attrs.get('url') or '')
                allowed = (attrs.get('allowed_domain') or '').lower().rstrip('.')
                host = (parsed.hostname or '').lower().rstrip('.')
                if parsed.scheme != 'https' or not allowed or not (host == allowed or host.endswith('.' + allowed)):
                    raise serializers.ValidationError('URL HTTPS phải thuộc đúng tên miền được duyệt.')
                attrs['document'] = None
            return attrs

    def get(self, request):
        sources = AlgorithmSource.objects.select_related('document').filter(enabled=True).filter(
            Q(kind=AlgorithmSource.Kind.URL)
            | Q(
                document__status=Document.Status.READY,
                document__scope=Document.Scope.CS,
            ),
        )
        return Response(AlgorithmSourceSerializer(sources, many=True).data)

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        source = AlgorithmSource.objects.create(**data.validated_data)
        return Response(AlgorithmSourceSerializer(source).data, status=status.HTTP_201_CREATED)


class AlgorithmSourcePreviewView(APIView):
    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        url = serializers.URLField(max_length=600)

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        url = data.validated_data['url']
        allowed_domain = (urlparse(url).hostname or '').lower().rstrip('.')
        try:
            source = fetch_source_text(url, allowed_domain)
        except SourceFetchError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({**source, 'allowed_domain': allowed_domain})


class AlgorithmSourceDiscoverView(APIView):
    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        candidate_id = serializers.IntegerField(min_value=1)

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        candidate = get_object_or_404(
            AlgorithmDraftCandidate.objects.select_related('algorithm__category'),
            pk=data.validated_data['candidate_id'],
            status=AlgorithmDraftCandidate.Status.PENDING,
        )
        fields = candidate.fields if isinstance(candidate.fields, dict) else {}
        gap_keys = [
            key for key, value in fields.items()
            if isinstance(value, dict) and value.get('status') in {'weak', 'missing', 'conflict'}
        ]
        existing_urls = set(AlgorithmSource.objects.filter(pk__in=candidate.source_ids).exclude(url='').values_list('url', flat=True))
        try:
            result = discover_algorithm_sources(
                candidate.algorithm.name,
                candidate.algorithm.category.name_en,
                gap_keys,
                existing_urls,
            )
        except SourceFetchError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({**result, 'gap_fields': gap_keys})


class AlgorithmSourceDetailView(APIView):
    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        enabled = serializers.BooleanField(required=False)
        priority = serializers.IntegerField(min_value=0, max_value=1000, required=False)

    def patch(self, request, pk):
        source = get_object_or_404(AlgorithmSource.objects.select_related('document'), pk=pk)
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        for key, value in data.validated_data.items():
            setattr(source, key, value)
        source.save(update_fields=[*data.validated_data, 'updated_at'])
        return Response(AlgorithmSourceSerializer(source).data)


class NewAlgorithmInput(serializers.Serializer):
    name = serializers.CharField(max_length=200, trim_whitespace=True)
    category_key = serializers.SlugField(max_length=100)


class AlgorithmScanStartView(APIView):
    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        algorithm_paths = serializers.ListField(
            child=serializers.CharField(max_length=260), min_length=1, max_length=MAX_SCAN_ALGORITHMS, required=False,
        )
        new_algorithm = NewAlgorithmInput(required=False)
        new_algorithms = serializers.ListField(
            child=NewAlgorithmInput(), min_length=1, max_length=MAX_SCAN_ALGORITHMS, required=False,
        )
        source_ids = serializers.ListField(
            child=serializers.IntegerField(min_value=1), min_length=1, max_length=MAX_SCAN_SOURCES,
        )

        def validate(self, attrs):
            if sum(key in attrs for key in ('algorithm_paths', 'new_algorithm', 'new_algorithms')) != 1:
                raise serializers.ValidationError('Chọn bài có sẵn hoặc cung cấp một hay nhiều bài từ nguồn mới.')
            return attrs

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        if job := active_scan_job():
            return Response(
                {'detail': 'Đang có một lượt quét thuật toán. Vui lòng đợi lượt đó hoàn tất.', 'job': AlgorithmScanJobSerializer(job).data},
                status=status.HTTP_409_CONFLICT,
            )
        paths = list(dict.fromkeys(data.validated_data.get('algorithm_paths', [])))
        source_ids = list(dict.fromkeys(data.validated_data['source_ids']))
        valid_sources = set(AlgorithmSource.objects.filter(pk__in=source_ids, enabled=True).filter(
            Q(kind=AlgorithmSource.Kind.URL)
            | Q(document__status=Document.Status.READY, document__scope=Document.Scope.CS),
        ).values_list('pk', flat=True))
        if len(valid_sources) != len(source_ids):
            return Response({'detail': 'Có nguồn không tồn tại hoặc đã bị tắt.'}, status=status.HTTP_400_BAD_REQUEST)
        specs = data.validated_data.get('new_algorithms') or (
            [data.validated_data['new_algorithm']] if 'new_algorithm' in data.validated_data else []
        )
        if specs:
            if any(spec['category_key'] == 'uncategorized' for spec in specs):
                AlgorithmCategory.objects.get_or_create(
                    key='uncategorized',
                    defaults={'name_en': 'Other', 'name_vi': 'Khác', 'order': 99},
                )
            categories = {
                item.key: item for item in AlgorithmCategory.objects.filter(
                    key__in={spec['category_key'] for spec in specs},
                )
            }
            resolved = []
            for spec in specs:
                category = categories.get(spec['category_key'])
                if category is None:
                    return Response({'detail': 'Có nhóm thuật toán không tồn tại.'}, status=status.HTTP_400_BAD_REQUEST)
                name = spec['name'].strip()
                base_key = slugify(name)[:130].strip('-')
                if not base_key:
                    return Response({'detail': 'Tên bài cần có chữ hoặc số để tạo mã.'}, status=status.HTTP_400_BAD_REQUEST)
                fingerprint = sha256(f'{source_ids[0]}:{category.key}:{base_key}'.encode()).hexdigest()[:10]
                key = f'{base_key}-{fingerprint}'
                resolved.append((category, key, name))
            paths = []
            for category, key, name in resolved:
                existing = Algorithm.objects.filter(category=category, key=key).first()
                if existing and (existing.is_published or hasattr(existing, 'content')):
                    return Response({'detail': f'Bài “{name}” từ nguồn này đã được nạp. Hãy mở bài đó trong kho để bổ sung.'}, status=status.HTTP_409_CONFLICT)
            for category, key, name in resolved:
                algorithm, _ = Algorithm.objects.get_or_create(
                    category=category, key=key,
                    defaults={'name': name, 'is_published': False},
                )
                # A source-specific draft path keeps published catalog lessons untouched.
                if algorithm.path not in paths:
                    paths.append(algorithm.path)
        job = start_scan_job(paths, source_ids, request.user)
        return Response(AlgorithmScanJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class AlgorithmScanJobView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        job = get_object_or_404(AlgorithmScanJob, pk=pk)
        return Response(AlgorithmScanJobSerializer(job).data)


class AlgorithmCandidateListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        candidates = AlgorithmDraftCandidate.objects.select_related('algorithm__category')
        if request.query_params.get('job'):
            candidates = candidates.filter(job_id=request.query_params['job'])
        if request.query_params.get('status'):
            candidates = candidates.filter(status=request.query_params['status'])
        return Response(AlgorithmDraftCandidateSerializer(candidates[:200], many=True).data)


class AlgorithmCandidateApplyView(APIView):
    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        fields = serializers.ListField(child=serializers.CharField(max_length=30), min_length=1, max_length=11)

    def post(self, request, pk):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        candidate = get_object_or_404(AlgorithmDraftCandidate.objects.select_related('algorithm'), pk=pk)
        try:
            content = apply_candidate(candidate, list(dict.fromkeys(data.validated_data['fields'])), request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'candidate': AlgorithmDraftCandidateSerializer(candidate).data,
            'content': AlgorithmContentSerializer(content).data,
        })


class AlgorithmCandidateApplyItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    fields = serializers.ListField(child=serializers.CharField(max_length=30), min_length=1, max_length=11)


class AlgorithmCandidateBulkApplyView(APIView):
    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        items = serializers.ListField(child=AlgorithmCandidateApplyItemSerializer(), min_length=1, max_length=30)

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        items = data.validated_data['items']
        ids = [item['id'] for item in items]
        if len(ids) != len(set(ids)):
            return Response({'detail': 'Danh sách đề xuất bị trùng.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                candidates = {
                    item.pk: item
                    for item in AlgorithmDraftCandidate.objects.select_for_update().select_related('algorithm').filter(pk__in=ids)
                }
                if len(candidates) != len(ids):
                    raise ValueError('Có đề xuất không tồn tại.')
                for item in items:
                    apply_candidate(candidates[item['id']], list(dict.fromkeys(item['fields'])), request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(AlgorithmDraftCandidateSerializer(
            [candidates[item['id']] for item in items], many=True,
        ).data)


class AlgorithmCandidateDiscardView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        candidate = get_object_or_404(AlgorithmDraftCandidate, pk=pk, status=AlgorithmDraftCandidate.Status.PENDING)
        candidate.status = AlgorithmDraftCandidate.Status.DISCARDED
        candidate.reviewed_by = request.user
        candidate.reviewed_at = timezone.now()
        candidate.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response(AlgorithmDraftCandidateSerializer(candidate).data)

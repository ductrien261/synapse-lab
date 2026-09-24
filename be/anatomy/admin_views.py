"""API cho trang quản trị giải phẫu (chỉ admin)."""

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import ContentStatus
from users.permissions import IsAdminRole

from .models import AnatomyModel, AnatomyToolCollection, BodySystem, ImportJob, Structure
from .serializers import (
    AdminModelDetailSerializer,
    AdminModelListSerializer,
    AdminStructureSerializer,
    CollectionSerializer,
    ImportJobSerializer,
)
from .services.annotations import sync_annotations
from .services.jobs import has_active_job, start_job

FILLED = Q(annotations__structure__definition__gt='') | Q(annotations__structure__function__gt='')


def admin_model_queryset():
    return AnatomyModel.objects.select_related('system').annotate(
        annotation_count=Count('annotations', distinct=True),
        filled_count=Count('annotations', filter=FILLED, distinct=True),
    )


class AdminModelListView(APIView):
    """GET /api/anatomy/admin/models/?status=draft|published&system=&search="""

    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = admin_model_queryset()
        p = request.query_params
        if p.get('status') == 'draft':
            qs = qs.filter(is_published=False)
        elif p.get('status') == 'published':
            qs = qs.filter(is_published=True)
        if p.get('system') == 'none':
            qs = qs.filter(system__isnull=True)
        elif p.get('system'):
            qs = qs.filter(system__slug=p['system'])
        if p.get('search'):
            term = p['search'].strip()
            qs = qs.filter(Q(title__icontains=term) | Q(title_vi__icontains=term) | Q(sketchfab_uid__icontains=term))
        return Response(AdminModelListSerializer(qs.order_by('-created_at'), many=True).data)


class BulkModelActionView(APIView):
    """POST /api/anatomy/admin/models/bulk/  {uids: [...], action: publish|unpublish|set_system|delete, system?}"""

    permission_classes = [IsAdminRole]

    class Body(serializers.Serializer):
        uids = serializers.ListField(child=serializers.CharField(max_length=32), min_length=1, max_length=500)
        action = serializers.ChoiceField(choices=['publish', 'unpublish', 'set_system', 'delete'])
        system = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def post(self, request):
        body = self.Body(data=request.data)
        body.is_valid(raise_exception=True)
        data = body.validated_data
        qs = AnatomyModel.objects.filter(sketchfab_uid__in=data['uids'])
        action = data['action']
        if action == 'publish':
            n = qs.update(is_published=True)
        elif action == 'unpublish':
            n = qs.update(is_published=False)
        elif action == 'set_system':
            system = BodySystem.objects.filter(slug=data.get('system') or '').first()
            n = qs.update(system=system)
        else:
            n, _ = qs.delete()
        return Response({'affected': n})


class AdminModelDetailView(APIView):
    """
    GET   /api/anatomy/admin/models/<uid>/        chi tiết để soạn (kể cả nháp)
    PATCH /api/anatomy/admin/models/<uid>/        sửa title_vi, system, is_published...
    """

    permission_classes = [IsAdminRole]

    def get_object(self, uid):
        return get_object_or_404(admin_model_queryset(), sketchfab_uid=uid)

    def get(self, request, uid):
        return Response(AdminModelDetailSerializer(self.get_object(uid), context={'request': request}).data)

    def patch(self, request, uid):
        model = self.get_object(uid)
        serializer = AdminModelDetailSerializer(model, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminModelDetailSerializer(self.get_object(uid), context={'request': request}).data)


class SyncAnnotationsView(APIView):
    """POST /api/anatomy/admin/models/<uid>/annotations/  {annotations: [{index, label, content}]}"""

    permission_classes = [IsAdminRole]

    class Item(serializers.Serializer):
        index = serializers.IntegerField(min_value=0, max_value=999)
        label = serializers.CharField(allow_blank=True, max_length=500)
        content = serializers.CharField(allow_blank=True, required=False, max_length=20000)

    class Body(serializers.Serializer):
        annotations = serializers.ListField(max_length=500)

    def post(self, request, uid):
        model = get_object_or_404(AnatomyModel, sketchfab_uid=uid)
        body = self.Body(data=request.data)
        body.is_valid(raise_exception=True)
        items = self.Item(data=body.validated_data['annotations'], many=True)
        items.is_valid(raise_exception=True)
        result = sync_annotations(model, items.validated_data)
        detail = AdminModelDetailSerializer(get_object_or_404(admin_model_queryset(), pk=model.pk), context={'request': request}).data
        return Response({'result': result, 'model': detail})


class PublishModelView(APIView):
    """POST /api/anatomy/admin/models/<uid>/publish/  {approve_structures: bool}"""

    permission_classes = [IsAdminRole]

    def post(self, request, uid):
        model = get_object_or_404(AnatomyModel, sketchfab_uid=uid)
        approved = 0
        if request.data.get('approve_structures'):
            approved = (
                Structure.objects.filter(annotations__model=model, status=ContentStatus.DRAFT)
                .filter(Q(definition__gt='') | Q(function__gt='') | Q(clinical_note__gt=''))
                .distinct()
                .update(status=ContentStatus.PUBLISHED, updated_by=request.user)
            )
        model.is_published = True
        model.save(update_fields=['is_published', 'updated_at'])
        return Response({'published': True, 'approved_structures': approved})


class AdminStructureView(APIView):
    """PATCH /api/anatomy/admin/structures/<id>/  sửa nội dung cấu trúc (dùng chung mọi mô hình)."""

    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        structure = get_object_or_404(Structure, pk=pk)
        serializer = AdminStructureSerializer(structure, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        n = structure.annotations.values('model').distinct().count()
        return Response({**serializer.data, 'model_count': n})


# ------------------------------------------------------------
# AnatomyTOOL
# ------------------------------------------------------------

class CollectionListView(APIView):
    """GET /api/anatomy/admin/anatomytool/collections/"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(CollectionSerializer(AnatomyToolCollection.objects.select_related('suggested_system'), many=True).data)


def _busy_response(job):
    return Response(
        {'detail': 'Đang có một lượt quét/nhập chạy. Đợi xong hoặc dừng lượt đó trước.', 'job': ImportJobSerializer(job).data},
        status=status.HTTP_409_CONFLICT,
    )


class ScanCollectionsView(APIView):
    """POST /api/anatomy/admin/anatomytool/scan/  -> bắt đầu quét danh mục Collection"""

    permission_classes = [IsAdminRole]

    def post(self, request):
        active = has_active_job()
        if active:
            return _busy_response(active)
        job = start_job(ImportJob.Kind.SCAN_INDEX, {}, request.user)
        return Response(ImportJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class StartImportView(APIView):
    """
    POST /api/anatomy/admin/anatomytool/import/
    {collections: [{id, system}], links: ["https://..."], links_system: "cardiovascular"}
    """

    permission_classes = [IsAdminRole]

    class Selection(serializers.Serializer):
        id = serializers.IntegerField()
        system = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Body(serializers.Serializer):
        collections = serializers.ListField(required=False, default=list, max_length=200)
        links = serializers.ListField(child=serializers.CharField(max_length=500), required=False, default=list, max_length=200)
        links_system = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def post(self, request):
        body = self.Body(data=request.data)
        body.is_valid(raise_exception=True)
        sels = self.Selection(data=body.validated_data['collections'], many=True)
        sels.is_valid(raise_exception=True)
        if not sels.validated_data and not body.validated_data['links']:
            return Response({'detail': 'Chọn ít nhất một Collection hoặc dán ít nhất một link.'}, status=400)
        active = has_active_job()
        if active:
            return _busy_response(active)
        params = {
            'collections': sels.validated_data,
            'links': body.validated_data['links'],
            'links_system': body.validated_data.get('links_system') or '',
        }
        job = start_job(ImportJob.Kind.IMPORT, params, request.user)
        return Response(ImportJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class JobView(APIView):
    """GET /api/anatomy/admin/jobs/latest/ hoặc /jobs/<id>/ ; POST /jobs/<id>/cancel/"""

    permission_classes = [IsAdminRole]

    def get(self, request, pk=None):
        has_active_job()  # dọn lượt treo
        job = ImportJob.objects.first() if pk is None else get_object_or_404(ImportJob, pk=pk)
        if job is None:
            # Chưa có lượt nào: trả {"job": null} thay vì body rỗng
            return Response({'job': None})
        return Response(ImportJobSerializer(job).data)


class CancelJobView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        job = get_object_or_404(ImportJob, pk=pk)
        if job.status in (ImportJob.Status.QUEUED, ImportJob.Status.RUNNING):
            job.cancel_requested = True
            job.save(update_fields=['cancel_requested', 'updated_at'])
        return Response(ImportJobSerializer(job).data)


class AnatomyStatsView(APIView):
    """GET /api/anatomy/admin/stats/"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        models = AnatomyModel.objects.aggregate(
            total=Count('id'),
            published=Count('id', filter=Q(is_published=True)),
            draft=Count('id', filter=Q(is_published=False)),
            no_system=Count('id', filter=Q(system__isnull=True)),
        )
        structures = Structure.objects.aggregate(
            total=Count('id'),
            published=Count('id', filter=Q(status=ContentStatus.PUBLISHED)),
            with_content=Count('id', filter=Q(definition__gt='') | Q(function__gt='')),
        )
        return Response({'models': models, 'structures': structures, 'checked_at': timezone.now()})

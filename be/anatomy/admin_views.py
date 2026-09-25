"""API cho trang quản trị giải phẫu (chỉ admin)."""

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import ContentStatus
from users.permissions import IsAdminRole

from ai_gateway.services import ai_health

from .models import AnatomyModel, AnatomyToolCollection, AnatomyToolItem, BodySystem, ImportJob, Structure, StructureDraft
from .serializers import (
    AdminModelDetailSerializer,
    AdminModelListSerializer,
    AdminStructureSerializer,
    CollectionSerializer,
    ImportJobSerializer,
    StructureDraftSerializer,
)
from .services.anatomytool import node_url
from .services.annotations import sync_annotations
from .services.drafting import apply_draft, draft_structure
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


class LibraryListView(APIView):
    """GET /api/anatomy/admin/anatomytool/library/  -> toàn bộ mục thư viện 3D đã quét"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        items = AnatomyToolItem.objects.select_related('suggested_system', 'model')
        last = items.order_by('-last_seen_at').values_list('last_seen_at', flat=True).first()
        return Response({
            'last_scanned_at': last,
            'results': [
                {
                    'nid': i.nid,
                    'title': i.title,
                    'thumbnail_url': i.thumbnail_url,
                    'suggested_system': i.suggested_system.slug if i.suggested_system else None,
                    'status': i.status,
                    'note': i.note,
                    'is_3d': i.is_3d,
                    'model_uid': i.model.sketchfab_uid if i.model else None,
                    'url': node_url(i.nid),
                }
                for i in items
            ],
        })


class ScanLibraryView(APIView):
    """POST /api/anatomy/admin/anatomytool/library/scan/  -> quét thư viện 3D (/interactive)"""

    permission_classes = [IsAdminRole]

    def post(self, request):
        active = has_active_job()
        if active:
            return _busy_response(active)
        job = start_job(ImportJob.Kind.SCAN_LIBRARY, {}, request.user)
        return Response(ImportJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class StartImportView(APIView):
    """
    POST /api/anatomy/admin/anatomytool/import/
    {collections: [{id, system}], items: [{nid, system}], links: ["https://..."], links_system: "cardiovascular"}
    """

    permission_classes = [IsAdminRole]

    class Selection(serializers.Serializer):
        id = serializers.IntegerField()
        system = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Item(serializers.Serializer):
        nid = serializers.CharField(max_length=20)
        system = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Body(serializers.Serializer):
        collections = serializers.ListField(required=False, default=list, max_length=200)
        items = serializers.ListField(required=False, default=list, max_length=600)
        links = serializers.ListField(child=serializers.CharField(max_length=500), required=False, default=list, max_length=200)
        links_system = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def post(self, request):
        body = self.Body(data=request.data)
        body.is_valid(raise_exception=True)
        sels = self.Selection(data=body.validated_data['collections'], many=True)
        sels.is_valid(raise_exception=True)
        items = self.Item(data=body.validated_data['items'], many=True)
        items.is_valid(raise_exception=True)
        if not sels.validated_data and not items.validated_data and not body.validated_data['links']:
            return Response({'detail': 'Chọn ít nhất một mô hình, một Collection hoặc dán ít nhất một link.'}, status=400)
        active = has_active_job()
        if active:
            return _busy_response(active)
        params = {
            'collections': sels.validated_data,
            'items': items.validated_data,
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
        drafts = {'pending': StructureDraft.objects.filter(status=StructureDraft.Status.PENDING).count()}
        models['publishable'] = len(publishable_models())
        return Response({'models': models, 'structures': structures, 'drafts': drafts, 'checked_at': timezone.now()})


# ------------------------------------------------------------
# AI viết nháp + duyệt nhanh
# ------------------------------------------------------------

def _ai_not_ready():
    health = ai_health()
    if health is None:
        return Response({'detail': 'Service AI chưa chạy (docker compose up -d ai).'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if not health.get('llm'):
        return Response({'detail': 'Service AI chưa có GROQ_API_KEY nên chưa viết được.'}, status=status.HTTP_400_BAD_REQUEST)
    if not health.get('embedding') or not health.get('knowledge_db'):
        return Response({'detail': 'Service AI chưa có GEMINI_API_KEY / DATABASE_URL nên chưa tìm được trong kho.'}, status=status.HTTP_400_BAD_REQUEST)
    return None


def _drafts():
    return StructureDraft.objects.select_related('structure').prefetch_related('structure__annotations__model__system')


def publishable_models() -> list[dict]:
    """
    Mô hình chưa xuất bản, đã có ít nhất 1 bộ phận được duyệt và không còn bản nháp nào chờ duyệt
    -> gợi ý xuất bản. Bộ phận chưa có nội dung vẫn hiện tên, người học chỉ không thấy phần giải thích.
    """
    pending = StructureDraft.objects.filter(status=StructureDraft.Status.PENDING).values('structure_id')
    qs = (
        AnatomyModel.objects.filter(is_published=False)
        .annotate(
            approved=Count('annotations__structure', filter=Q(annotations__structure__status=ContentStatus.PUBLISHED), distinct=True),
            linked=Count('annotations__structure', distinct=True),
        )
        .filter(approved__gt=0)
        .exclude(annotations__structure_id__in=pending)
        .order_by('title')
    )
    return [{'uid': m.sketchfab_uid, 'title': m.title_vi or m.title, 'approved': m.approved, 'linked': m.linked} for m in qs]


def ready_models(structure_ids=None) -> list[dict]:
    """Giữ tên cũ cho các response duyệt: trả về toàn bộ mô hình có thể xuất bản."""
    return publishable_models()


class DraftStructureView(APIView):
    """
    GET  /api/anatomy/admin/structures/<id>/draft/  -> bản nháp hiện tại (hoặc {"draft": null})
    POST /api/anatomy/admin/structures/<id>/draft/  -> AI viết nháp ngay cho 1 bộ phận (5–15 giây)
    """

    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        draft = _drafts().filter(structure_id=pk).first()
        return Response(StructureDraftSerializer(draft).data if draft else {'draft': None})

    def post(self, request, pk):
        if (err := _ai_not_ready()) is not None:
            return err
        structure = get_object_or_404(Structure, pk=pk)
        draft = draft_structure(structure, request.user)
        return Response(StructureDraftSerializer(_drafts().get(pk=draft.pk)).data)


class GenerateDraftsView(APIView):
    """
    POST /api/anatomy/admin/drafts/generate/  {model_uid?, structure_ids?, only_empty: true}
    Chạy nền: AI viết nháp cho nhiều bộ phận.
    """

    permission_classes = [IsAdminRole]

    def post(self, request):
        if (err := _ai_not_ready()) is not None:
            return err
        if (active := has_active_job()) is not None:
            return _busy_response(active)
        qs = Structure.objects.all()
        if request.data.get('model_uid'):
            qs = qs.filter(annotations__model__sketchfab_uid=request.data['model_uid'])
        if request.data.get('structure_ids'):
            qs = qs.filter(pk__in=[int(i) for i in request.data['structure_ids'] if str(i).isdigit()])
        if request.data.get('only_empty', True):
            # chưa có nội dung và chưa có bản nháp đang chờ duyệt
            qs = qs.filter(definition='', function='').exclude(draft__status=StructureDraft.Status.PENDING)
        ids = list(qs.distinct().values_list('pk', flat=True))
        if not ids:
            return Response({'detail': 'Không có bộ phận nào cần viết nháp.'}, status=status.HTTP_400_BAD_REQUEST)
        job = start_job(ImportJob.Kind.AI_DRAFT, {'structure_ids': ids}, request.user)
        return Response(ImportJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class DraftListView(APIView):
    """GET /api/anatomy/admin/drafts/?status=pending&model=<uid>&system=<slug>"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        p = request.query_params
        qs = _drafts().filter(status=p.get('status') or StructureDraft.Status.PENDING)
        if p.get('model'):
            qs = qs.filter(structure__annotations__model__sketchfab_uid=p['model'])
        if p.get('system'):
            qs = qs.filter(structure__annotations__model__system__slug=p['system'])
        counts = dict(StructureDraft.objects.values_list('status').annotate(n=Count('id')))
        return Response({
            'counts': counts,
            'results': StructureDraftSerializer(qs.distinct(), many=True).data,
            'publishable': publishable_models(),
        })


class ApproveDraftView(APIView):
    """POST /api/anatomy/admin/drafts/<id>/approve/  {name_vi?, definition?, function?, clinical_note?}"""

    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        name_vi = serializers.CharField(max_length=200, required=False, allow_blank=True)
        definition = serializers.CharField(required=False, allow_blank=True)
        function = serializers.CharField(required=False, allow_blank=True)
        clinical_note = serializers.CharField(required=False, allow_blank=True)

    def post(self, request, pk):
        draft = get_object_or_404(_drafts(), pk=pk)
        if draft.status != StructureDraft.Status.PENDING:
            return Response({'detail': 'Bản nháp này không còn chờ duyệt.'}, status=status.HTTP_409_CONFLICT)
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        structure = apply_draft(draft, request.user, data.validated_data)
        return Response({'approved': 1, 'structure_id': structure.pk, 'ready_models': ready_models([structure.pk])})


class BulkApproveDraftsView(APIView):
    """POST /api/anatomy/admin/drafts/approve-bulk/  {ids: [...]} hoặc {all: true}  -> duyệt nguyên bản nháp, không sửa"""

    permission_classes = [IsAdminRole]

    def post(self, request):
        drafts = _drafts().filter(status=StructureDraft.Status.PENDING)
        if not request.data.get('all'):
            ids = [int(i) for i in request.data.get('ids', []) if str(i).isdigit()]
            drafts = drafts.filter(pk__in=ids)
        structure_ids = []
        for draft in drafts:
            structure_ids.append(apply_draft(draft, request.user).pk)
        return Response({'approved': len(structure_ids), 'ready_models': ready_models(structure_ids)})


class DiscardDraftView(APIView):
    """POST /api/anatomy/admin/drafts/<id>/discard/"""

    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        draft = get_object_or_404(StructureDraft, pk=pk)
        draft.status = StructureDraft.Status.DISCARDED
        draft.reviewed_by = request.user
        draft.reviewed_at = timezone.now()
        draft.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response({'discarded': 1})

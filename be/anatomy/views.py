from django.db.models import Count, Q
from rest_framework import viewsets

from users.permissions import IsAdminOrReadOnly, is_admin

from .models import AnatomyModel, BodySystem, Structure
from .serializers import (
    AnatomyModelDetailSerializer,
    AnatomyModelListSerializer,
    BodySystemSerializer,
    StructureSerializer,
)


class BodySystemViewSet(viewsets.ModelViewSet):
    """Hệ cơ quan. Học viên: chỉ xem hệ đã bật; admin: toàn quyền."""

    serializer_class = BodySystemSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'slug'

    def get_queryset(self):
        admin = is_admin(self.request.user)
        model_filter = Q() if admin else Q(models__is_published=True)
        qs = BodySystem.objects.annotate(model_count=Count('models', filter=model_filter, distinct=True))
        return qs if admin else qs.filter(is_published=True)


class AnatomyModelViewSet(viewsets.ModelViewSet):
    """
    Mô hình 3D. Tra theo mã Sketchfab: /api/anatomy/models/<sketchfab_uid>/
    Lọc: ?system=<slug>&search=<từ khóa>
    """

    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'sketchfab_uid'

    def get_serializer_class(self):
        return AnatomyModelListSerializer if self.action == 'list' else AnatomyModelDetailSerializer

    def get_queryset(self):
        qs = (
            AnatomyModel.objects.select_related('system')
            .annotate(annotation_count=Count('annotations', distinct=True))
        )
        if self.action != 'list':
            qs = qs.prefetch_related('annotations__structure__references__document')
        if not is_admin(self.request.user):
            qs = qs.filter(is_published=True)

        params = self.request.query_params
        if params.get('system'):
            qs = qs.filter(system__slug=params['system'])
        if params.get('search'):
            term = params['search'].strip()
            qs = qs.filter(
                Q(title__icontains=term) | Q(title_vi__icontains=term)
                | Q(annotations__label__icontains=term) | Q(annotations__structure__name_vi__icontains=term)
            ).distinct()
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class StructureViewSet(viewsets.ModelViewSet):
    """Cấu trúc giải phẫu (nội dung kiến thức). Học viên chỉ thấy bản đã duyệt."""

    serializer_class = StructureSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = Structure.objects.prefetch_related('references__document')
        if not is_admin(self.request.user):
            qs = qs.filter(status='published')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name_en__icontains=search) | Q(name_vi__icontains=search))
        return qs

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

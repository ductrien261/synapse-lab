from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import ContentStatus
from users.permissions import IsAdminOrReadOnly, is_admin

from .models import Algorithm, AlgorithmCategory, AlgorithmContent
from .serializers import (
    AlgorithmCategorySerializer,
    AlgorithmContentSerializer,
    AlgorithmReferenceSerializer,
    AlgorithmSerializer,
)


class AlgorithmCategoryListView(generics.ListAPIView):
    """GET /api/algorithms/ — danh mục đã đồng bộ từ algo-server."""

    serializer_class = AlgorithmCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    queryset = AlgorithmCategory.objects.prefetch_related('algorithms__category')


class AlgorithmDetailView(APIView):
    """
    GET /api/algorithms/<category_key>/<algorithm_key>/
        -> thông tin thuật toán + phần giải thích (học viên chỉ thấy bản đã duyệt)
    PUT /api/algorithms/<category_key>/<algorithm_key>/   (admin)
        -> tạo/cập nhật phần giải thích
    """

    permission_classes = [IsAdminOrReadOnly]

    def get_algorithm(self, category_key, algorithm_key):
        return get_object_or_404(
            Algorithm.objects.select_related('category'),
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
            'references': AlgorithmReferenceSerializer(algorithm.references.select_related('document'), many=True).data,
        })

    def put(self, request, category_key, algorithm_key):
        algorithm = self.get_algorithm(category_key, algorithm_key)
        content, _ = AlgorithmContent.objects.get_or_create(algorithm=algorithm)
        serializer = AlgorithmContentSerializer(content, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(serializer.data)

"""
URL configuration for SYNAPSE-LAB core project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.db import connection
from django.http import JsonResponse
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

def health_check(request):
    """Công khai (không cần token) — dùng để kiểm tra backend và kết nối DB."""
    try:
        connection.ensure_connection()
        db_status = "connected"
    except Exception:  # noqa: BLE001
        db_status = "unavailable"
    return JsonResponse(
        {
            "status": "ok" if db_status == "connected" else "degraded",
            "service": "SYNAPSE-LAB Backend API",
            "version": "1.0.0",
            "database": db_status,
        },
        status=200 if db_status == "connected" else 503,
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/anatomy/', include('anatomy.urls')),
    path('api/algorithms/', include('algorithms.urls')),
    path('api/learning/', include('learning.urls')),
    path('api/translate/', include('translation.urls')),
    path('api/knowledge/', include('knowledge.urls')),
    path('api/ai/', include('ai_gateway.urls')),
    path('api/tutor/', include('tutor.urls')),
    path('api/learner/', include('learner.urls')),
    path('api/feedback/', include('feedback.urls')),

    # Health Check Endpoint
    path('api/health/', health_check, name='health-check'),

    # OpenAPI 3 Documentation & Swagger UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Phục vụ file upload khi lưu local (chỉ lúc dev)
if settings.DEBUG and not settings.S3_BUCKET:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

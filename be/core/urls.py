"""
URL configuration for SYNAPSE-LAB core project.
"""

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

    # Health Check Endpoint
    path('api/health/', health_check, name='health-check'),

    # OpenAPI 3 Documentation & Swagger UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

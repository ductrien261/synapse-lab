"""
URL configuration for SYNAPSE-LAB core project.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

def health_check(request):
    return JsonResponse({
        "status": "ok",
        "service": "SYNAPSE-LAB Backend API",
        "version": "1.0.0",
        "database": "connected"
    })

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

from django.urls import path
from rest_framework.routers import DefaultRouter

from . import admin_views as a
from .views import AnatomyModelViewSet, BodySystemViewSet, StructureViewSet

router = DefaultRouter()
router.register('systems', BodySystemViewSet, basename='anatomy-system')
router.register('models', AnatomyModelViewSet, basename='anatomy-model')
router.register('structures', StructureViewSet, basename='anatomy-structure')

admin_urls = [
    path('admin/stats/', a.AnatomyStatsView.as_view()),
    path('admin/models/', a.AdminModelListView.as_view()),
    path('admin/models/bulk/', a.BulkModelActionView.as_view()),
    path('admin/models/<str:uid>/', a.AdminModelDetailView.as_view()),
    path('admin/models/<str:uid>/annotations/', a.SyncAnnotationsView.as_view()),
    path('admin/models/<str:uid>/publish/', a.PublishModelView.as_view()),
    path('admin/structures/<int:pk>/', a.AdminStructureView.as_view()),
    path('admin/anatomytool/collections/', a.CollectionListView.as_view()),
    path('admin/anatomytool/scan/', a.ScanCollectionsView.as_view()),
    path('admin/anatomytool/import/', a.StartImportView.as_view()),
    path('admin/jobs/latest/', a.JobView.as_view()),
    path('admin/jobs/<uuid:pk>/', a.JobView.as_view()),
    path('admin/jobs/<uuid:pk>/cancel/', a.CancelJobView.as_view()),
]

urlpatterns = admin_urls + router.urls

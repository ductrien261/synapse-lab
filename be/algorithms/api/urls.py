from django.urls import path
from .tutor import AlgorithmTutorView

from .views import (
    AlgorithmCandidateApplyView, AlgorithmCandidateBulkApplyView, AlgorithmCandidateDiscardView, AlgorithmCandidateListView,
    AlgorithmCategoryListView, AlgorithmDetailView, AlgorithmDraftListView,
    AlgorithmScanJobView, AlgorithmScanStartView, AlgorithmSourceDetailView,
    AlgorithmSourceDiscoverView, AlgorithmSourceListView, AlgorithmSourcePreviewView,
    AlgorithmMissingDiscoveryView,
)

urlpatterns = [
    path('', AlgorithmCategoryListView.as_view(), name='algorithm-categories'),
    path('admin-drafts/', AlgorithmDraftListView.as_view(), name='algorithm-drafts'),
    path('admin/import/sources/', AlgorithmSourceListView.as_view(), name='algorithm-import-sources'),
    path('admin/import/sources/preview/', AlgorithmSourcePreviewView.as_view(), name='algorithm-import-source-preview'),
    path('admin/import/sources/discover/', AlgorithmSourceDiscoverView.as_view(), name='algorithm-import-source-discover'),
    path('admin/import/discover-missing/', AlgorithmMissingDiscoveryView.as_view(), name='algorithm-import-discover-missing'),
    path('admin/import/sources/<int:pk>/', AlgorithmSourceDetailView.as_view(), name='algorithm-import-source'),
    path('admin/import/scans/', AlgorithmScanStartView.as_view(), name='algorithm-import-scan'),
    path('admin/import/scans/<uuid:pk>/', AlgorithmScanJobView.as_view(), name='algorithm-import-scan-job'),
    path('admin/import/candidates/', AlgorithmCandidateListView.as_view(), name='algorithm-import-candidates'),
    path('admin/import/candidates/apply/', AlgorithmCandidateBulkApplyView.as_view(), name='algorithm-import-candidate-apply-bulk'),
    path('admin/import/candidates/<int:pk>/apply/', AlgorithmCandidateApplyView.as_view(), name='algorithm-import-candidate-apply'),
    path('admin/import/candidates/<int:pk>/discard/', AlgorithmCandidateDiscardView.as_view(), name='algorithm-import-candidate-discard'),
    path('<slug:category_key>/<slug:algorithm_key>/tutor/', AlgorithmTutorView.as_view(), name='algorithm-tutor'),
    path('<slug:category_key>/<slug:algorithm_key>/', AlgorithmDetailView.as_view(), name='algorithm-detail'),
]

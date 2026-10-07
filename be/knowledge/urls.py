from django.urls import path

from . import admin_views as a

urlpatterns = [
    path('admin/stats/', a.StatsView.as_view()),
    path('admin/documents/', a.DocumentListView.as_view()),
    path('admin/documents/<uuid:pk>/', a.DocumentDetailView.as_view()),
    path('admin/documents/<uuid:pk>/preview/', a.DocumentPdfPreviewView.as_view()),
    path('admin/documents/<uuid:pk>/sections/remove/', a.RemoveSectionsView.as_view()),
    path('admin/openstax/scan/', a.OpenStaxScanView.as_view()),
    path('admin/openstax/ingest/', a.OpenStaxIngestView.as_view()),
    path('admin/pdf/', a.PdfUploadView.as_view()),
    path('admin/curated/', a.CuratedSourceView.as_view()),
    path('admin/jobs/latest/', a.JobView.as_view()),
    path('admin/jobs/<uuid:pk>/', a.JobView.as_view()),
    path('admin/jobs/<uuid:pk>/cancel/', a.CancelJobView.as_view()),
    path('admin/search/', a.SearchView.as_view()),
]

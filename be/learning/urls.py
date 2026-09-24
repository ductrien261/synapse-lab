from django.urls import path

from .views import ActivityView, NoteView, SummaryView

urlpatterns = [
    path('activities/', ActivityView.as_view(), name='learning-activities'),
    path('summary/', SummaryView.as_view(), name='learning-summary'),
    path('notes/', NoteView.as_view(), name='learning-notes'),
]

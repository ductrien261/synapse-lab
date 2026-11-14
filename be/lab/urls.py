from django.urls import path

from . import views

urlpatterns = [
    path('lessons/', views.LessonListCreateView.as_view()),
    path('lessons/<slug:slug>/', views.LessonDetailView.as_view()),
    path('lessons/<slug:slug>/restore/', views.LessonRestoreView.as_view()),
    path('lessons/<slug:slug>/submit/', views.LessonSubmitView.as_view()),
    path('lessons/<slug:slug>/withdraw/', views.LessonWithdrawView.as_view()),
    path('admin/lessons/', views.AdminLessonListView.as_view()),
    path('admin/lessons/<slug:slug>/review/', views.AdminLessonReviewView.as_view()),
]

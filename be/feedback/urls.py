from django.urls import path

from . import views as v

urlpatterns = [
    path('', v.SubmitFeedbackView.as_view()),
    path('admin/', v.AdminFeedbackListView.as_view()),
    path('admin/summary/', v.AdminSummaryView.as_view()),
    path('admin/answers/', v.AdminAnswersView.as_view()),
    path('admin/answers/<int:pk>/', v.AdminAnswerActionView.as_view()),
    path('admin/quiz/', v.AdminQuizView.as_view()),
    path('admin/quiz/<int:pk>/', v.AdminQuizDetailView.as_view()),
    path('admin/<int:pk>/', v.AdminFeedbackDetailView.as_view()),
]

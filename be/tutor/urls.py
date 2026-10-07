from django.urls import path

from . import views as v

urlpatterns = [
    path('ask/', v.AskView.as_view()),
    path('action/', v.ActionView.as_view()),
    path('messages/<int:pk>/action-answer/', v.ActionAnswerView.as_view()),
    path('conversations/', v.ConversationListView.as_view()),
    path('conversations/<uuid:pk>/', v.ConversationDetailView.as_view()),
    path('messages/<int:pk>/feedback/', v.FeedbackView.as_view()),
    path('messages/<int:pk>/quick-check/', v.QuickCheckView.as_view()),
    path('messages/<int:pk>/quick-check/<str:action>/', v.QuickCheckView.as_view()),
]

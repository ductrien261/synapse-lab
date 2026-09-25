from django.urls import path

from . import views as v

urlpatterns = [
    path('profile/', v.LearnerProfileView.as_view()),
    path('misconceptions/<int:pk>/', v.MisconceptionView.as_view()),
    path('due/', v.DueView.as_view()),
    path('review/start/', v.StartReviewView.as_view()),
    path('review/<uuid:pk>/item/', v.ReviewItemView.as_view()),
    path('review/<uuid:pk>/answer/', v.ReviewAnswerView.as_view()),
    path('items/<int:pk>/report/', v.ReportItemView.as_view()),
]

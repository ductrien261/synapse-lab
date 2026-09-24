from django.urls import path

from .views import AlgorithmCategoryListView, AlgorithmDetailView

urlpatterns = [
    path('', AlgorithmCategoryListView.as_view(), name='algorithm-categories'),
    path('<slug:category_key>/<slug:algorithm_key>/', AlgorithmDetailView.as_view(), name='algorithm-detail'),
]

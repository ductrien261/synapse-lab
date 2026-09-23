from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminUserDetailView,
    AdminUserListView,
    CustomTokenObtainPairView,
    RegisterView,
    UserMeView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserMeView.as_view(), name='me'),

    # Quản trị
    path('admin/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/<uuid:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
]

from django.db.models import Q
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsAdminRole
from .serializers import (
    AdminUserSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role

        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserMeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        return self.request.user


# ------------------------------------------------------------
# Quản trị người dùng (chỉ admin)
# ------------------------------------------------------------

class AdminUserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminUserListView(generics.ListAPIView):
    """GET /api/users/admin/?search=&role=&track=&is_active=&page="""

    serializer_class = AdminUserSerializer
    permission_classes = (IsAdminRole,)
    pagination_class = AdminUserPagination

    def get_queryset(self):
        qs = User.objects.all().order_by('-date_joined')
        params = self.request.query_params

        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )
        if params.get('role') in dict(User.ROLE_CHOICES):
            qs = qs.filter(role=params['role'])
        if params.get('track') in dict(User.TRACK_CHOICES):
            qs = qs.filter(track=params['track'])
        if params.get('is_active') in ('true', 'false'):
            qs = qs.filter(is_active=params['is_active'] == 'true')
        return qs


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """GET / PATCH /api/users/admin/<id>/ — đổi role, khóa/mở tài khoản."""

    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = (IsAdminRole,)
    http_method_names = ['get', 'patch', 'head', 'options']

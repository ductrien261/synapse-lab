from django.conf import settings
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Thông tin tài khoản trả về cho FE. User chỉ được tự sửa tên và chuyên ngành."""

    name = serializers.CharField(source='full_name', required=False, allow_blank=True, max_length=150)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'track', 'weekly_goal', 'is_active', 'date_joined']
        read_only_fields = ['id', 'email', 'role', 'is_active', 'date_joined']
        extra_kwargs = {'weekly_goal': {'min_value': 1, 'max_value': 7}}


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=150)

    class Meta:
        model = User
        # Không nhận "role" từ form đăng ký -> không ai tự đăng ký làm admin được
        fields = ['email', 'password', 'name', 'track']

    def create(self, validated_data):
        first_name, _, last_name = validated_data.pop('name', '').strip().partition(' ')
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            track=validated_data.get('track'),
            first_name=first_name,
            last_name=last_name.strip(),
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    ADMIN_ALIAS = 'admin'

    def validate(self, attrs):
        identifier = (attrs.get(self.username_field) or '').strip()
        if identifier.lower() == self.ADMIN_ALIAS:
            email = getattr(settings, 'ADMIN_LOGIN_EMAIL', '') or (
                User.objects.filter(is_superuser=True).order_by('date_joined')
                .values_list('email', flat=True).first()
            )
            if email:
                attrs[self.username_field] = email
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        return token


class AdminUserSerializer(serializers.ModelSerializer):
    """Dùng cho trang quản trị: admin xem mọi user, đổi role và khóa/mở tài khoản."""

    name = serializers.CharField(source='full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'track', 'is_active', 'date_joined', 'last_login']
        read_only_fields = ['id', 'email', 'name', 'track', 'date_joined', 'last_login']

    def validate(self, attrs):
        request = self.context.get('request')
        if request and self.instance and self.instance.pk == request.user.pk:
            if attrs.get('role', self.instance.role) != self.instance.role:
                raise serializers.ValidationError('Bạn không thể tự đổi vai trò của chính mình.')
            if attrs.get('is_active', True) is False:
                raise serializers.ValidationError('Bạn không thể tự khóa tài khoản của chính mình.')
        return attrs

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        # Giữ quyền vào Django Admin (/admin/) khớp với role
        instance.is_staff = instance.role == User.ROLE_ADMIN or instance.is_superuser
        instance.save(update_fields=['is_staff'])
        return instance

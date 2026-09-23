from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Thông tin tài khoản trả về cho FE. User chỉ được tự sửa tên và chuyên ngành."""

    name = serializers.CharField(source='full_name', required=False, allow_blank=True, max_length=150)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'track', 'is_active', 'date_joined']
        read_only_fields = ['id', 'email', 'role', 'is_active', 'date_joined']


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
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        return token

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
import uuid


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.ROLE_ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    # Vai trò hệ thống: chỉ phân biệt người dùng thường và admin.
    # "Giáo viên / học sinh" được tính theo từng lớp trong app classroom.
    ROLE_USER = 'user'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = (
        (ROLE_USER, 'User'),
        (ROLE_ADMIN, 'Admin'),
    )

    # Chuyên ngành: quyết định dashboard hiển thị nội dung gì.
    TRACK_CS = 'cs'
    TRACK_MED = 'med'
    TRACK_CHOICES = (
        (TRACK_CS, 'Khoa học máy tính'),
        (TRACK_MED, 'Y khoa'),
    )

    username = None  # Đăng nhập bằng email
    email = models.EmailField(unique=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)
    track = models.CharField(max_length=10, choices=TRACK_CHOICES, null=True, blank=True)
    weekly_goal = models.PositiveSmallIntegerField('Mục tiêu số ngày học mỗi tuần', default=4)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @full_name.setter
    def full_name(self, value):
        first, _, last = (value or '').strip().partition(' ')
        self.first_name = first
        self.last_name = last.strip()

    @property
    def is_admin_role(self):
        return self.role == self.ROLE_ADMIN

    def __str__(self):
        return self.email

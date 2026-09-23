from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """Django Admin chỉ để dev dự phòng; quản trị chính nằm ở trang /admin của web."""

    list_display = ('email', 'first_name', 'last_name', 'role', 'track', 'is_active', 'date_joined')
    list_filter = ('role', 'track', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    readonly_fields = ('id', 'date_joined', 'last_login', 'password')
    fields = (
        'id', 'email', 'password', 'first_name', 'last_name',
        'role', 'track', 'is_active', 'is_staff', 'is_superuser',
        'date_joined', 'last_login',
    )

"""
Phân quyền dùng chung cho toàn bộ backend.

    from users.permissions import IsAdminRole, IsAdminOrReadOnly

- IsAdminRole        : chỉ admin (trang quản trị, API sửa nội dung học)
- IsAdminOrReadOnly  : ai đăng nhập cũng xem được, chỉ admin được thêm/sửa/xóa
                       (dùng cho thuật toán, giải phẫu, tài liệu)
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_admin(user) -> bool:
    return bool(user and user.is_authenticated and getattr(user, 'role', None) == 'admin')


class IsAdminRole(BasePermission):
    message = 'Chỉ quản trị viên mới được thực hiện thao tác này.'

    def has_permission(self, request, view):
        return is_admin(request.user)


class IsAdminOrReadOnly(BasePermission):
    message = 'Chỉ quản trị viên mới được thêm, sửa hoặc xóa nội dung.'

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return is_admin(request.user)

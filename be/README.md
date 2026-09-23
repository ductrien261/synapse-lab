# SYNAPSE LAB — Backend

Django 5 + Django REST Framework + SimpleJWT. Hướng dẫn chạy toàn bộ dự án: xem [README gốc](../README.md).

## Các app

| App | Nội dung |
|---|---|
| `core` | settings, urls gốc, health check |
| `users` | tài khoản (đăng nhập bằng email), role `user` / `admin`, chuyên ngành `cs` / `med`, phân quyền |

## API

Tài liệu đầy đủ trên Swagger: <http://localhost:8000/api/schema/swagger-ui/>

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/api/health/` | Ai cũng gọi được |
| POST | `/api/users/register/` | Ai cũng gọi được |
| POST | `/api/users/login/` | Ai cũng gọi được |
| POST | `/api/users/token/refresh/` | Ai cũng gọi được |
| GET / PATCH | `/api/users/me/` | Đã đăng nhập (chỉ sửa được `name`, `track`) |
| GET | `/api/users/admin/?search=&role=&track=&is_active=&page=` | Admin |
| GET / PATCH | `/api/users/admin/<id>/` | Admin (sửa `role`, `is_active`; không tự sửa chính mình) |

## Phân quyền

Dùng các class trong `users/permissions.py`:

```python
from users.permissions import IsAdminRole, IsAdminOrReadOnly

class AlgorithmViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]   # ai đăng nhập cũng xem, chỉ admin sửa
```

## Chạy trực tiếp không qua Docker

```bash
cd be
cp .env.example .env      # điền DATABASE_URL
uv sync
uv run python manage.py migrate
uv run python manage.py runserver
```

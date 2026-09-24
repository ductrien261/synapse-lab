# SYNAPSE LAB — Backend

Django 5 + Django REST Framework + SimpleJWT. Hướng dẫn chạy toàn bộ dự án: xem [README gốc](../README.md).

## Các app

| App | Nội dung |
|---|---|
| `core` | settings, urls gốc, health check |
| `users` | tài khoản (đăng nhập bằng email), role `user` / `admin`, chuyên ngành `cs` / `med`, phân quyền |
| `knowledge` | `Document` (giáo trình, file trên Neon Object Storage), `DocumentChunk` (đoạn trích + số trang + vector 768 chiều) |
| `anatomy` | `BodySystem` → `AnatomyModel` (Sketchfab) → `ModelAnnotation` (chú thích số) → `Structure` (kiến thức) → `StructureReference` (trích giáo trình) |
| `algorithms` | `AlgorithmCategory`, `Algorithm` (đồng bộ từ algo-server), `AlgorithmContent` (giải thích), `AlgorithmReference` |
| `learning` | `LearningActivity` (lịch sử học), `StudyDay` (ngày có học) |
| `classroom` | `Classroom`, `ClassMembership` — khung tối thiểu, bạn B mở rộng |
| `translation` | `Translation` — cache bản dịch (đoạn đã dịch thì không gọi API lại) |

Nội dung kiến thức (`Structure`, `AlgorithmContent`) có trạng thái **Nháp / Đã duyệt**: học viên chỉ thấy bản đã duyệt.

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
| GET | `/api/anatomy/systems/` · `/api/anatomy/systems/<slug>/` | Đã đăng nhập (admin: thêm/sửa/xóa) |
| GET | `/api/anatomy/models/?system=&search=` · `/api/anatomy/models/<sketchfab_uid>/` | Đã đăng nhập (admin: thêm/sửa/xóa) |
| GET | `/api/anatomy/structures/?search=` | Đã đăng nhập (admin: thêm/sửa/xóa) |
| GET | `/api/algorithms/` | Danh mục đã đồng bộ |
| GET / PUT | `/api/algorithms/<category>/<algorithm>/` | Xem giải thích; PUT chỉ admin |
| GET / POST | `/api/learning/activities/?track=` | Lịch sử học của mình; POST ghi nhận vừa mở bài |
| GET | `/api/learning/summary/?track=` | Chuỗi ngày học, 7 ngày gần nhất, mục tiêu tuần |
| GET / PUT | `/api/learning/notes/?kind=&object_key=` | Ghi chú riêng của mình (PUT content rỗng = xóa) |
| POST | `/api/translate/` | Dịch đoạn văn sang tiếng Việt qua Groq, có cache DB (30 lần/phút/người) |

### Quản trị giải phẫu (chỉ admin)

| Method | Endpoint | Việc |
|---|---|---|
| GET | `/api/anatomy/admin/stats/` | Số mô hình (nháp / đã xuất bản), số cấu trúc đã duyệt |
| GET | `/api/anatomy/admin/models/?status=draft\|published&system=&search=` | Danh sách kể cả nháp, kèm tiến độ soạn |
| POST | `/api/anatomy/admin/models/bulk/` | `{uids, action: publish\|unpublish\|set_system\|delete, system}` |
| GET / PATCH | `/api/anatomy/admin/models/<uid>/` | Chi tiết để soạn; sửa `title_vi`, `system`, `is_published` |
| POST | `/api/anatomy/admin/models/<uid>/annotations/` | Lưu chú thích đọc từ Sketchfab Viewer API, tự ghép cấu trúc theo tên tiếng Anh |
| POST | `/api/anatomy/admin/models/<uid>/publish/` | Xuất bản; `approve_structures=true` duyệt luôn nội dung đã soạn |
| PATCH | `/api/anatomy/admin/structures/<id>/` | Sửa nội dung cấu trúc (dùng chung mọi mô hình) |
| GET | `/api/anatomy/admin/anatomytool/collections/` | Các Collection đã quét |
| POST | `/api/anatomy/admin/anatomytool/scan/` | Quét danh mục Collection (chạy nền) |
| POST | `/api/anatomy/admin/anatomytool/import/` | `{collections:[{id, system}], links:[...], links_system}` (chạy nền) |
| GET | `/api/anatomy/admin/jobs/latest/` · `/jobs/<id>/` · POST `/jobs/<id>/cancel/` | Tiến độ / dừng lượt chạy |

Bộ quét AnatomyTOOL (`anatomy/services/anatomytool.py`) tuân thủ `robots.txt` của họ: **mỗi request cách nhau 10 giây**, chạy trong luồng nền và ghi tiến độ vào bảng `ImportJob`.

## Lệnh quản lý

| Lệnh | Việc |
|---|---|
| `init_data` | Tạo dữ liệu nền (gọi 2 lệnh dưới), không tạo dữ liệu giả |
| `seed_anatomy` | Danh sách 11 hệ cơ quan chuẩn |
| `add_anatomy_model <link> [--system slug] [--publish]` | Nhập một mô hình Sketchfab thật (lấy tên, tác giả, giấy phép, ảnh) |
| `sync_algorithms` | Đồng bộ danh mục thuật toán từ algo-server |

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

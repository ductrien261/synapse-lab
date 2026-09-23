# SYNAPSE LAB

Nền tảng học tập trực quan có AI hỗ trợ — đồ án môn **AI4Life** (VKU, học kỳ 7, 2026–2027).

Sinh viên **CNTT** học thuật toán qua mô phỏng từng bước; sinh viên **Y khoa** học giải phẫu qua mô hình 3D tương tác. Mọi kiến thức AI đưa ra đều bám vào **giáo trình thật** (RAG), không sinh nội dung tùy ý.

| Module | Nội dung | Phụ trách |
|---|---|---|
| Trực quan hóa thuật toán | Mô phỏng từng bước, mã nguồn, giải thích | Bạn A |
| Giải phẫu 3D | Mô hình 3D, bấm vào bộ phận để tra cứu kiến thức và giáo trình | Leader |
| Lớp học tương tác | Tạo lớp, tham gia bằng mã, hoạt động trong lớp | Bạn B |
| Nền tảng chung | Auth, phân quyền, DB, trang quản trị, pipeline tài liệu | Leader |

---

## Kiến trúc

```
                ┌──────────────────────────┐
  Trình duyệt ─►│  fe/  Next.js   :3100    │
                └─────┬──────────────┬─────┘
                      │ REST (JWT)   │ REST
                      ▼              ▼
        ┌──────────────────┐   ┌──────────────────────────┐
        │ be/ Django :8000 │   │ packages/algo-viz/server │
        │ DRF + SimpleJWT  │   │ Node.js :8080            │
        └──┬─────────┬─────┘   │ đọc packages/algo-viz/   │
           │         │         │ algorithms/              │
           ▼         ▼         └──────────────────────────┘
   Neon Postgres   Redis :6379
   (+ pgvector)
```

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, react-bootstrap-icons |
| Backend | Django 5, Django REST Framework, SimpleJWT, drf-spectacular (Swagger) |
| Thuật toán | algorithm-visualizer (server + tracers + kho thuật toán), đã tách khỏi dịch vụ gốc |
| Cơ sở dữ liệu | Neon Postgres (Singapore) + pgvector |
| Cache / hàng đợi | Redis |
| AI | Gemini + LangChain / LangGraph, Docling để đọc tài liệu |
| Quản lý gói | `uv` (Python), `npm` (Node) |

---

## Chạy dự án lần đầu

**Cần cài sẵn:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) và Git. Chỉ vậy là chạy được.

### 1. Clone

```bash
git clone git@github.com:ductrien261/synapse-lab.git
cd synapse-lab
```

### 2. Tạo file `.env`

```bash
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
```

Mở `.env` và điền:

- `DATABASE_URL` — **nhắn leader** để được cấp một Neon branch riêng (xem [Làm việc với database](#làm-việc-với-database)).
- `GEMINI_API_KEY` — tạo miễn phí tại <https://aistudio.google.com/apikey>. Chưa làm phần AI thì để trống cũng được.

> ⚠️ `.env` chứa key thật, **không bao giờ commit** file này (đã có trong `.gitignore`).

### 3. Khởi động

```bash
docker compose up -d --build
```

Lần đầu mất vài phút để tải image và cài thư viện.

### 4. Tạo bảng trong database

```bash
docker compose exec be python manage.py migrate
```

### 5. Tạo tài khoản admin

```bash
docker compose exec be python manage.py createsuperuser
```

Xong. Mở <http://localhost:3100> và đăng nhập bằng tài khoản vừa tạo.

---

## Địa chỉ các dịch vụ

| Dịch vụ | URL |
|---|---|
| Web | <http://localhost:3100> |
| API backend | <http://localhost:8000/api/> |
| Tài liệu API (Swagger) | <http://localhost:8000/api/schema/swagger-ui/> |
| Django Admin (dự phòng cho dev) | <http://localhost:8000/admin/> |
| Kiểm tra backend sống | <http://localhost:8000/api/health/> |
| Algo server | <http://localhost:8080/api/algorithms/> |

---

## Lệnh thường dùng

```bash
# Xem log (Ctrl+C để thoát)
docker compose logs -f be
docker compose logs -f fe

# Dừng / khởi động lại
docker compose down
docker compose restart be

# Django
docker compose exec be python manage.py makemigrations <tên_app>
docker compose exec be python manage.py migrate
docker compose exec be python manage.py shell

# Thêm thư viện Python (chạy trên máy, trong thư mục be/)
cd be && uv add <tên_gói> && cd ..
docker compose up -d --build be

# Thêm thư viện Node cho frontend
docker compose exec fe npm install <tên_gói>
cd fe && npm install && cd ..          # cập nhật node_modules trên máy cho VS Code
```

---

## Cấu trúc thư mục

```
synapse-lab/
├── be/                         Django backend
│   ├── core/                   settings, urls gốc
│   └── users/                  tài khoản, đăng nhập, phân quyền
├── fe/                         Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── (auth)/         login, register
│       │   ├── (admin)/        trang quản trị (sidebar riêng, chỉ admin)
│       │   └── (main)/         các trang sau khi đăng nhập
│       │       ├── algorithms/     ← bạn A
│       │       ├── anatomy/        ← leader
│       │       ├── classes/        ← bạn B
│       │       └── profile/
│       ├── components/
│       │   ├── layout/         header, sidebar, menu tài khoản
│       │   ├── admin/          sidebar và khung trang quản trị
│       │   ├── dashboard/      trang tổng quan
│       │   ├── simulation/     ← bạn A
│       │   └── medical/        ← leader
│       └── lib/                API client, context, tiện ích dùng chung
├── packages/algo-viz/          ← bạn A
│   ├── algorithms/             kho thuật toán (mỗi thư mục 1 nhóm)
│   ├── server/                 Node server phục vụ thuật toán
│   └── tracers/                thư viện tracer
├── docker-compose.yml
├── README.md
└── CONTRIBUTING.md             quy ước làm việc nhóm — đọc trước khi code
```

---

## Làm việc với database

Cả nhóm dùng **Neon Postgres**. Mỗi người dùng **một branch riêng** của Neon để migrate thoải mái mà không ghi đè dữ liệu của nhau:

| Branch Neon | Ai dùng |
|---|---|
| `main` | Bản ổn định, chỉ leader migrate |
| `dev-<tên>` | Mỗi thành viên một branch, tạo từ `main` |

Leader tạo branch trên Neon Console và gửi riêng `DATABASE_URL` cho từng người. Khi code đã merge vào `main` của git, leader chạy migrate trên branch `main` của Neon.

---

## Gặp lỗi?

| Hiện tượng | Cách xử lý |
|---|---|
| VS Code gạch đỏ `Import "rest_framework..." could not be resolved` | Code vẫn chạy trong Docker. Để hết gạch đỏ: cài [uv](https://docs.astral.sh/uv/), chạy `cd be && uv sync`, rồi `Ctrl+Shift+P` → *Python: Select Interpreter* → chọn `be/.venv`. |
| VS Code báo thiếu module ở frontend | Chạy `cd fe && npm install` trên máy. |
| Web báo "Không kết nối được máy chủ thuật toán" | `docker compose logs algo-server`, thường do container chưa chạy xong. |
| Lỗi 500 ngay sau khi pull code mới | Có migration mới: `docker compose exec be python manage.py migrate`. |
| `port is already allocated` | Có chương trình khác đang dùng cổng 3100 / 8000 / 8080 / 6379. Tắt nó hoặc đổi cổng trong `docker-compose.yml`. |
| Thêm gói npm nhưng container không thấy | Dùng `docker compose exec fe npm install <gói>` thay vì chỉ cài trên máy. |
| Đăng ký báo lỗi | Mật khẩu phải từ 8 ký tự; email không được trùng. |

---

## Đóng góp

Đọc [CONTRIBUTING.md](CONTRIBUTING.md) trước khi tạo branch đầu tiên: phân chia thư mục, quy tắc branch, commit, migration.

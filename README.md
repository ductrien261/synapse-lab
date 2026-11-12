# SYNAPSE LAB

Nền tảng học tập trực quan có AI hỗ trợ — đồ án môn **AI4Life** (VKU, học kỳ 7, 2026–2027).

Sinh viên **CNTT** học thuật toán qua mô phỏng từng bước; sinh viên **Y khoa** học giải phẫu qua mô hình 3D tương tác. Mọi kiến thức AI đưa ra đều bám vào **giáo trình thật** (RAG), không sinh nội dung tùy ý.

| Module | Nội dung | Phụ trách |
|---|---|---|
| Trực quan hóa thuật toán | Mô phỏng từng bước, mã nguồn, giải thích | Bạn A |
| Giải phẫu 3D | Mô hình 3D, bấm vào bộ phận để tra cứu kiến thức và giáo trình | Leader |
| Không gian | Tạo không gian để học, họp nhóm, thuyết trình thử; tham gia bằng mã | Bạn B |
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
        └──┬──────┬─────┬──┘   └──────────────────────────┘
           │      │     │ HTTP nội bộ (X-Internal-Token)
           │      │     ▼
           │      │   ┌──────────────────────────────┐
           │      │   │ ai/ FastAPI :8100            │──► Groq (LLM), Gemini (embedding)
           │      │   │ LangChain + LangGraph        │──► Langfuse (trace, tùy chọn)
           │      │   └───┬──────────────────┬───────┘
           ▼      ▼       ▼ (chỉ đọc kho)    ▼
   Neon Postgres   Redis :6379 (cache)
   (+ pgvector)
```

- `be` là **cổng**: đăng nhập, hạn mức token/ngày, ghi nhật ký + chi phí mọi lần gọi AI, lưu dữ liệu.
- `ai` là **bộ não**: các quy trình LangGraph (viết nháp, gia sư, ra đề, chấm bài...). Chỉ `be` gọi vào, `ai` không ghi CSDL.
- Phòng học video dùng LiveKit. Backend cấp token cho thành viên đã vào phiên; trình duyệt kết nối trực tiếp đến LiveKit.

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, react-bootstrap-icons |
| Backend | Django 5, Django REST Framework, SimpleJWT, drf-spectacular (Swagger) |
| Thuật toán | algorithm-visualizer (server + tracers + kho thuật toán), đã tách khỏi dịch vụ gốc |
| AI | FastAPI, LangChain, LangGraph, Langfuse; Groq (LLM), Gemini (embedding) |
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
- `S3_*` — Neon Object Storage để lưu giáo trình PDF (Neon Console → Object storage → Connect). Để trống thì file lưu local trong `be/media/`.
- `GROQ_API_KEY` — LLM cho service AI (dịch, viết nháp, gia sư...), tạo miễn phí tại <https://console.groq.com/keys>.
- `GEMINI_API_KEY` — embedding cho kho giáo trình, tạo miễn phí tại <https://aistudio.google.com/apikey>.
- `AI_SERVICE_TOKEN` — chuỗi bí mật bất kỳ để `be` gọi service `ai`.
- `LANGFUSE_*` — (tùy chọn) xem trace từng bước AI trên <https://cloud.langfuse.com>.

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

### 5. Tạo tài khoản admin và dữ liệu nền

```bash
docker compose exec be python manage.py createsuperuser
docker compose exec be python manage.py init_data
```

`init_data` tạo danh sách hệ cơ quan chuẩn và đồng bộ danh mục thuật toán từ algo-server. **Không tạo dữ liệu giả.** Chạy lại nhiều lần không bị trùng.

### Phòng học LiveKit

LiveKit Server đã nằm trong `docker-compose.yml`, nên không cần chạy `livekit-server.exe` ở terminal riêng. Khởi động toàn bộ hệ thống bằng:

```bash
docker compose up --build
```

Compose chạy LiveKit ở chế độ dev với cặp khóa `devkey` / `secret`. Trình duyệt kết nối qua `ws://localhost:7880`, còn backend kết nối nội bộ qua `http://livekit:7880`. Các cổng `7880/tcp`, `7881/tcp` và `7882/udp` được mở cho signaling và WebRTC.

Các giá trị có thể thay đổi trong `.env`:

```env
LIVEKIT_WS_URL=ws://localhost:7880
LIVEKIT_API_URL=http://livekit:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_NODE_IP=127.0.0.1
```

`localhost`/`127.0.0.1` chỉ phù hợp khi mở lớp trên chính máy chạy Docker. Nếu thử từ điện thoại hoặc máy khác trong cùng mạng LAN, đặt `LIVEKIT_WS_URL=ws://<IP_LAN>:7880` và `LIVEKIT_NODE_IP=<IP_LAN>`, rồi tạo lại service bằng `docker compose up -d --force-recreate livekit be`.

Đây là cấu hình phát triển local. Khi triển khai Internet cần domain `wss://`, TLS hợp lệ, cấu hình IP public/TURN và firewall phù hợp.

Muốn có mô hình 3D để học: vào trang quản trị để nhập, hoặc dùng lệnh:

```bash
docker compose exec be python manage.py add_anatomy_model https://sketchfab.com/models/<mã>/embed --system cardiovascular --publish
```

Xong. Mở <http://localhost:3100> và đăng nhập bằng tài khoản vừa tạo (ô Email gõ `admin` cũng được).

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
| LiveKit signaling | <http://localhost:7880> |

### Chia sẻ bản demo qua VS Code Ports

Khi các container đang chạy, trong VS Code mở **Ports** → **Forward a Port** → nhập `3100`. Đổi **Port Visibility** thành **Public**, rồi gửi **Forwarded Address** cho người xem demo. Frontend chuyển tiếp yêu cầu backend và algo-server qua cùng cổng `3100`, nên chỉ cần chia sẻ một link. Người xem đăng nhập bằng tài khoản của họ; giữ máy, Docker và VS Code đang chạy trong lúc demo.

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
docker compose exec be python manage.py sync_algorithms      # cập nhật danh mục thuật toán từ algo-server
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
├── ai/                         Service AI (FastAPI + LangGraph) — xem ai/README.md
├── be/                         Django backend
│   ├── core/                   settings, urls gốc, model dùng chung, lệnh init_data
│   ├── users/                  tài khoản, đăng nhập, phân quyền
│   ├── knowledge/              tài liệu, giáo trình, đoạn trích + vector (RAG)
│   ├── ai_gateway/             cổng gọi service AI: hạn mức, nhật ký, chi phí
│   ├── anatomy/                hệ cơ quan, mô hình 3D, chú thích, cấu trúc giải phẫu
│   ├── algorithms/             danh mục + phần giải thích thuật toán
│   ├── learning/               lịch sử học, chuỗi ngày học
│   └── classroom/              không gian (lớp / nhóm / buổi họp) ← bạn B
├── fe/                         Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── (auth)/         login, register
│       │   ├── (admin)/        trang quản trị (sidebar riêng, chỉ admin)
│       │   └── (main)/         các trang sau khi đăng nhập
│       │       ├── algorithms/     ← bạn A
│       │       ├── anatomy/        ← leader
│       │       ├── spaces/         ← bạn B
│       │       └── profile/
│       ├── components/
│       │   ├── layout/         header, sidebar, menu tài khoản
│       │   ├── admin/          sidebar và khung trang quản trị
│       │   ├── dashboard/      trang tổng quan
│       │   ├── simulation/     ← bạn A
│       │   └── anatomy/        ← leader (khung 3D, bảng bộ phận)
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

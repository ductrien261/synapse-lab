# Hướng dẫn đóng góp

Tài liệu này mô tả cách nhóm **Synapse Lab** làm việc để nhiều người code song song mà `main` luôn chạy được.

> **Ai có thể đóng góp?** Mã nguồn Synapse Lab được công bố theo [LICENSE](LICENSE) (bảo lưu mọi quyền). Hiện tại chúng tôi chỉ nhận Pull Request từ thành viên nhóm. Nếu bạn thấy lỗi hoặc có ý tưởng, hãy mở [Issue](../../issues/new/choose); lỗi bảo mật thì dùng **Report a vulnerability** ở tab Security, đừng đăng công khai.

## Mục lục

1. [Quy trình làm việc](#1-quy-trình-làm-việc)
2. [Phân chia thư mục](#2-phân-chia-thư-mục)
3. [Branch](#3-branch)
4. [Commit](#4-commit)
5. [Pull Request và CI](#5-pull-request-và-ci)
6. [Database và migration](#6-database-và-migration)
7. [Thêm thư viện](#7-thêm-thư-viện)
8. [Quy ước code](#8-quy-ước-code)
9. [Phân quyền trong sản phẩm](#9-phân-quyền-trong-sản-phẩm)
10. [Bảo mật](#10-bảo-mật)
11. [Dùng công cụ AI](#11-dùng-công-cụ-ai)
12. [Bản quyền và nội dung bên thứ ba](#12-bản-quyền-và-nội-dung-bên-thứ-ba)

---

## 1. Quy trình làm việc

Mọi thay đổi đi theo cùng một đường, không push thẳng vào `main`:

```
Issue  ->  branch  ->  commit  ->  Pull Request  ->  CI xanh + review  ->  merge
```

1. **Mở Issue** (mẫu có sẵn: Task, Bug) mô tả việc cần làm. Nhớ chọn đúng **khu vực** ở cuối form.
2. **Tạo branch** từ `main` mới nhất.
3. **Commit** nhỏ, rõ ràng.
4. **Mở Pull Request**, ghi `Closes #<số Issue>` trong mô tả để Issue tự đóng khi merge.
5. **CI phải xanh** (check `CI OK`) và có ít nhất một người review.
6. **Merge**, mặc định bằng *Squash and merge*. Dùng *Rebase and merge* khi cần giữ nguyên từng commit và tác giả của nó (ví dụ bàn giao một nhánh dài).

**Ngôn ngữ:** tiêu đề Issue, tiêu đề Pull Request và commit viết bằng **tiếng Anh** (dạng Conventional Commits, ví dụ `feat(lab): ...`). Phần mô tả bên trong Issue và Pull Request viết bằng **tiếng Việt**.

---

## 2. Phân chia thư mục

Mỗi phần có một người chịu trách nhiệm chính. Cần sửa phần của người khác thì nhắn họ hoặc tag họ review trong PR.

| Phần | Thư mục |
|---|---|
| Thuật toán | `packages/algo-viz/`, `be/algorithms/`, `fe/src/app/(main)/algorithms/`, `fe/src/components/simulation/` |
| Không gian học | `be/classroom/`, `fe/src/app/(main)/spaces/`, `fe/src/components/spaces/` |
| Giải phẫu 3D | `be/anatomy/`, `fe/src/app/(main)/anatomy/`, `fe/src/components/anatomy/` |
| Phòng thí nghiệm ảo (Virtual Lab) | `fe/src/app/(main)/lab/`, `fe/src/components/lab/`, `fe/src/lib/lab/`, `fe/src/lib/lab-catalog.ts`, `fe/public/lab/`, `docs/lab/` |
| Gia sư AI, người học | `ai/`, `be/tutor/`, `be/learner/`, `be/learning/`, `fe/src/components/ai/`, `fe/src/components/learner/` |
| Nền tảng chung | `be/core/`, `be/users/`, `be/knowledge/`, `be/ai_gateway/`, `fe/src/app/(admin)/`, `fe/src/components/admin/`, `fe/src/components/layout/`, `fe/src/lib/` |

**File dùng chung: sửa thì nói rõ trong mô tả PR**, vì thay đổi ở đây ảnh hưởng mọi người:

- `docker-compose.yml`, `.env.example`, `.github/`
- `be/core/settings.py`, `be/core/urls.py`, `be/pyproject.toml`, `be/uv.lock`
- `fe/package.json`, `fe/package-lock.json`, `fe/src/app/globals.css`
- `fe/src/app/(main)/layout.tsx`, `fe/src/lib/api.ts`, `fe/src/lib/user-context.tsx`

Thêm route vào `be/core/urls.py` hay thêm app vào `INSTALLED_APPS` là chuyện bình thường, chỉ cần ghi rõ trong PR.

---

## 3. Branch

```
main         bản ổn định, luôn chạy được; chỉ thay đổi qua Pull Request
feat/*       tính năng mới
fix/*        sửa lỗi
docs/*       tài liệu
chore/*      cấu hình, CI, thư viện, việc lặt vặt
refactor/*   sửa cấu trúc code, không đổi hành vi
```

Tên branch ngắn, tiếng Anh, viết thường, nối bằng dấu gạch: `feat/device-lab-robot-arm`, `fix/join-class-500`.

```bash
git switch main
git pull
git switch -c feat/device-lab-robot-arm

# code, commit nhiều lần nhỏ
git add <file>
git commit -m "feat(devices): add forward kinematics"

# trước khi mở PR: cập nhật main mới nhất vào branch
git fetch origin
git rebase origin/main        # có conflict thì sửa, git add, git rebase --continue

git push -u origin feat/device-lab-robot-arm
```

Không bao giờ `git push --force` lên `main`. Trên branch của mình, sau khi rebase thì dùng `git push --force-with-lease`.

---

## 4. Commit

Viết bằng **tiếng Anh**, theo [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <mô tả ngắn, thì hiện tại, không viết hoa đầu câu>
```

| type | Khi nào |
|---|---|
| `feat` | Thêm tính năng |
| `fix` | Sửa lỗi |
| `refactor` | Sửa code nhưng không đổi hành vi |
| `style` | Chỉ đổi giao diện hoặc định dạng |
| `docs` | Tài liệu |
| `test` | Thêm hoặc sửa test |
| `ci` | Cấu hình CI |
| `chore` | Cấu hình, thư viện, việc lặt vặt |

`scope` thường là `algorithms`, `anatomy`, `classroom`, `tutor`, `auth`, `admin`, `knowledge`, `ui`, `be`, `fe`, `ai`, `docker`.

```
feat(classroom): add join class by code
fix(auth): refresh access token when it expires
chore(be): add langchain dependency
```

---

## 5. Pull Request và CI

Mỗi PR nên nhỏ (dưới khoảng 400 dòng thay đổi nếu được) và làm đúng một việc. Mẫu PR có sẵn danh sách tự kiểm tra, điền đủ trước khi xin review.

**CI chạy tự động** (GitHub Actions) và phải xanh mới được merge:

| Phần | Kiểm tra |
|---|---|
| Backend | `manage.py check`, kiểm migration, toàn bộ test trên Postgres có pgvector |
| AI service | `pytest` |
| Frontend | typecheck, lint, build |
| Algo-server | test mô phỏng thuật toán |
| Docker Compose | kiểm cú pháp cấu hình |

**Chạy thử trên máy trước khi push:**

```bash
# Backend (cần Postgres có pgvector, ví dụ qua docker compose)
docker compose exec be python manage.py test --noinput
docker compose exec be python manage.py makemigrations --check --dry-run

# AI service
cd ai && uv run python -m pytest -q

# Frontend
cd fe && npx tsc -p tsconfig.verify.json --noEmit && npm run lint && npm run build
```

Ít nhất **1 người review** trước khi merge. PR đụng file dùng chung cần người phụ trách phần nền tảng duyệt.

---

## 6. Database và migration

- Chỉ người phụ trách app mới tạo migration cho app đó.
- **Luôn `git pull` trước khi `makemigrations`**, để tránh hai người cùng tạo migration cùng số.
- **Không sửa migration đã merge vào `main`.** Muốn đổi thì tạo migration mới.
- Django báo *conflicting migrations*:
  ```bash
  docker compose exec be python manage.py makemigrations --merge
  ```
- Phát triển trên database riêng của mình (Neon branch `dev-<tên>` hoặc Postgres local). Chỉ người phụ trách nền tảng chạy `migrate` trên database chính, sau khi code đã vào `main`.
- Có migration mới thì ghi rõ trong mô tả PR.

---

## 7. Thêm thư viện

**Python**: chạy trên máy, trong `be/` (hoặc `ai/`), để `pyproject.toml` và `uv.lock` cùng được cập nhật:

```bash
cd be
uv add <tên_gói>
cd ..
docker compose up -d --build be
```

**Node (frontend):**

```bash
docker compose exec fe npm install <tên_gói>
cd fe && npm install && cd ..
```

Luôn commit cả file khai báo lẫn file khóa (`package.json` và `package-lock.json`, hoặc `pyproject.toml` và `uv.lock`). Trước khi thêm thư viện mới, kiểm tra giấy phép của nó.

---

## 8. Quy ước code

**Chung**

- File lưu **UTF-8 không BOM**, xuống dòng **LF** (đã có `.editorconfig`).
- Không ghi file bằng `Set-Content` hay `Out-File` của PowerShell, vì chúng thêm BOM và làm hỏng tiếng Việt.
- Chữ hiển thị cho người dùng: **tiếng Việt**. Tên biến, hàm, commit, comment kỹ thuật: tiếng Anh, thống nhất trong một file.

**Frontend**

- TypeScript `strict`, tránh `any`. Kiểu dữ liệu API đặt cạnh hàm gọi API trong `fe/src/lib/`.
- Gọi backend qua `fe/src/lib/api.ts` (đã gắn token), không tự `fetch` kèm header ở từng trang.
- Lấy người dùng đang đăng nhập bằng `useUser()` từ `@/lib/user-context`.
- Màu chủ đạo `#1E3F82`, font Be Vietnam Pro (đã khai báo sẵn).
- Mỗi component một việc; file trên khoảng 300 dòng thì tách nhỏ.
- Không để `console.log` debug.

**Backend**

- Mỗi module là một Django app riêng.
- Phân quyền dùng các class trong `be/users/permissions.py`. API sửa nội dung học (thuật toán, giải phẫu, tài liệu) chỉ dành cho **admin**.
- API mới phải hiện đúng trên Swagger (`/api/schema/swagger-ui/`) và có test.

---

## 9. Phân quyền trong sản phẩm

| Vai trò | Được làm gì |
|---|---|
| `user` | Học, xem nội dung, tạo hoặc tham gia **Không gian**. Trong một không gian: người tạo là chủ, người tham gia là thành viên. |
| `admin` | Toàn quyền; là người duy nhất thêm và sửa nội dung học, tài liệu, hạn mức AI. |

Hệ thống không có role `teacher` hay `student` ở cấp toàn cục; vai trò trong lớp được lưu ở app `classroom`.

---

## 10. Bảo mật

- Không commit `.env`, API key, mật khẩu, `DATABASE_URL`, file PDF hay mô hình dung lượng lớn.
- Lỡ commit key thì báo ngay để **thu hồi key**. Xóa commit là chưa đủ, vì key đã nằm trong lịch sử git (và nay là repo công khai).
- Không gửi `.env` qua kênh chat chung; gửi riêng từng người.
- Phát hiện lỗ hổng: dùng **Security → Report a vulnerability** của repo, không mở Issue công khai.

---

## 11. Dùng công cụ AI

Được dùng (Claude, Gemini, Copilot...), nhưng:

- Đọc lại **toàn bộ** code AI viết trước khi commit. Người commit chịu trách nhiệm cho code đó.
- Không để công cụ AI tự `git commit`, `git push`, xóa file hay chạy migration.
- Không để công cụ tự thêm dòng đồng tác giả (`Co-authored-by`) hoặc chữ ký công cụ vào commit và PR.
- Không dán khóa API, nội dung `.env` hay dữ liệu cá nhân vào công cụ AI.
- Quy tắc riêng cho agent ở `fe/AGENTS.md`.

---

## 12. Bản quyền và nội dung bên thứ ba

- Mã, tài liệu, thiết kế do thành viên viết trong dự án thuộc bản quyền chung của **Synapse Lab Team** theo [LICENSE](LICENSE). Gửi Pull Request nghĩa là bạn đồng ý điều đó.
- Không đưa mã, văn bản, ảnh, dữ liệu của người khác vào repo khi chưa kiểm tra giấy phép. Nếu dùng, thêm một dòng vào [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) ngay trong PR đó, và giữ nguyên file LICENSE của nguồn gốc nếu có.
- Không commit bản chép nguyên trang web, PDF hay giáo trình. Lưu liên kết, trích dẫn ngắn và ghi nguồn; script tải về thì thêm file tải về vào `.gitignore`.
- Nội dung giấy phép **NonCommercial** (CC BY-NC, CC BY-NC-SA) hay **copyleft** (GPL, AGPL, CC BY-SA) cần hỏi người phụ trách dự án trước, vì ảnh hưởng đến giấy phép và khả năng thương mại hóa của cả dự án.

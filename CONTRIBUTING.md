# Quy ước làm việc nhóm

Mục tiêu: 3 người code song song mà **không giẫm chân nhau** và `main` lúc nào cũng chạy được.

---

## 1. Ai phụ trách phần nào

Mỗi người chỉ sửa trong phần của mình. Cần sửa phần của người khác → nhắn người đó hoặc mở PR và tag họ review.

| Phần | Thư mục | Phụ trách |
|---|---|---|
| Thuật toán | `packages/algo-viz/`, `fe/src/app/(main)/algorithms/`, `fe/src/components/simulation/` | Bạn A |
| Không gian | `be/classroom/`, `fe/src/app/(main)/spaces/`, `fe/src/components/spaces/` | Bạn B |
| Giải phẫu 3D | `be/anatomy/`, `fe/src/app/(main)/anatomy/`, `fe/src/components/anatomy/` | Leader |
| Nền tảng chung | `be/core/`, `be/users/`, `be/knowledge/`, `fe/src/app/(admin)/`, `fe/src/components/admin/`, `fe/src/components/layout/`, `fe/src/lib/` | Leader |

**File dùng chung — sửa phải báo leader trong PR:**

- `docker-compose.yml`, `.env.example`
- `be/core/settings.py`, `be/core/urls.py`, `be/pyproject.toml`, `be/uv.lock`
- `fe/package.json`, `fe/package-lock.json`, `fe/src/app/globals.css`
- `fe/src/app/(main)/layout.tsx`, `fe/src/lib/api.ts`, `fe/src/lib/user-context.tsx`

Thêm route mới vào `be/core/urls.py` hay thêm app vào `INSTALLED_APPS` là chuyện bình thường, chỉ cần ghi rõ trong mô tả PR.

---

## 2. Branch

```
main        bản ổn định, luôn chạy được — chỉ merge qua Pull Request
feature/*   mỗi tính năng một branch, tạo từ main
fix/*       sửa lỗi
```

Đặt tên: `feature/<người>-<mô-tả-ngắn>`, ví dụ `feature/a-dijkstra-player`, `fix/b-join-class-500`.

### Quy trình

```bash
# 1. Lấy code mới nhất
git checkout main
git pull

# 2. Tạo branch
git checkout -b feature/a-dijkstra-player

# 3. Code, commit nhiều lần nhỏ
git add <file>
git commit -m "feat(algorithms): render graph tracer"

# 4. Trước khi mở PR: cập nhật main mới nhất vào branch
git fetch origin
git rebase origin/main          # có conflict thì sửa, git add, git rebase --continue

# 5. Đẩy lên và mở Pull Request trên GitHub
git push -u origin feature/a-dijkstra-player
```

**Không bao giờ** `git push --force` lên `main`. Trên branch của chính mình thì dùng `git push --force-with-lease` sau khi rebase.

---

## 3. Commit message

Viết bằng **tiếng Anh**, theo [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <mô tả ngắn, thì hiện tại, không viết hoa đầu câu>
```

| type | Khi nào |
|---|---|
| `feat` | Thêm tính năng |
| `fix` | Sửa lỗi |
| `refactor` | Sửa code nhưng không đổi hành vi |
| `style` | Chỉ đổi giao diện / format |
| `docs` | Tài liệu |
| `chore` | Cấu hình, thư viện, việc lặt vặt |

`scope` thường là: `algorithms`, `anatomy`, `classroom`, `auth`, `admin`, `knowledge`, `ui`, `be`, `fe`, `docker`.

```
feat(classroom): add join class by code
fix(auth): refresh access token when it expires
chore(be): add langchain dependency
```

---

## 4. Pull Request

Mỗi PR nên nhỏ (dưới ~400 dòng thay đổi nếu được) và làm đúng một việc.

**Tự kiểm tra trước khi mở PR:**

- [ ] `docker compose up` chạy được, trang mình sửa hoạt động
- [ ] `cd fe && npm run build` không lỗi (nếu có sửa frontend)
- [ ] Không còn `console.log` debug, không có `any` mới trong TypeScript
- [ ] Không commit `.env`, key, file PDF/model lớn
- [ ] Có migration mới thì đã commit file migration và ghi trong mô tả PR
- [ ] Có API mới thì xem lại trên Swagger

Ít nhất **1 người review** rồi mới merge. Leader duyệt các PR đụng file dùng chung.

---

## 5. Database & migration

- Chỉ người phụ trách app mới tạo migration cho app đó.
- **Luôn `git pull` trước khi `makemigrations`**, để tránh hai người cùng tạo migration số `0003`.
- **Không sửa migration đã merge vào `main`.** Muốn đổi → tạo migration mới.
- Nếu Django báo *conflicting migrations*:
  ```bash
  docker compose exec be python manage.py makemigrations --merge
  ```
- Mỗi người migrate trên **Neon branch của mình** (`dev-<tên>`), không migrate lên branch `main` của Neon.

---

## 6. Thêm thư viện

**Python** — chạy trên máy, trong `be/`, để `pyproject.toml` và `uv.lock` cùng được cập nhật:

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

Commit cả `package.json` lẫn `package-lock.json` (hoặc `pyproject.toml` lẫn `uv.lock`).

---

## 7. Quy ước code

**Chung**

- File lưu **UTF-8 không BOM**, xuống dòng **LF** (đã có `.editorconfig`, VS Code tự áp dụng).
- **Không** ghi file bằng `Set-Content` / `Out-File` của PowerShell, vì chúng thêm BOM và làm hỏng tiếng Việt.
- Chữ hiển thị cho người dùng: **tiếng Việt**. Tên biến, hàm, commit, comment kỹ thuật: tiếng Anh hoặc tiếng Việt đều được, nhưng thống nhất trong một file.

**Frontend**

- TypeScript `strict`, tránh `any`. Kiểu dữ liệu API đặt cạnh hàm gọi API trong `fe/src/lib/`.
- Gọi backend qua `fe/src/lib/api.ts` (đã gắn token sẵn), không tự `fetch` kèm header ở từng trang.
- Lấy thông tin người đang đăng nhập bằng `useUser()` từ `@/lib/user-context`.
- Màu chủ đạo `#1E3F82`, font Be Vietnam Pro (đã khai báo sẵn).
- Mỗi component một việc; file trên ~300 dòng thì tách nhỏ.

**Backend**

- Mỗi module là một Django app riêng.
- Phân quyền dùng các class trong `be/users/permissions.py`. Mọi API sửa nội dung học (thuật toán, giải phẫu, tài liệu) chỉ dành cho **admin**.
- API mới phải hiện đúng trên Swagger (`/api/schema/swagger-ui/`).

---

## 8. Phân quyền

| Vai trò | Được làm gì |
|---|---|
| `user` | Học, xem nội dung, tạo hoặc tham gia **Không gian**. Trong một không gian: **người tạo** là chủ, **người tham gia** là thành viên. |
| `admin` | Toàn quyền, là người duy nhất thêm/sửa nội dung học và tài liệu. |

Không có role `teacher` / `student` ở cấp hệ thống. Vai trò trong lớp được lưu ở app `classroom`.

---

## 9. Bảo mật

- Không commit `.env`, API key, mật khẩu, `DATABASE_URL`.
- Lỡ commit key → báo leader ngay để **thu hồi key** (xóa commit là chưa đủ, vì key đã nằm trong lịch sử git).
- Không gửi `.env` qua nhóm chat công khai; gửi riêng từng người.

---

## 10. Dùng AI agent (Claude, Gemini, Copilot...)

Được dùng, nhưng:

- Đọc lại **toàn bộ** code AI viết trước khi commit. Bạn chịu trách nhiệm cho code đó.
- Không để agent tự `git commit`, `git push`, xóa file hay chạy migration.
- Quy tắc riêng cho agent ở `fe/AGENTS.md`.

---

## 11. Bản quyền và nội dung bên thứ ba

- Mã, tài liệu, thiết kế do bạn viết trong dự án thuộc bản quyền chung của **Synapse Lab Team** theo [LICENSE](LICENSE). Gửi Pull Request nghĩa là bạn đồng ý điều đó.
- Không đưa mã, văn bản, ảnh, dữ liệu của người khác vào repo khi chưa kiểm tra giấy phép. Nếu dùng, thêm một dòng vào [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) ngay trong PR đó, kèm giữ nguyên file LICENSE của nguồn gốc nếu có.
- Không commit bản chép nguyên trang web, PDF hay giáo trình. Lưu link, trích dẫn ngắn và ghi nguồn; script tải về thì thêm file tải về vào `.gitignore`.
- Nội dung giấy phép **NonCommercial** (CC BY-NC, CC BY-NC-SA) hay **copyleft** (GPL, AGPL, CC BY-SA) cần hỏi leader trước, vì ảnh hưởng đến giấy phép và khả năng thương mại hóa của cả dự án.

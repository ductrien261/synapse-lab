# SYNAPSE LAB — Frontend

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4. Hướng dẫn chạy toàn bộ dự án: xem [README gốc](../README.md).

## Cấu trúc chính

| Đường dẫn | Nội dung |
|---|---|
| `src/app/(auth)/` | Đăng nhập, đăng ký (không có sidebar) |
| `src/app/(main)/` | Các trang sau đăng nhập, dùng chung `layout.tsx` (header + sidebar) |
| `src/components/layout/` | Header, sidebar, menu tài khoản |
| `src/components/dashboard/` | Trang tổng quan |
| `src/lib/api.ts` | Gọi backend Django (tự gắn token) |
| `src/lib/algo-api.ts` | Gọi algo-server |
| `src/lib/user-context.tsx` | `useUser()`: người đang đăng nhập, cập nhật hồ sơ, đăng xuất |
| `src/lib/tracks.ts` | Cấu hình theo chuyên ngành (CNTT / Y khoa) |

## Chạy trực tiếp không qua Docker

```bash
cd fe
npm install
npm run dev               # http://localhost:3100
```

Cần backend (`:8000`) và algo-server (`:8080`) đang chạy.

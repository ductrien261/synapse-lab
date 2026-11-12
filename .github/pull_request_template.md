Closes #

## Mô tả
<!-- Làm gì và vì sao. Một PR = một việc. -->

## Cách kiểm tra
<!-- Các bước để reviewer tự chạy lại được. Giao diện: đính kèm ảnh hoặc GIF. -->

## Ảnh hưởng
- [ ] Có migration mới (ghi tên app và số migration): 
- [ ] Sửa file dùng chung (`docker-compose.yml`, `.env.example`, `be/core/settings.py`, `be/core/urls.py`, `be/pyproject.toml`, `fe/package.json`, `fe/src/lib/api.ts`...): 
- [ ] Thêm biến môi trường mới (đã ghi trong `.env.example`)
- [ ] Thêm thư viện mới (đã commit cả file lock)

## Trước khi xin review
- [ ] CI xanh
- [ ] `docker compose up` chạy được, trang mình sửa hoạt động
- [ ] Không còn `console.log` debug, không có `any` mới trong TypeScript
- [ ] Không commit `.env`, key, file PDF/model lớn
- [ ] Nội dung bên thứ ba (mã, văn bản, ảnh, dữ liệu) đã kiểm giấy phép và ghi vào `THIRD_PARTY_NOTICES.md`
- [ ] Có API mới thì đã xem lại trên Swagger
- [ ] Đã tự đọc lại toàn bộ code, kể cả phần do AI viết

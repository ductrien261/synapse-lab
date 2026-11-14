# Tiến độ

## Issue 1: mở rộng thư viện linh kiện và vị trí chân (#31)
Đã làm:
- Thư viện từ 12 lên 20 linh kiện: thêm cảm biến siêu âm HC-SR04, servo SG90, còi buzzer, LED, tay gắp, khung xe, bánh xe, bánh đa hướng (khung, bánh, bánh đa hướng chuyển từ code bài xe vào thư viện, bài xe vẫn dùng bản cũ trong code).
- Mọi chân có vị trí `pos` và `base` theo hệ của linh kiện; hàm `pinPlacement` tính vị trí trong cảnh.
- Gói bài có thể bỏ trống vị trí chân đấu dây; mã tự tính. Bài tưới cây dạng JSON đã bỏ vị trí khai báo tay.
- Thêm các khối `ball` và `plate` cho linh kiện dựng bằng code; bộ kiểm tra thư viện kiểm tra vị trí chân.

Đã kiểm chứng:
- Vị trí chân tính ra khớp bài tưới cây viết tay (lệch lớn nhất dưới 1e-16 m).
- Ảnh chụp bước tìm hiểu và bước đi dây của bản JSON trùng bản viết tay từng điểm ảnh; đi dây xong, bài tính, thử tự do vẫn chạy.
- Đã dựng thử cả 8 linh kiện mới trong cảnh 3D, hiển thị đúng hình dạng.
- ESLint sạch, typecheck không có lỗi trong các file mới.

Chưa làm: vị trí chân của linh kiện mới (siêu âm, servo...) mới theo thiết kế, chưa đối chiếu với bài thật vì chưa có bài dùng chúng.

## Issue 2: mẫu mô phỏng chung cho bước thử tự do (#32)
Đã làm:
- Ba mẫu mô phỏng dùng chung một giao diện (`TuneKit`): `iot-moisture` (chuyển từ bài viết tay), `formula` (thanh chỉnh, kết quả bằng công thức, đồ thị, cảnh báo giới hạn), `vehicle-arena` (xe trong sân, né khi khoảng cách nhỏ hơn ngưỡng).
- `validatePackage` kiểm tra cấu hình mẫu `formula` (công thức tính được ở giá trị mặc định và hai đầu khoảng).
- Trợ lý AI nhận lab `generic` kèm `context` mô tả bài (BE, AI service, prompt phiên bản v3, FE); thiếu `context` thì báo lỗi.
- Hai gói mẫu: `obstacle-car` và `motor-battery-runtime`.
- Sửa số hiển thị của thanh chỉnh ở mẫu xe (trước đó làm tròn về 0).

Đã kiểm chứng:
- ESLint sạch; typecheck không có lỗi mới ở các file này.
- Validator xác nhận 3 gói hợp lệ.
- Chạy thật 2 gói mới qua đủ các bước: tự lắp, đi dây đủ mạch, vào bước thử tự do; xe chạy, né và va chạm đúng như mô phỏng; đồ thị và kết quả của mẫu công thức hiện đúng.
- Test AI (`ai/tests/test_lab_explainer.py`) chạy qua: 5 passed.

Chưa kiểm chứng:
- Test backend (`be/ai_gateway/test_lab.py`) đã chạy qua trên SQLite với bộ app rút gọn (5 passed), chưa chạy trên Postgres trong Docker.
- Chưa gọi thử AI thật (Groq hoặc Gemini); chỉ test bằng bản giả.
- Bài tính (bước 5) của hai gói mới chưa bấm thử từng bài.

## Issue 3: lưu bài thực hành, xóa mềm và công khai (#33)
Đã làm:
- App `lab` với bảng `lab_lesson`: gói bài, băm nội dung, trạng thái hiển thị, người duyệt và lý do, xóa mềm (không xóa dòng).
- API tạo, liệt kê (của mình, công khai, thùng rác), xem, sửa, xóa mềm, khôi phục, gửi đóng góp, rút lại; admin xem hàng chờ và duyệt hoặc từ chối.
- Backend tự kiểm tra gói (`validators.py`, có bộ tính công thức an toàn bằng `ast`), danh sách linh kiện lấy từ `parts_index.json` và có script tạo lại cùng test bảo vệ.
- Chặn trùng: slug, nội dung giống hệt, tiêu đề quá giống bài công khai; trang quản trị Django cho bài.
- Migration `0001_initial`, đăng ký app và đường dẫn `/api/lab/`.

Đã kiểm chứng:
- 21 test của app `lab` chạy qua (kiểm tra gói, trùng, phân quyền, xóa mềm, quy trình duyệt) trên SQLite với bộ app rút gọn.
- `makemigrations --check` cho `lab` không có thay đổi thừa.

Chưa kiểm chứng:
- Chưa chạy trên Postgres trong Docker và chưa chạy toàn bộ test của các app khác (một app khác dùng cú pháp chỉ có ở Postgres nên không chạy được trên SQLite).
- Chưa có giao diện tạo, quản lý, duyệt bài (thuộc bước sau); chưa có agent sinh bài.

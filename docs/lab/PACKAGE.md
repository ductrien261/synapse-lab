# Gói bài thực hành (lab package)

Một bài thực hành mô tả hoàn toàn bằng JSON. Màn hình chung `GenericLab` đọc gói này để dựng đủ sáu bước: tìm hiểu, xem quy trình, tự lắp, đi dây, tính toán, thử tự do.

- Kiểu dữ liệu: `fe/src/lib/lab/package/types.ts`
- Bộ kiểm tra: `validatePackage()` trong `validate.ts` (trả về danh sách lỗi tiếng Việt, rỗng là hợp lệ)
- Công thức: `expr.ts` (bộ tính an toàn, không dùng eval)
- Bài mẫu: `fe/src/lib/lab/package/packages/iot-watering.json` (bài tưới cây viết lại từ bản viết tay), xem thử ở `/lab/preview/iot-json`
- Bài mẫu thêm: `obstacle-car.json` (xe né vật cản, mẫu `vehicle-arena`) và `motor-battery-runtime.json` (motor và pin, mẫu `formula`). Chỉ là ví dụ kiểm thử mẫu, hệ thống không gắn cứng bài nào

## Ai làm gì
| Phần | Do ai quyết |
|---|---|
| Văn bản học tập, thứ tự lắp, vị trí đặt, cách nối dây, đề bài tính | AI sinh, `validatePackage` kiểm tra |
| Linh kiện, chân, mô hình 3D, kích thước | Thư viện linh kiện (`lib/lab/parts`), AI chỉ chọn mã |
| Đáp án bài tính | Mã tính từ công thức, AI không tự cho đáp án |
| Mẫu mô phỏng bước thử tự do | Chỉ các mẫu đã viết sẵn (hiện có `iot-moisture`, `formula`, `vehicle-arena`) |

## Các luật kiểm tra chính
- Mọi `partId` phải có trong thư viện; mọi `pin` của chân đấu dây phải là chân của linh kiện đó.
- Mỗi mạch (`nets`) có ít nhất 2 chân; luật báo lỗi nối sai (`rules`) chỉ tham chiếu mạch và chân có thật.
- Công thức bài tính phải tính được ở giá trị mặc định, nhỏ nhất và lớn nhất; `{tên}` trong đề phải có biến tương ứng.
- `buildOrder` là hoán vị của các bộ phận.

## Lưu trữ ở backend (app `lab`)
Bảng `lab_lesson` giữ gói bài (`spec`), băm nội dung (`content_hash`), trạng thái hiển thị (`private`, `pending`, `public`) và xóa mềm (`is_deleted`, không bao giờ xóa dòng).

| Việc | API (`/api/lab/`) |
|---|---|
| Tạo bài riêng tư từ gói | `POST lessons/` |
| Danh sách của mình, bài công khai, thùng rác | `GET lessons/?scope=mine\|public\|trash` |
| Xem, sửa, xóa mềm, khôi phục | `GET/PATCH/DELETE lessons/<slug>/`, `POST lessons/<slug>/restore/` |
| Gửi đóng góp, rút lại | `POST lessons/<slug>/submit/`, `POST lessons/<slug>/withdraw/` |
| Admin xem hàng chờ, duyệt hoặc từ chối (cần ghi lý do) | `GET admin/lessons/`, `POST admin/lessons/<slug>/review/` |

Quy tắc chính:
- Backend kiểm tra lại gói (`lab/validators.py`), không tin trình duyệt hay AI. Danh sách linh kiện và chân lấy từ `be/lab/data/parts_index.json`; thêm linh kiện hoặc đổi chân ở frontend thì chạy `python lab/data/export_parts_index.py` (từ thư mục `be`) rồi commit file này. Có test báo khi hai bên lệch nhau.
- Không trùng: `slug` duy nhất (cả bài đã xóa mềm); nội dung giống hệt (băm bỏ qua slug, tên) bị chặn với bài của chính mình và bài công khai; khi gửi đóng góp còn chặn tiêu đề giống bài công khai từ 90% trở lên.
- Sửa nội dung bài đang chờ hoặc đã công khai thì bài về riêng tư, phải gửi duyệt lại.
- Bài riêng tư chỉ chủ bài và admin xem được; bài đã xóa mềm không hiện ở danh sách công khai.

## Việc còn lại
- Agent sinh gói và vòng kiểm tra tự động.
- Thêm mẫu mô phỏng khi cần (ví dụ mạch RC, chuyển động ném, phản ứng hóa học đơn giản).

## Mẫu mô phỏng bước thử tự do
| Mẫu | Dùng khi | AI khai báo gì |
|---|---|---|
| `iot-moisture` | Bài theo dõi và điều khiển bằng ngưỡng (tưới cây) | Không có tham số |
| `formula` | Bài có các đại lượng chỉnh được và kết quả tính bằng công thức | `inputs`, `constants`, `outputs` (biểu thức), `chart`, `limits` |
| `vehicle-arena` | Xe đo khoảng cách và né vật cản | `title`, `intro` (tham số xe người học tự chỉnh) |

Mọi mẫu chỉ chạy khi đã đi dây xong. Trợ lý AI nhận mô tả bài qua `context` (lab `generic`), không cần sửa code cho từng bài.

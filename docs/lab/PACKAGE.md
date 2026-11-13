# Gói bài thực hành (lab package)

Một bài thực hành mô tả hoàn toàn bằng JSON. Màn hình chung `GenericLab` đọc gói này để dựng đủ sáu bước: tìm hiểu, xem quy trình, tự lắp, đi dây, tính toán, thử tự do.

- Kiểu dữ liệu: `fe/src/lib/lab/package/types.ts`
- Bộ kiểm tra: `validatePackage()` trong `validate.ts` (trả về danh sách lỗi tiếng Việt, rỗng là hợp lệ)
- Công thức: `expr.ts` (bộ tính an toàn, không dùng eval)
- Bài mẫu: `fe/src/lib/lab/package/packages/iot-watering.json` (bài tưới cây viết lại từ bản viết tay), xem thử ở `/lab/preview/iot-json`

## Ai làm gì
| Phần | Do ai quyết |
|---|---|
| Văn bản học tập, thứ tự lắp, vị trí đặt, cách nối dây, đề bài tính | AI sinh, `validatePackage` kiểm tra |
| Linh kiện, chân, mô hình 3D, kích thước | Thư viện linh kiện (`lib/lab/parts`), AI chỉ chọn mã |
| Đáp án bài tính | Mã tính từ công thức, AI không tự cho đáp án |
| Mẫu mô phỏng bước thử tự do | Chỉ các mẫu đã viết sẵn (hiện có `iot-moisture`) |

## Các luật kiểm tra chính
- Mọi `partId` phải có trong thư viện; mọi `pin` của chân đấu dây phải là chân của linh kiện đó.
- Mỗi mạch (`nets`) có ít nhất 2 chân; luật báo lỗi nối sai (`rules`) chỉ tham chiếu mạch và chân có thật.
- Công thức bài tính phải tính được ở giá trị mặc định, nhỏ nhất và lớn nhất; `{tên}` trong đề phải có biến tương ứng.
- `buildOrder` là hoán vị của các bộ phận.

## Việc còn lại
- Lưu gói vào cơ sở dữ liệu (xóa mềm, kiểm tra trùng, duyệt đóng góp).
- Agent sinh gói và vòng kiểm tra tự động.
- Trợ lý AI cần nhận ngữ cảnh từ gói (hiện dùng ngữ cảnh của bài IoT viết tay).
- Thêm mẫu mô phỏng cho bước thử tự do ngoài `iot-moisture`.

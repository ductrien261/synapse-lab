# Thư viện linh kiện

Mã nguồn: `fe/src/lib/lab/parts/` (`types.ts` kiểu dữ liệu, `catalog.ts` danh sách, `index.ts` tra cứu và kiểm tra).

## Thêm linh kiện mới
1. Nếu có mô hình 3D: đặt tệp STL (đơn vị mm, đáy nằm ở gốc) vào `fe/public/lab/parts/` và ghi nguồn, giấy phép vào `NOTICE.md` cùng thư mục.
2. Thêm một mục vào `PARTS` trong `catalog.ts`: mã kebab-case duy nhất, tên Việt và Anh, loại, mô tả một câu, `model`, `sizeMm`, danh sách `pins` (mỗi chân có `signal`), `specs`.
3. Chạy `validateParts()` (trả về danh sách lỗi, rỗng là hợp lệ); bộ kiểm tra bắt thiếu vị trí chân và chấm nằm thấp hơn thân.

## Quy ước
- `signal` của chân dùng để kiểm tra dây nối hợp lý (nguồn, đất, số, analog, PWM, motor, qua công tắc).
- Mỗi chân có `pos` (m, theo hệ của linh kiện: gốc ở giữa đáy, y hướng lên) và `base` (độ cao thân tại chân). Vị trí trong cảnh tính bằng `pinPlacement(at, yaw, pin)`; bài đóng gói (JSON) có thể bỏ trống `pos`, `base` của chân đấu dây để mã tự tính.
- Linh kiện dựng bằng code (`model.kind = 'procedural'`) khai báo các khối `blk`, `cyl`, `ball`, `plate`, `arc`. Khối không ghi màu dùng màu của bộ phận.
- Loại `structure` (khung, bánh, tay gắp) và `service` (Wi-Fi) được phép không có chân.
- Bài do AI sinh chỉ được tham chiếu linh kiện và chân có trong thư viện (`hasPart`, `hasPin`).

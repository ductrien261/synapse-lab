# Thư viện linh kiện

Mã nguồn: `fe/src/lib/lab/parts/` (`types.ts` kiểu dữ liệu, `catalog.ts` danh sách, `index.ts` tra cứu và kiểm tra).

## Thêm linh kiện mới
1. Nếu có mô hình 3D: đặt tệp STL (đơn vị mm, đáy nằm ở gốc) vào `fe/public/lab/parts/` và ghi nguồn, giấy phép vào `NOTICE.md` cùng thư mục.
2. Thêm một mục vào `PARTS` trong `catalog.ts`: mã kebab-case duy nhất, tên Việt và Anh, loại, mô tả một câu, `model`, `sizeMm`, danh sách `pins` (mỗi chân có `signal`), `specs`.
3. Chạy `validateParts()` (trả về danh sách lỗi, rỗng là hợp lệ).

## Quy ước
- `signal` của chân dùng để kiểm tra dây nối hợp lý (nguồn, đất, số, analog, PWM, motor, qua công tắc).
- Vị trí chân `pos` (mm, theo hệ tọa độ linh kiện) có thể bổ sung sau khi đo trên mô hình; hiện các bài viết tay vẫn đặt vị trí điểm nối trong tệp `*-wiring.ts` của riêng nó.
- Bài do AI sinh chỉ được tham chiếu linh kiện và chân có trong thư viện (`hasPart`, `hasPin`).

# Hướng dẫn setup BigBlueButton và Zoom cho Ngân

Bộ này dùng để cấu hình tích hợp trên dự án `vku_dt` đã cài và chạy được. Các key, secret, token và ID tài khoản trong file mẫu đều để trống. Laravel không tự đọc thư mục `setup`; cấu hình thực tế vẫn nằm trong `.env` và `config/` ở gốc dự án.

## 1. Các file trong bộ setup

| File | Cách sử dụng |
| --- | --- |
| [.env.example](.env.example) | Mẫu biến môi trường cho BBB, Zoom và phần YouTube tùy chọn. |
| [config/bbb.php](config/bbb.php) | Bản cấu hình BBB, tương ứng `vku_dt/config/bbb.php`. |
| [config/services.example.php](config/services.example.php) | Các mục `zoom`, `youtube`, `classroom` để đối chiếu hoặc ghép vào `vku_dt/config/services.php`. |
| [FILES.md](FILES.md) | Danh sách file code, route và tác vụ quan trọng trong dự án. |
| [setup bbb.md](<setup bbb.md>) | Dựng BBB bằng Docker trên Linux để kết nối với web local, gồm cách build dev và pull image sẵn. |

Không chép đè toàn bộ `.env` hoặc `config/services.php`: các file đó còn cấu hình database và dịch vụ khác. Các mục PHP trên đã có trong dự án hiện tại, thông thường Ngân chỉ cần sửa `.env` và nhập tài khoản Zoom trên trang quản trị.

## 2. Chuẩn bị cấu hình ứng dụng

1. Mở `.env` ở gốc `vku_dt`.
2. Đối chiếu với `setup/.env.example`, cập nhật các biến đã có và chỉ thêm biến còn thiếu, tránh khai báo trùng.
3. Đặt `APP_URL` thành địa chỉ HTTPS công khai của ứng dụng để các callback truy cập được. Không để trống khi triển khai.
4. Điền thông tin thật trực tiếp trên môi trường triển khai; giữ file mẫu trong `setup` trống thông tin xác thực.
5. Giữ nguyên `APP_KEY` và cấu hình database đang sử dụng.

## 3. Setup BigBlueButton

### Chuẩn bị server BBB

Nếu chưa có server BBB, chuẩn bị máy chủ và tên miền riêng theo [hướng dẫn cài đặt chính thức](https://docs.bigbluebutton.org/administration/install/). Thực hiện các bước kiểm tra hệ điều hành, tài nguyên, DNS, HTTPS và cổng mạng trong tài liệu cho phiên bản định cài. Thư mục này chứa cấu hình kết nối ứng dụng, không chứa bộ cài server BBB.

Trên **server BBB**, kiểm tra dịch vụ và lấy thông tin kết nối:

```bash
sudo bbb-conf --check
sudo bbb-conf --secret
```

Lệnh thứ hai hiển thị URL và shared secret; điền riêng vào `.env` của ứng dụng. Xem [tài liệu bbb-conf](https://docs.bigbluebutton.org/administration/bbb-conf/).

### Điền `.env` của ứng dụng

| Biến | Giá trị cần nhập |
| --- | --- |
| `BBB_ENABLED` | Chuyển thành `true` sau khi đã có server và secret. |
| `BBB_URL` | URL API đầy đủ, ví dụ `https://bbb.example.com/bigbluebutton/api`; nếu URL lấy từ server chỉ kết thúc bằng `/bigbluebutton/`, bổ sung `api`. |
| `BBB_SECRET` | Shared secret của server BBB. |
| `BBB_CHECKSUM_ALGORITHM` | Mặc định `sha256`; phải tương thích server. Code hỗ trợ `sha256`, `sha384`, `sha512`. |
| `BBB_SSL_VERIFY` | Giữ `true`, dùng chứng chỉ HTTPS hợp lệ. |
| `BBB_CONNECT_TIMEOUT`, `BBB_TIMEOUT` | Mặc định lần lượt 5 và 15 giây. |
| `BBB_RECORDING_CALLBACK_SECRET` | Secret riêng dùng chung với bên gửi callback bản ghi, nếu triển khai tính năng này. |

### Callback và bản ghi BBB

- Callback kết thúc buổi học được ứng dụng tự tạo URL có chữ ký; không tự viết URL thiếu chữ ký.
- Nhận kết quả bản ghi: `POST https://<ten-mien-ung-dung>/api/internal/bbb/recordings/completed`.
- Đây là giao thức callback riêng của dự án. Chỉ điền secret chưa đủ để BBB tự gửi bản ghi; phía xử lý bản ghi phải có tích hợp gửi đúng payload.
- Header `X-BBB-Callback-Signature` chứa HMAC-SHA256 dạng hex của **nguyên body request**, ký bằng `BBB_RECORDING_CALLBACK_SECRET`. Cấu trúc payload xem validator trong `FILES.md`.

## 4. Setup Zoom

### Tạo ứng dụng Zoom

1. Dùng tài khoản có quyền tạo ứng dụng Server-to-Server OAuth trong Zoom App Marketplace.
2. Tạo ứng dụng **Server-to-Server OAuth**, điền thông tin bắt buộc.
3. Lấy `Account ID`, `Client ID`, `Client Secret` ở phần credentials.
4. Thêm scopes cho các API sử dụng: tạo/đọc/cập nhật/xóa meeting, đọc user khi kiểm tra tài khoản; thêm quyền registrants, recordings hoặc livestream khi bật chức năng tương ứng. Đối chiếu từng endpoint trong `ZoomService.php` với scopes hiện hành trên Zoom.
5. Kích hoạt ứng dụng sau khi hoàn tất thông tin và scopes.

Tham khảo [tạo ứng dụng Server-to-Server OAuth](https://developers.zoom.us/docs/internal-apps/create/) và [cơ chế xác thực](https://developers.zoom.us/docs/internal-apps/s2s-oauth/).

### Nhập tài khoản trong dự án

1. Đăng nhập quản trị, mở `/admincp/center/zoom-accounts`.
2. Thêm tài khoản/phòng Zoom: nhập tên phòng, email và ba thông tin credentials vừa lấy.
3. Lưu, bảo đảm tài khoản được bật, rồi dùng chức năng kiểm tra kết nối.
4. Nếu luồng sử dụng credentials từ môi trường, điền thêm `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` vào `.env`.

Dự án có cả luồng dùng tài khoản trong database (`table_center_zoom_accounts`) và luồng dùng `.env`. Chỉ nhập `.env` không tự tạo tài khoản trong danh sách quản trị.

### Webhook Zoom

1. Điền `ZOOM_WEBHOOK_SECRET` trong `.env` bằng secret token của webhook Zoom.
2. Áp dụng cấu hình theo bước 5 bên dưới trước khi xác thực endpoint.
3. Cấu hình endpoint trên Zoom: `https://<ten-mien-ung-dung>/api/center/zoom-webhook`.
4. Đăng ký các sự kiện mà code hiện xử lý: `meeting.started`, `meeting.ended`, `meeting.participant_joined`, `meeting.participant_left`, `recording.completed` theo tính năng sử dụng.
5. Thực hiện xác thực endpoint trên Zoom; ứng dụng có xử lý `endpoint.url_validation`.

Cloud recording phụ thuộc quyền/tính năng của tài khoản Zoom. Các biến `YOUTUBE_*` trong mẫu phục vụ luồng livestream riêng; giữ `YOUTUBE_AUTO_LIVESTREAM_ENABLED=false` nếu chưa triển khai YouTube.

## 5. Áp dụng và kiểm tra

Chạy tại thư mục gốc `vku_dt` sau khi sửa `.env`:

```bash
php artisan config:clear
```

Nếu quy trình triển khai sử dụng config cache, tạo lại sau khi đã điền đủ cấu hình:

```bash
php artisan config:cache
```

Trên máy chủ ứng dụng, cấu hình cron chạy scheduler mỗi phút (thay đường dẫn bằng đường dẫn thật):

```cron
* * * * * cd /duong-dan/vku_dt && php artisan schedule:run >> /dev/null 2>&1
```

Scheduler hiện chạy `zoom:generate-links` và `bbb:auto-end-meetings`. Nếu bật luồng YouTube dùng database queue, cần bảng jobs, worker và trình quản lý tiến trình; `config/queue.php` hiện lấy queue mặc định từ `QUEUE_DRIVER`, còn luồng YouTube có `ZOOM_YOUTUBE_QUEUE_CONNECTION` riêng. Không bật YouTube chỉ bằng cách điền credentials.

Kiểm tra thực tế:

1. Zoom: kiểm tra tài khoản trên trang quản trị, tạo buổi học thử rồi vào bằng vai trò giảng viên và học viên.
2. BBB: tạo buổi học sử dụng BBB, thử vào phòng, mic/camera và kết thúc phòng.
3. Kiểm tra cập nhật trạng thái/điểm danh sau sự kiện Zoom; kiểm tra bản ghi nếu đã triển khai callback tương ứng.
4. Nếu lỗi, xem log trong `storage/logs/`. Không chia sẻ secret hoặc URL có chữ ký trong log.

| Hiện tượng | Chỗ kiểm tra |
| --- | --- |
| BBB báo chưa cấu hình | `BBB_ENABLED`, URL API, secret và config cache. |
| BBB báo checksum sai | Secret và thuật toán checksum giữa ứng dụng/server. |
| Không vào được phòng BBB | DNS, HTTPS, mạng của server theo hướng dẫn cài BBB. |
| Zoom không lấy được token | Đúng loại app Server-to-Server OAuth, đã kích hoạt, credentials chính xác. |
| Zoom thiếu quyền API | Scopes ứng với endpoint đang gọi. |
| Không có tài khoản Zoom để chọn | Tài khoản đã thêm/bật trên trang quản trị và có khả dụng ở thời gian đặt lịch. |
| Webhook không xác thực | Secret, domain HTTPS công khai, endpoint và config cache. |

Bộ setup chưa được kiểm thử kết nối với tài khoản/server thật vì các credentials được để trống theo yêu cầu.

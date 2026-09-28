# Các file quan trọng trong dự án

Các link dưới trỏ tới code đang chạy, tránh tạo thêm bản sao service dễ lệch phiên bản. Bộ `setup` dùng kèm toàn bộ dự án `vku_dt`.

| Nhóm | File nguồn | Vai trò |
| --- | --- | --- |
| BBB | [config/bbb.php](../config/bbb.php) | Đọc biến môi trường BBB. |
| BBB | [BbbConstants.php](../app/Constants/BbbConstants.php) | API, vai trò, thuật toán checksum. |
| BBB | [BbbService.php](../app/Services/BbbService.php) | Ký request, tạo/vào/kết thúc phòng. |
| BBB | [BbbRecordingService.php](../app/Services/Center/BbbRecordingService.php) | Kiểm tra chữ ký và xử lý bản ghi. |
| BBB | [BbbRecordingCallbackValidator.php](../app/Validators/Request/Api/BbbRecordingCallbackValidator.php) | Các trường payload callback bản ghi. |
| BBB | [BbbRecordingConstants.php](../app/Constants/BbbRecordingConstants.php) | Header chữ ký và trạng thái bản ghi. |
| BBB | [routes/api.php](../routes/api.php) | Endpoint callback và tài liệu trình chiếu. |
| Zoom | [config/services.php](../config/services.php) | Cấu hình Zoom, YouTube và lưu trữ. |
| Zoom | [ZoomService.php](../app/Services/ZoomService.php) | OAuth, meeting, registrants, recording. |
| Zoom | [ZoomAccountRepository.php](../app/Repository/Center/ZoomAccountRepository.php) | Tài khoản Zoom lưu trong database. |
| Zoom | [zoom_accounts.blade.php](../resources/views/trungtam/zoom_accounts.blade.php) | Giao diện thêm/kiểm tra tài khoản. |
| Zoom | [routes/center_admin.php](../routes/center_admin.php) | Route quản trị tài khoản Zoom. |
| Zoom | [routes/web.php](../routes/web.php) | Route nhận webhook Zoom. |
| Zoom | [ZoomWebhookHandler.php](../app/Handler/Center/ZoomWebhookHandler.php) | Xác thực và xử lý sự kiện Zoom. |
| Tác vụ | [app/Console/Kernel.php](../app/Console/Kernel.php) | Lịch tự tạo link Zoom/kết thúc phòng BBB. |
| Tác vụ | [config/queue.php](../config/queue.php) | Kết nối queue. |
| Database | [database/migrations](../database/migrations) | Schema của toàn dự án; cần đồng bộ khi triển khai mới. |

Không sao chép service hoặc migrations riêng lẻ để dựng một ứng dụng mới: các file này phụ thuộc controller, handler, repository và schema của dự án. Với môi trường đang chạy, chỉ cấu hình theo README; với môi trường mới, hoàn tất quy trình triển khai và migration của toàn dự án trước.

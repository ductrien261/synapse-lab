# Phòng thí nghiệm: ý tưởng cần suy nghĩ tiếp

Ghi chú nội bộ cho nhóm phát triển. Chưa có quyết định, chỉ để không quên.

## 1. AI hỗ trợ tạo học liệu thí nghiệm

**Vấn đề.** Nếu đội ngũ tự làm mọi bài thí nghiệm thì không thể phủ hết nhiều lĩnh vực (robot, điện tử, vật lý, hóa học...). Cần cách để học liệu đa dạng hơn mà không phải tự tay làm tất cả.

**Hướng đang nghĩ.**
- Người dùng nhờ AI giúp tạo một bài thí nghiệm hoặc bộ tham số mới, rồi tự dùng.
- Nếu muốn chia sẻ, người dùng gửi đóng góp. Quản trị viên duyệt, sau khi duyệt mọi người mới thấy (cùng luồng "bản nháp, duyệt, xuất bản" đang dùng cho nội dung khác).
- AI chỉ hỗ trợ ở dạng khai báo: mô tả thiết bị, các bộ phận, thông số, bài hướng dẫn. AI không tự viết engine mô phỏng.

**Câu hỏi mở.**
- Định dạng khai báo thiết bị/bài học nào đủ rộng để AI sinh ra mà vẫn kiểm tra được tính hợp lệ (schema có phiên bản, kiểm giới hạn giá trị ở backend)?
- Làm sao đảm bảo mô phỏng vẫn đúng vật lý khi nội dung do AI hỗ trợ tạo?
- Cơ chế duyệt: ai duyệt, tiêu chí gì, có gắn nhãn "do cộng đồng đóng góp" không?
- Giấy phép và bản quyền của model 3D hoặc nội dung người dùng tải lên.
- Chi phí AI và hạn mức cho người dùng tạo nội dung.

**Làm trước.** Hoàn thiện một bài mẫu thật tốt (cánh tay robot) để biết cấu trúc "bộ phận, bước lắp, thông số, kiểm tra" cần những trường dữ liệu nào, rồi mới thiết kế phần cho người dùng tự tạo.

## 2. Thư viện linh kiện và bản lắp ráp khai báo

**Kết quả tra cứu kho linh kiện mở** (giấy phép Apache-2.0, MIT hoặc BSD):
- MuJoCo Menagerie: nhiều robot hoàn chỉnh (có SO-ARM100), không phải linh kiện rời để ghép lại.
- bd_warehouse / cq_warehouse: sinh vòng bi, ốc vít, bánh răng theo tham số bằng Python CAD, cần sinh lưới 3D trước khi dùng trên web.
- Wokwi elements (MIT): khoảng 48 linh kiện điện tử (Arduino, ESP32, cảm biến...), hợp với bài IoT.
- Chưa có kho nào đủ linh kiện rời để ghép ra cánh tay giống SO-101.

**Hướng chọn.**
- Bài cố định (như cánh tay) dùng mô hình SO-101.
- Bài do AI hỗ trợ dùng thư viện linh kiện riêng của dự án: khối khung, khớp, động cơ, bánh xe... và Wokwi cho điện tử.
- Hai bên thống nhất ở định dạng mô tả lắp ráp (JSON dạng URDF): danh sách linh kiện, khớp (loại, trục, giới hạn), vị trí gắn. SO-101 cũng chỉ là một bản lắp ráp theo định dạng này.
- AI chỉ chọn linh kiện và khai báo khớp. Backend kiểm tra tính hợp lệ. AI không tự tính vật lý.

**Luồng hiển thị và duyệt.**
1. Người dùng tự tạo: bản lắp ráp ở trạng thái riêng tư, chỉ chủ sở hữu thấy, không cần admin duyệt.
2. Kiểm tra tự động của backend chạy ngay khi tạo (khớp hợp lệ, kích thước, linh kiện có trong thư viện). Bản hỏng thì không chạy được, kể cả ở chế độ riêng tư.
3. Khi chủ sở hữu bấm "Đóng góp" để công khai cho cộng đồng, bản này chuyển sang chờ duyệt. Admin duyệt xong thì mọi người mới thấy.
4. Bản đã công khai mà chủ sở hữu sửa lại: bản đang hiển thị giữ nguyên, bản sửa quay lại chờ duyệt. Admin có thể gỡ một bản về riêng tư.

**Câu hỏi mở.** Chưa chốt: tiêu chí admin duyệt, nhãn "do cộng đồng đóng góp", giấy phép các mô hình 3D người dùng tải lên, hạn mức AI cho người tạo.


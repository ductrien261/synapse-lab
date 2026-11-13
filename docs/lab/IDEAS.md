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


## 3. Cấu trúc tổng thể của Phòng thí nghiệm (định hướng, chưa làm)

**Tên khu chung: "Phòng STEM"** (tạm; chưa chốt). Bên trong có ba phòng:
1. **Phòng thực hành** (đang làm: cánh tay, xe dò vạch, IoT). Bài học có sẵn các bước: tìm hiểu, xem quy trình, tự lắp, đi dây, tính toán, thử tự do. Mỗi mục là một "bài thực hành".
2. **Phòng kỹ thuật** (kiểu Tinkercad). Cho sẵn môi trường và linh kiện, người dùng kéo thả để tự lắp ráp, đi dây, có AI giúp sức khi gặp khó.
3. **Phòng thí nghiệm** (hóa học, vật lý, pha chế). Cho sẵn dụng cụ (lọ, ống nghiệm...) và hóa chất, người dùng kéo thả rồi xem phản ứng xảy ra, có AI đồng hành.

AI ở cả ba phòng là người cùng làm: hỏi khi thắc mắc, gợi ý khi vướng, không làm thay.

**Thứ tự.** Làm xong phần AI sinh gói bài thực hành (mục 1 và 2) rồi mới làm phòng kỹ thuật và phòng khoa học. Hai phòng mới dùng lại thư viện linh kiện, khung 3D, đi dây và khung trợ lý AI đã có.

**Lưu dữ liệu.**
- Bài chuẩn của đội (cánh tay, xe, IoT): giữ trong mã nguồn.
- Nội dung người dùng tạo hoặc đóng góp thì thay đổi liên tục nên phải lưu trong cơ sở dữ liệu, không cố định cứng trong code.
- Nội dung bài và bản lắp ráp lưu dạng JSON có `schema_version`, backend kiểm tra theo schema trước khi lưu và trước khi hiển thị. File mô hình 3D để ngoài cơ sở dữ liệu (thư mục tĩnh hoặc kho lưu trữ), cơ sở dữ liệu chỉ giữ đường dẫn và thông tin giấy phép.

**Quy ước đặt tên (đề xuất, chưa chốt).** Gom vào một app Django `lab`, bám theo cách repo đang đặt tên:
- Model tiếng Anh, PascalCase, số ít, không thêm tiền tố vì Django tự ghép tên app vào tên bảng (app `lab` + model `Part` thành bảng `lab_part`, giống `classroom_student`); tên trường tiếng Anh snake_case; nội dung tiếng Việt đặt ở trường `name_vi`, `description_vi`; nhãn hiển thị (`verbose_name`) tiếng Việt.
- Trạng thái dùng `status` kiểu `TextChoices` giống các app khác (nháp, chờ duyệt, xuất bản), thêm cờ riêng tư; người tạo là `created_by` (khóa ngoại tới người dùng, `SET_NULL`).
- Các bảng dự kiến: `Part` → `lab_part` (linh kiện, dụng cụ, hóa chất: loại, kích thước, các chân, thông số, file 3D, giấy phép), `Lesson` → `lab_lesson` (một bài thực hành: `spec` JSON), `Build` → `lab_build` (bản lắp ráp ở phòng kỹ thuật: `spec` JSON), `Submission` → `lab_submission` (đóng góp chờ duyệt: người duyệt, ghi chú), `Progress` → `lab_progress` (tiến độ người học: bước đã xong, kết quả).
- `kind` phân biệt loại phòng (`practice`, `workshop`, `science`) để một bảng dùng chung cho nhiều phòng.

**Câu hỏi mở.** Chốt tên tiếng Việt cho từng phòng; chống rủi ro khi người dùng ghép hóa chất nguy hiểm trong phòng khoa học (giới hạn hóa chất, cách mô tả phản ứng); dùng chung một khung trợ lý AI cho cả ba phòng; thư viện linh kiện cho phòng khoa học (dụng cụ, hóa chất) lấy mô hình 3D và dữ liệu phản ứng ở đâu cho đúng giấy phép.

# Lộ trình Phòng STEM

Ba giai đoạn, làm lần lượt. Mỗi mục nhỏ là một Issue và một PR.

## Giai đoạn 1: Phòng thực hành, AI sinh bài
Mục tiêu: người dùng nhập yêu cầu, hệ thống sinh ra một bài thực hành đủ 6 bước như ba bài có sẵn; người dùng sửa, xóa, đóng góp công khai; mọi thứ lưu trong cơ sở dữ liệu.

Đã xong: thư viện linh kiện (#28), khung JSON và màn hình chung (#29).

| # | Việc | Ghi chú |
|---|---|---|
| 1.1 | Mở rộng thư viện linh kiện | Thêm nhiều loại linh kiện thông dụng (đủ để ghép được các ví dụ demo, nhưng không giới hạn ở đó): siêu âm, servo SG90, buzzer, LED, tay gắp; chuyển khung xe, bánh xe vào thư viện; thêm vị trí chân (hệ tọa độ linh kiện) để mã tự tính vị trí đấu dây |
| 1.2 | Mẫu mô phỏng cho bước thử tự do | Mẫu "chỉnh thông số, công thức ra kết quả và biểu đồ"; mẫu xe chạy trong sân có vật cản |
| 1.3 | Backend lưu bài (app `lab`) | Bảng `lab_lesson`, `lab_submission`, `lab_progress`; `slug` duy nhất, `content_hash` chống trùng, `visibility` (riêng tư, chờ duyệt, công khai), xóa mềm `is_deleted`, `schema_version`; API tạo, xem, sửa, xóa mềm, gửi đóng góp, admin duyệt hoặc từ chối |
| 1.4 | Kiểm tra gói bài ở backend | Cùng luật với `validatePackage`; bài không hợp lệ không được lưu |
| 1.5 | Agent sinh bài (AI service) | Xem sơ đồ bên dưới; giới hạn số vòng sửa, ghi chi phí token qua `ai_gateway` |
| 1.6 | Giao diện tạo và quản lý bài | Form yêu cầu, tiến trình sinh, xem thử, sửa, xóa, đóng góp; danh sách "Bài của tôi" và "Bài cộng đồng"; trang admin duyệt |
| 1.7 | Trợ lý AI nhận ngữ cảnh từ gói bài | Thay ngữ cảnh gắn cứng theo ba bài |
| 1.8 | An toàn và giới hạn | Hạn mức sinh bài theo người dùng, lọc nội dung, kiểm tra bài trùng |
| 1.9 | Kiểm thử bằng ví dụ | Dùng vài yêu cầu mẫu (ví dụ xe né vật cản, robot nhặt rác, thùng rác thông minh) để thử hệ thống và dùng khi demo. Đây chỉ là ví dụ: người dùng nhập yêu cầu bất kỳ, AI ghép từ thư viện; không có bài nào được viết sẵn hay gắn cứng |
| 1.10 | Tài liệu đặc tả và sơ đồ luồng | Cho báo cáo của đội |

### Luồng agent (dự kiến)
1. **Lập kế hoạch:** từ yêu cầu, chọn chủ đề, mục tiêu, các bước.
2. **Chọn linh kiện:** chỉ chọn trong thư viện.
3. **Soạn nội dung:** tìm hiểu, mô tả từng bước lắp, gợi ý.
4. **Thiết kế đi dây:** mạch, chân, luật báo lỗi nối sai.
5. **Ra đề tính:** công thức và lời giải thích, đáp án do mã tính.
6. **Kiểm tra (không dùng AI):** `validatePackage`; sai thì trả lỗi về đúng agent phụ trách sửa.
7. **Đánh giá (AI):** đọc lại bài như người học, soát logic, lời giải thích, mức độ.
8. **Giám sát:** điều phối, tối đa vài vòng sửa, đạt mới lưu ở trạng thái nháp.

Cần quyết trước khi làm 1.5: model cho từng agent (model mạnh cho lập kế hoạch và soạn nội dung, model nhanh cho chọn linh kiện và đánh giá), ngân sách token mỗi bài, xử lý khi hết vòng sửa mà vẫn lỗi.

## Giai đoạn 2: Phòng kỹ thuật (kiểu Tinkercad)
Người dùng chọn môi trường và linh kiện, kéo thả để lắp, tự đi dây, AI đồng hành.
- Trình chỉnh: kéo thả, hít vào điểm gắn, xoay, xóa, hoàn tác.
- Đi dây tự do: kiểm tra mạch bằng mô phỏng điện đơn giản (nguồn, đất, ngắn mạch, quá dòng) dựa trên thông số điện của linh kiện.
- Trợ lý AI cùng làm: hỏi khi vướng, gợi ý, không làm thay.
- Lưu bản lắp ráp: bảng `lab_build`, cùng quy ước riêng tư, đóng góp, xóa mềm.
- Điều kiện: thư viện linh kiện có vị trí chân, điểm gắn và thông số điện đầy đủ.

## Giai đoạn 3: Phòng thí nghiệm khoa học (hóa học, vật lý)
Dụng cụ (lọ, ống nghiệm) và chất liệu để kéo thả, xem phản ứng.
- Dữ liệu: bảng chất (`lab_substance`) và phản ứng (`lab_reaction`), động cơ luật quyết định kết quả (đổi màu, sủi bọt, kết tủa, nhiệt).
- Bắt đầu hẹp: một nhóm thí nghiệm an toàn (axit bazơ, chất chỉ thị) rồi mở rộng.
- Giới hạn an toàn: không mô phỏng chất nguy hiểm theo cách có thể dùng để làm hại; AI chỉ trả lời trong phạm vi chương trình học.
- Nội dung hóa học phải có người kiểm tra độ chính xác, nguồn dữ liệu phải rõ giấy phép.
- Trợ lý AI cùng làm thí nghiệm.

## Rủi ro chính
- AI sinh bài sai kiến thức hoặc mạch điện sai: chặn bằng bộ kiểm tra mã, bước đánh giá và duyệt của admin trước khi công khai.
- Chi phí token: hạn mức theo người dùng, theo dõi chi phí từng lần sinh.
- Giấy phép mô hình 3D: chỉ dùng nguồn đã xác nhận, ghi trong `NOTICE.md`.
- Bài do người dùng sinh bị lạm dụng: hàng chờ duyệt, báo cáo, xóa mềm để khôi phục.

## Quyết định cho agent sinh bài (đã chốt, xem lại khi đo được chi phí thật)
- **Nhà cung cấp:** dùng key Gemini (hạn mức lớn, qua giao diện tương thích OpenAI sẵn có trong AI service), tách khỏi Groq đang dùng cho trợ lý. Groq giữ nguyên cho trợ lý hỏi đáp.
- **Hai tầng model, cấu hình bằng biến môi trường** (`LAB_GEN_MODEL_STRONG`, `LAB_GEN_MODEL_FAST`), không ghi cứng tên model trong code. Tên cụ thể chọn lúc làm 1.5 sau khi liệt kê model mà key hiện dùng được.
  - Tầng mạnh: lập kế hoạch, soạn nội dung, thiết kế đi dây, ra đề tính (cần suy luận và JSON đúng cấu trúc).
  - Tầng nhanh: chọn linh kiện, đánh giá cuối (việc ngắn, chạy nhiều).
  - Bước kiểm tra là mã thuần, không tốn token.
- **Ngân sách:** mỗi lần sinh tối đa khoảng 8 lệnh gọi model và 3 vòng sửa; trần mềm 60.000 token mỗi bài (vượt thì dừng và báo). Hạn mức mỗi người dùng 5 bài mỗi ngày (chỉnh được bằng cấu hình). Yêu cầu giống hệt trong cùng ngày dùng lại kết quả đã có. Mỗi lần gọi ghi token và chi phí qua `ai_gateway`.
- **Hết vòng sửa mà vẫn lỗi:** không bỏ phí. Lưu bài ở trạng thái "nháp chưa đạt" kèm danh sách lỗi còn lại, người dùng có thể sửa tay hoặc bấm sinh lại (tính vào hạn mức). Bài chưa đạt không bao giờ được đóng góp công khai.
- **Sửa có định hướng:** lỗi nào thì chỉ agent phụ trách phần đó sửa lại phần đó, không sinh lại cả bài, để tiết kiệm token và tránh làm hỏng phần đã đúng.

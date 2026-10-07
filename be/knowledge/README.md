# Kho tài liệu

Trang quản trị nạp OpenStax bằng mục lục hoặc PDF bằng file tải lên. Mục **Giáo trình mở CNTT** cung cấp thêm ba PDF đã kiểm tra giấy phép: hai chương từ *Algorithms* của Jeff Erickson (CC BY 4.0) và *Open Data Structures* của Pat Morin (CC BY 2.5 CA).

Nút **Xem PDF** trong chi tiết tài liệu mở file đã lưu trong modal. `GET /api/knowledge/admin/documents/<id>/preview/` chỉ cho admin đọc, trả PDF dạng inline; trình duyệt nhận file qua bearer token rồi tạo URL tạm cho khung xem. Đóng modal sẽ giải phóng URL tạm. Tài liệu OpenStax tiếp tục dùng liên kết trang nguồn.

Nguồn CNTT đi qua cùng pipeline PDF hiện có: tải bản PDF gốc, đọc chữ và số trang bằng PyMuPDF, tách mục theo tiêu đề, chia đoạn có phần gối đầu, tạo chỉ mục tìm kiếm, lưu `Document` và `DocumentChunk`. Mỗi đoạn giữ URL PDF với `#page=N`; tài liệu giữ tác giả, URL gốc và URL giấy phép. Scope luôn là `cs`; các tài liệu `med` không được sửa khi nạp nguồn này.

Nếu Gemini embedding bị từ chối, chỉ các nguồn CNTT tuyển chọn được nạp với chỉ mục từ khóa và hiển thị nhãn **Chỉ từ khóa** trong admin. Tìm kiếm AI cho `scope=cs` cũng dùng chỉ mục từ khóa trong trường hợp này. Sau khi thay khóa hợp lệ, chạy lại để tạo vector:

```sh
python manage.py ingest_curated_cs erickson-backtracking erickson-greedy morin-open-data-structures --refresh
```

Lệnh bỏ qua nguồn đã nạp đủ nếu không có `--refresh`. `--keyword-only` dùng khi muốn chủ động nạp từ khóa mà không gọi Gemini. Không chạy đồng thời với lượt nạp khác.

Backend và AI service phải cùng nhận một `DATABASE_URL`. Nếu biến này được đổi sau khi container đã chạy, tạo lại container AI (`docker compose up -d --no-deps --force-recreate ai`) để tránh tình huống admin thấy tài liệu nhưng AI tìm ở database cũ.
# Seed nguồn CNTT đã biên tập

Ba tài liệu CNTT trong `knowledge/data/curated_cs_seed.json` được khóa bằng SHA-256 của PDF gốc.
Hai chương của Jeff Erickson được chia theo trang PDF và khôi phục tên tiểu mục đọc được; Open Data Structures dùng 145 mục lục nhúng trong PDF để gắn tiêu đề và trang trích dẫn chính xác.

Chạy `python manage.py seed_curated_cs --build` để tái tạo file seed từ PDF đã lưu; lệnh này không ghi DB. Rà soát diff của JSON trước khi chạy `python manage.py seed_curated_cs --apply`. Lệnh áp dụng chỉ thay chunk của đúng ba tài liệu `scope=cs`, trong một transaction, và kiểm tra fingerprint của tài liệu/chunk Y trước–sau. Chỉ mục hiện là từ khóa; muốn có embedding cần key Gemini hợp lệ và một lượt index riêng.

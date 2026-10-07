# Kết quả seed Neon ngày 04/10/2026

Đã commit migration thuật toán 0002–0007 và seed bốn bài quay lui trong cùng transaction. Không dùng `--update-existing`, không chạy migrate toàn dự án, không đồng bộ lại danh mục.

- Thuật toán: 71 trước và sau; 8 nhóm giữ nguyên.
- Nội dung bài học: 0 → 4; 67 bài còn lại không tạo nội dung.
- Giữ nguyên ID, tên, metadata và cờ xuất bản của danh mục/thuật toán.
- 14 ảnh được seed tham chiếu đã có trên R2 và khớp SHA-256 với bản local; không cần upload/ghi đè.
- Bật `LESSON_ASSETS_ON_S3=True` trong `.env`, tạo lại riêng backend để nhận cấu hình R2.
- 12 kiểm thử seed/migration đạt trên PostgreSQL tạm riêng; môi trường kiểm thử đã được dọn.

## Đối chiếu bảng được bảo vệ

Đối chiếu số bản ghi và fingerprint toàn bộ giá trị từng dòng trước/sau trong transaction. Cả 15 bảng khớp. Fingerprint là MD5 tổng hợp các hash dòng đã sắp xếp, dùng để phát hiện thay đổi, không phải bản backup.

| Bảng | Số bản ghi trước/sau | Kết quả |
| --- | ---: | --- |
| `algorithms_algorithm` | 71 | Không đổi |
| `algorithms_algorithmcategory` | 8 | Không đổi |
| `algorithms_algorithmreference` | 0 | Không đổi |
| `anatomy_anatomymodel` | 93 | Không đổi |
| `anatomy_anatomytoolcollection` | 7 | Không đổi |
| `anatomy_anatomytoolitem` | 486 | Không đổi |
| `anatomy_bodysystem` | 11 | Không đổi |
| `anatomy_importjob` | 10 | Không đổi |
| `anatomy_modelannotation` | 437 | Không đổi |
| `anatomy_structure` | 314 | Không đổi |
| `anatomy_structuredraft` | 314 | Không đổi |
| `anatomy_structurereference` | 320 | Không đổi |
| `knowledge_document` | 1 | Không đổi |
| `knowledge_documentchunk` | 1299 | Không đổi |
| `knowledge_ingestjob` | 5 | Không đổi |

## Phạm vi và khôi phục

Migration chỉ thêm trường/bảng thuật toán; migration 0006 đọc nguồn CS/general và không ghi vào tài liệu y khoa. Seed chỉ tạo bốn AlgorithmContent của các khóa backtracking đã có. Mọi sai khác của bảng được bảo vệ sẽ làm rollback trước commit.

Không thực hiện restore toàn DB hoặc rollback migration trên DB chung. Nếu cần hoàn tác nội dung đã nạp, đối chiếu từng bản ghi với seed và các chỉnh sửa mới trước khi xử lý riêng bốn bài.

Seed SHA-256: `e76d9dac8ed6e0b560b7d0190c3f936294d0ce8b19fcb3895066a3ff26be7daa`.

Báo cáo JSON trước/sau và bản sao danh mục trước seed lưu cục bộ tại `/private/tmp/synapse-seed-audit-20261004/` (thư mục tạm, không phải backup lâu dài). Không lưu thông tin đăng nhập trong báo cáo.

Lưu ý: API danh mục công khai hiện chỉ trả bài có nội dung published theo code sẵn có; 67 bài trống vẫn còn trong DB.

## Kiểm tra sau triển khai

API health, danh mục thuật toán, hệ cơ quan, mô hình và cấu trúc giải phẫu đều HTTP 200. API chi tiết cả bốn bài trả nội dung published. Cả 14 link ảnh R2 có chữ ký lấy từ API tải thành công và khớp SHA-256 với ảnh local.

import { FileEarmarkTextFill } from 'react-bootstrap-icons';
import { ComingSoon } from '@/components/admin/ComingSoon';

export default function AdminDocumentsPage() {
  return (
    <ComingSoon
      title="Tài liệu"
      description="Giáo trình và tài liệu làm nguồn tri thức cho AI."
      icon={FileEarmarkTextFill}
      features={["Upload PDF, DOCX lên kho lưu trữ", "Tự động đọc, chia đoạn và tạo vector (Docling + Gemini)", "Theo dõi trạng thái xử lý: chờ, đang xử lý, hoàn tất, lỗi", "Sửa thông tin nguồn: tên sách, tác giả, năm, chuyên ngành", "Xem trước các đoạn trích để kiểm tra chất lượng"]}
    />
  );
}

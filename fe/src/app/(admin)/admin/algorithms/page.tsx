import { BoxFill } from 'react-bootstrap-icons';
import { ComingSoon } from '@/components/admin/ComingSoon';

export default function AdminAlgorithmsPage() {
  return (
    <ComingSoon
      title="Thuật toán"
      description="Nội dung giải thích cho từng thuật toán trong kho."
      icon={BoxFill}
      features={["Đồng bộ danh sách thuật toán từ packages/algo-viz", "Soạn lý thuyết, độ phức tạp, ứng dụng thực tế", "AI gợi ý nội dung từ giáo trình, admin duyệt trước khi đăng", "Ẩn/hiện thuật toán với học viên"]}
    />
  );
}

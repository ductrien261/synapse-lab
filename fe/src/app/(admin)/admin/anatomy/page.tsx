import { HeartPulseFill } from 'react-bootstrap-icons';
import { ComingSoon } from '@/components/admin/ComingSoon';

export default function AdminAnatomyPage() {
  return (
    <ComingSoon
      title="Giải phẫu"
      description="Hệ cơ quan, mô hình 3D và bộ phận."
      icon={HeartPulseFill}
      features={["Quản lý hệ cơ quan và mô hình 3D (Sketchfab)", "Gán bộ phận theo điểm chú thích trên mô hình", "Soạn định nghĩa, sinh lý, ghi chú lâm sàng", "Liên kết bộ phận với giáo trình kèm số trang"]}
    />
  );
}

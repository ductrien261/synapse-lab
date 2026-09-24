import { PeopleFill } from 'react-bootstrap-icons';
import { ComingSoon } from '@/components/admin/ComingSoon';

export default function AdminSpacesPage() {
  return (
    <ComingSoon
      title="Không gian"
      description="Theo dõi các không gian (lớp, nhóm, buổi họp) trên hệ thống."
      icon={PeopleFill}
      features={["Danh sách không gian, người tạo, số thành viên", "Xem hoạt động gần đây của từng không gian", "Khóa không gian vi phạm"]}
    />
  );
}

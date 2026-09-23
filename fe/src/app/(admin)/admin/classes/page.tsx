import { PeopleFill } from 'react-bootstrap-icons';
import { ComingSoon } from '@/components/admin/ComingSoon';

export default function AdminClassesPage() {
  return (
    <ComingSoon
      title="Lớp học"
      description="Theo dõi các lớp học trên hệ thống."
      icon={PeopleFill}
      features={["Danh sách lớp, chủ lớp, số thành viên", "Xem hoạt động gần đây của từng lớp", "Khóa lớp vi phạm"]}
    />
  );
}

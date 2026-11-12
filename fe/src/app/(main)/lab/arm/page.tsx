'use client';

import dynamic from 'next/dynamic';

// Mô hình 3D và urdf-loader chỉ chạy ở trình duyệt
const ArmLab = dynamic(() => import('@/components/lab/arm/ArmLab').then((m) => m.ArmLab), {
  ssr: false,
  loading: () => <div className="py-20 text-center text-sm text-stone-400">Đang mở phòng thí nghiệm…</div>,
});

export default function ArmLabPage() {
  return <ArmLab />;
}

'use client';

import dynamic from 'next/dynamic';

// Mô phỏng chạy theo thời gian thực và trợ lý AI cần trình duyệt
const IotLab = dynamic(() => import('@/components/lab/iot/IotLab').then((m) => m.IotLab), {
  ssr: false,
  loading: () => <div className="py-20 text-center text-sm text-stone-400">Đang mở phòng thí nghiệm…</div>,
});

export default function IotLabPage() {
  return <IotLab />;
}

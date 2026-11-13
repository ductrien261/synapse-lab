'use client';

import dynamic from 'next/dynamic';

// Mô phỏng chạy theo thời gian thực và trợ lý AI cần trình duyệt
const CarLab = dynamic(() => import('@/components/lab/car/CarLab').then((m) => m.CarLab), {
  ssr: false,
  loading: () => <div className="py-20 text-center text-sm text-stone-400">Đang mở phòng thí nghiệm…</div>,
});

export default function CarLabPage() {
  return <CarLab />;
}

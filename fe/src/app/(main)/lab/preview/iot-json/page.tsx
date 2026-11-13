'use client';

import dynamic from 'next/dynamic';
import iotWatering from '@/lib/lab/package/packages/iot-watering.json';
import type { LabPackage } from '@/lib/lab/package/types';

// Trang xem thử: bài tưới cây dựng từ JSON để so với bản viết tay ở /lab/iot
const GenericLab = dynamic(() => import('@/components/lab/generic/GenericLab').then((m) => m.GenericLab), {
  ssr: false,
  loading: () => <div className="py-20 text-center text-sm text-stone-400">Đang mở phòng thí nghiệm…</div>,
});

export default function IotJsonPreviewPage() {
  return <GenericLab pkg={iotWatering as unknown as LabPackage} />;
}

// ============================================================
// SYNAPSE-LAB — Danh mục hệ cơ quan (tạm thời, dữ liệu tĩnh)
// Khi app anatomy ở backend có dữ liệu, thay bằng API GET /anatomy/systems/.
// ============================================================

export interface AnatomySystemInfo {
  key: string;
  name: string;
  en: string;
  parts: string;
  /** class Tailwind cho chấm màu */
  dot: string;
}

export const ANATOMY_SYSTEMS: AnatomySystemInfo[] = [
  { key: 'cardiovascular', name: 'Hệ tuần hoàn', en: 'Cardiovascular', parts: 'Tim, động mạch, tĩnh mạch', dot: 'bg-rose-500' },
  { key: 'nervous', name: 'Hệ thần kinh', en: 'Nervous', parts: 'Não, tủy sống, dây thần kinh', dot: 'bg-violet-500' },
  { key: 'respiratory', name: 'Hệ hô hấp', en: 'Respiratory', parts: 'Phổi, khí quản, phế quản', dot: 'bg-sky-500' },
  { key: 'musculoskeletal', name: 'Hệ cơ xương khớp', en: 'Musculoskeletal', parts: 'Xương, cơ, khớp, dây chằng', dot: 'bg-amber-500' },
  { key: 'digestive', name: 'Hệ tiêu hóa', en: 'Digestive', parts: 'Dạ dày, ruột, gan, tụy', dot: 'bg-emerald-500' },
  { key: 'urinary', name: 'Hệ tiết niệu', en: 'Urinary', parts: 'Thận, niệu quản, bàng quang', dot: 'bg-teal-500' },
];

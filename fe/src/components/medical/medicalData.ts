// ============================================================
// medicalData.ts - Local placeholder data for MedicalSimulationView
// TODO: Replace with API calls to Django backend when ready
// ============================================================

export interface HeartPin {
  id: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  color: string;
  description: string;
  clinicalNote?: string;
}

export interface HeartStep {
  step: number;
  title: string;
  phase: string;
  description: string;
  clinicalCorrelation?: string;
  ffr?: number;
}

export interface RelatedTopic {
  id: string;
  title: string;
  type: string;
}

// Placeholder pins - will be replaced by Sketchfab annotation API
export const HEART_PINS: HeartPin[] = [
  { id: "pin-a", label: "Tâm nhĩ trái", shortLabel: "LA", x: 42, y: 30, color: "#ef4444", description: "Nhận máu giàu oxy từ phổi qua tĩnh mạch phổi.", clinicalNote: "Giãn tâm nhĩ trái gặp trong hẹp van hai lá" },
  { id: "pin-b", label: "Tâm thất trái", shortLabel: "LV", x: 38, y: 62, color: "#dc2626", description: "Buồng tim chính bơm máu ra động mạch chủ.", clinicalNote: "Phì đại thất trái là biến chứng của THA lâu ngày" },
  { id: "pin-c", label: "Động mạch vành trái (LAD)", shortLabel: "LAD", x: 30, y: 48, color: "#f97316", description: "Nhánh xuống trước trái, nuôi dưỡng vách liên thất.", clinicalNote: "Hẹp LAD gây NMCT trước rộng - nguy hiểm nhất" },
  { id: "pin-d", label: "Van hai lá", shortLabel: "MV", x: 50, y: 48, color: "#8b5cf6", description: "Van giữa tâm nhĩ và tâm thất trái.", clinicalNote: "Sa van hai lá phổ biến nhất trong các bệnh van tim" },
];

// Placeholder steps - will be replaced by backend data
export const HEART_SIMULATION_STEPS: HeartStep[] = [
  { step: 1, phase: "Bình thường", title: "Chu kỳ tim bình thường", description: "Tim co bóp nhịp nhàng với tần số 60-100 lần/phút." },
  { step: 2, phase: "Thiếu máu cục bộ", title: "Thiếu máu cơ tim", description: "Giảm lưu lượng máu tới cơ tim do hẹp động mạch vành." },
  { step: 3, phase: "Hẹp LAD", title: "Hẹp động mạch vành LAD", description: "Hẹp nhánh LAD > 70% gây thiếu máu vùng trước.", ffr: 0.72 },
  { step: 4, phase: "Can thiệp", title: "Can thiệp mạch vành", description: "Đặt stent tái thông mạch máu.", ffr: 0.91 },
];

export const RELATED_PRACTICE_TOPICS: RelatedTopic[] = [
  { id: "rt-1", title: "Điện tâm đồ (ECG) cơ bản", type: "CS" },
  { id: "rt-2", title: "Thuật toán Dijkstra - Đường ngắn nhất", type: "CS" },
];
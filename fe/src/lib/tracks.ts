// ============================================================
// SYNAPSE-LAB — Cấu hình theo chuyên ngành (CNTT / Y khoa)
// Mỗi người dùng chỉ thuộc 1 chuyên ngành; dashboard, tìm kiếm,
// thứ tự menu đều dựa vào cấu hình ở đây.
// ============================================================

export type Track = 'cs' | 'med';

export interface TrackConfig {
  key: Track;
  label: string;
  audience: string;
  moduleLabel: string;
  moduleHref: string;
  tagline: string;
  searchPlaceholder: string;
  quickTags: string[];
}

export const TRACKS: Record<Track, TrackConfig> = {
  cs: {
    key: 'cs',
    label: 'Khoa học máy tính',
    audience: 'Sinh viên CNTT',
    moduleLabel: 'Thuật toán',
    moduleHref: '/algorithms',
    tagline: 'Quan sát từng bước thuật toán chạy, đọc mã nguồn và hỏi AI ngay khi chưa hiểu.',
    searchPlaceholder: 'Tìm thuật toán, ví dụ: Dijkstra, Knapsack, N-Queens...',
    quickTags: ['Dijkstra', 'Knapsack', 'N-Queens', 'Binary Search', 'Quy hoạch động'],
  },
  med: {
    key: 'med',
    label: 'Y khoa',
    audience: 'Sinh viên Y khoa',
    moduleLabel: 'Giải phẫu 3D',
    moduleHref: '/anatomy',
    tagline: 'Xoay, bóc tách mô hình 3D và tra cứu kiến thức gắn trực tiếp với giáo trình.',
    searchPlaceholder: 'Tìm mô hình hoặc bộ phận, ví dụ: heart, aorta, tâm thất...',
    // SV Y: thẻ tìm nhanh lấy từ danh sách hệ cơ quan có mô hình (xem WelcomeHero)
    quickTags: [],
  },
};

export function searchHref(track: Track, query: string): string {
  const q = query.trim();
  const base = TRACKS[track].moduleHref;
  return q ? `${base}?q=${encodeURIComponent(q)}` : base;
}

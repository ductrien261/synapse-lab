// Tên tiếng Việt cho các nhóm thuật toán (key lấy từ algo-server)
export const ALGO_CATEGORY_VI: Record<string, string> = {
  backtracking: 'Quay lui',
  'branch-and-bound': 'Nhánh cận',
  'brute-force': 'Vét cạn',
  'divide-and-conquer': 'Chia để trị',
  'dynamic-programming': 'Quy hoạch động',
  greedy: 'Tham lam',
  'simple-recursive': 'Đệ quy',
  uncategorized: 'Khác',
};

export function categoryLabelVi(key: string, fallback: string): string {
  return ALGO_CATEGORY_VI[key] ?? fallback;
}

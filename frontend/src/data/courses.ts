export interface Course {
  id: string;
  code: string;
  credits: number;
  level: string;
  category: "cs" | "med";
  categoryLabel: string;
  complexity?: string; // e.g. O(V + E log V) for CS or 3D Atlas for Med
  badgeText: string;
  title: string;
  description: string;
  tags: string[];
  progress: number;
  totalTopics: number;
  completedTopics: number;
  unitLabel: string; // "chuyên đề" hoặc "bóc tách"
  statusBadge: string;
  actionText: string;
  actionType: "primary" | "secondary" | "outlined";
  thumbnailType: "graph" | "heart" | "sorting" | "brain" | "dp" | "skeleton";
}

export const COURSES_DATA: Course[] = [
  {
    id: "cs-504",
    code: "CS-504",
    credits: 4,
    level: "Trung cấp",
    category: "cs",
    categoryLabel: "Khoa Học Máy Tính",
    complexity: "Greedy Strategy",
    badgeText: "10 Dạng bài tham lam",
    title: "Thuật Toán Tham Lam (Greedy Algorithms) & Bản Đồ Ứng Dụng",
    description: "Khám phá chiến lược lựa chọn tối ưu cục bộ: Activity Selection, Balo phân số, Cây Huffman, Kruskal, Prim, Dijkstra và bài toán đổi tiền.",
    tags: ["Activity Selection", "Fractional Knapsack", "Huffman Tree", "Kruskal & Prim", "Dijkstra"],
    progress: 60,
    completedTopics: 6,
    totalTopics: 10,
    unitLabel: "dạng bài",
    statusBadge: "10 Chuyên đề chuẩn hóa",
    actionText: "Tìm hiểu tiếp",
    actionType: "primary",
    thumbnailType: "graph",
  },
  {
    id: "med-201",
    code: "MED-201",
    credits: 5,
    level: "Năm 2 Y Khoa",
    category: "med",
    categoryLabel: "Y Khoa & Giải Phẫu",
    complexity: "Cardiovascular-3D",
    badgeText: "8 Mô hình bóc tách",
    title: "Giải Phẫu Học 3D: Hệ Tuần Hoàn & Cấu Trúc Tim Toàn Diện",
    description: "Bóc tách từng lớp mô học tim mạch 360 độ: tâm nhĩ, tâm thất, hệ thống động tĩnh mạch và vòng tuần hoàn kép.",
    tags: ["Tâm nhĩ & Thất", "Động mạch chủ", "Chu kỳ co bóp", "Bóc tách đa lớp"],
    progress: 67,
    completedTopics: 4,
    totalTopics: 6,
    unitLabel: "bóc tách",
    statusBadge: "Chuẩn hóa mô bản 3D",
    actionText: "Tìm hiểu tiếp",
    actionType: "primary",
    thumbnailType: "heart",
  },
  {
    id: "cs-102",
    code: "CS-102",
    credits: 3,
    level: "Cơ sở",
    category: "cs",
    categoryLabel: "Khoa Học Máy Tính",
    complexity: "O(n log n)",
    badgeText: "8 Mô hình step-by-step",
    title: "Thuật Toán Sắp Xếp & Tìm Kiếm Trực Quan 3D/2D",
    description: "Nắm vững cơ chế phân hoạch QuickSort, hợp nhất MergeSort, HeapSort và thuật toán tìm kiếm nhị phân không gian.",
    tags: ["QuickSort Pivot", "MergeSort Split", "Binary Search", "Heapify Process"],
    progress: 100,
    completedTopics: 8,
    totalTopics: 8,
    unitLabel: "chuyên đề",
    statusBadge: "Đã hoàn thành 100%",
    actionText: "Tìm hiểu lại",
    actionType: "outlined",
    thumbnailType: "sorting",
  },
  {
    id: "med-303",
    code: "MED-303",
    credits: 4,
    level: "Chuyên sâu",
    category: "med",
    categoryLabel: "Y Khoa & Giải Phẫu",
    complexity: "3D Brain Atlas",
    badgeText: "Atlas thần kinh VR",
    title: "Thần Kinh Học Trực Quan: Cấu Trúc Não Bộ & Dẫn Truyền Synapse",
    description: "Atlas giải phẫu các thùy não, nhân xám trung ương, cơ chế dẫn truyền điện thế hoạt động qua khe synapse hóa học.",
    tags: ["Vỏ não & Các thùy", "Synapse hóa học", "Điện thế hoạt động", "Dây TK sọ"],
    progress: 20,
    completedTopics: 2,
    totalTopics: 10,
    unitLabel: "chuyên đề",
    statusBadge: "Hỗ trợ VR/XR Mode",
    actionText: "Tìm hiểu ngay",
    actionType: "primary",
    thumbnailType: "brain",
  },
  {
    id: "cs-412",
    code: "CS-412",
    credits: 4,
    level: "Nâng cao",
    category: "cs",
    categoryLabel: "Khoa Học Máy Tính",
    complexity: "Memoization & DP Table",
    badgeText: "AI Co-pilot tích hợp",
    title: "Quy Hoạch Động (Dynamic Programming) & Bài Toán Tối Ưu Hóa",
    description: "Bản đồ tư duy bài toán con gối nhau (Overlapping Subproblems), cấu trúc con tối ưu và visualize bảng ma trận DP.",
    tags: ["Knapsack 0/1", "LCS & LIS Matrix", "Tree DP", "Bitmask DP"],
    progress: 35,
    completedTopics: 5,
    totalTopics: 14,
    unitLabel: "chuyên đề",
    statusBadge: "Hỗ trợ C++ / Python / TS",
    actionText: "Tìm hiểu ngay",
    actionType: "primary",
    thumbnailType: "dp",
  },
  {
    id: "med-105",
    code: "MED-105",
    credits: 3,
    level: "Cơ sở năm 1",
    category: "med",
    categoryLabel: "Y Khoa & Giải Phẫu",
    complexity: "Biomechanics-3D",
    badgeText: "Mô phỏng động lực học",
    title: "Giải Phẫu Hệ Cơ Xương Khớp & Vận Động Học Sinh Học",
    description: "Khám phá 206 xương người cùng hệ cơ vận động, khớp bản lề, dây chằng chéo ACL và phân tích vector lực sinh học.",
    tags: ["Khớp xoay & Bản lề", "Dây chằng ACL", "Vector lực cơ", "Góc nâng khớp"],
    progress: 50,
    completedTopics: 4,
    totalTopics: 8,
    unitLabel: "bài giảng",
    statusBadge: "Kèm bài tập cơ sinh",
    actionText: "Tìm hiểu tiếp",
    actionType: "primary",
    thumbnailType: "skeleton",
  },
];

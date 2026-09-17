export interface GreedyLesson {
  id: string;
  lessonNumber: string; // "Bài 01", "Bài 02", ...
  numericIndex: number;
  title: string;
  subtitle: string;
  description: string;
  subBranches?: string[];
  tag: string;
  timeComplexity: string;
  spaceComplexity: string;
  canvasType: string;
  status: "completed" | "in-progress" | "not-started";
  progress?: number;
  badge?: string;
  actionText: string;
}

export const GREEDY_LESSONS_DATA: GreedyLesson[] = [
  {
    id: "lesson-01",
    lessonNumber: "Bài 01",
    numericIndex: 1,
    title: "Activity Selection",
    subtitle: "Chọn nhiều hoạt động nhất không bị trùng thời gian",
    description:
      "Sắp xếp các hoạt động theo thời điểm kết thúc tăng dần. Luôn ưu tiên chọn hoạt động kết thúc sớm nhất để chừa tối đa khoảng trống cho các hoạt động tiếp theo.",
    tag: "Earliest Finish Time",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(1)",
    canvasType: "2D Timeline Interval",
    status: "completed",
    progress: 100,
    badge: "Đã nắm vững",
    actionText: "Ôn tập mô hình ↻",
  },
  {
    id: "lesson-02",
    lessonNumber: "Bài 02",
    numericIndex: 2,
    title: "Fractional Knapsack",
    subtitle: "Balo phân số – chọn theo giá trị / trọng lượng",
    description:
      "Tính tỷ lệ đơn giá (v/w) cho từng vật phẩm rồi sắp xếp giảm dần. Cho phép cắt nhỏ phần dư của món đồ tiếp theo để lấp đầy balo với tổng giá trị cực đại.",
    tag: "Value / Weight Ratio",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(1)",
    canvasType: "Fractional Gauge Canvas",
    status: "completed",
    progress: 100,
    badge: "Đã vượt qua Quiz",
    actionText: "Ôn tập mô hình ↻",
  },
  {
    id: "lesson-03",
    lessonNumber: "Bài 03",
    numericIndex: 3,
    title: "Job Sequencing with Deadlines",
    subtitle: "Xếp công việc có deadline và lợi nhuận",
    description:
      "Sắp xếp việc theo lợi nhuận giảm dần. Với mỗi việc, gán vào khung giờ trống muộn nhất trước deadline của nó để dành khung giờ sớm cho việc có hạn chót gấp hơn.",
    tag: "Profit Maximization",
    timeComplexity: "O(N² hoặc N log N với DSU)",
    spaceComplexity: "O(N)",
    canvasType: "Timeline Slot Visualizer",
    status: "completed",
    progress: 95,
    badge: "Hoàn thành 95%",
    actionText: "Ôn tập mô hình ↻",
  },
  {
    id: "lesson-04",
    lessonNumber: "Bài 04",
    numericIndex: 4,
    title: "Huffman Coding",
    subtitle: "Xây cây Huffman để nén dữ liệu",
    description:
      "Nén dữ liệu không tổn hao bằng cách liên tục ghép 2 nút có tần suất xuất hiện nhỏ nhất trong Min-Heap. Ký tự xuất hiện thường xuyên hơn sẽ có mã bit ngắn hơn.",
    tag: "Prefix Tree Compression",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    canvasType: "3D Huffman Binary Tree",
    status: "in-progress",
    progress: 65,
    badge: "Đang học dở (65%)",
    actionText: "Vào mô phỏng 3D →",
  },
  {
    id: "lesson-05",
    lessonNumber: "Bài 05",
    numericIndex: 5,
    title: "Minimum Spanning Tree (MST)",
    subtitle: "Cây khung nhỏ nhất kết nối toàn bộ đỉnh đồ thị",
    description:
      "Tìm tập cạnh kết nối toàn bộ đỉnh với tổng trọng số nhỏ nhất mà không tạo chu trình. So sánh 2 chiến lược: duyệt cạnh toàn cục vs mở rộng đỉnh từ lát cắt.",
    subBranches: [
      "Kruskal (Sắp xếp cạnh + Disjoint Set)",
      "Prim (Mở rộng đỉnh + Min-Heap)",
    ],
    tag: "MST Greedy",
    timeComplexity: "O(E log E) / O((V+E) log V)",
    spaceComplexity: "O(V)",
    canvasType: "3D Graph Mesh MST",
    status: "completed",
    progress: 100,
    badge: "Mastered",
    actionText: "Ôn tập mô hình ↻",
  },
  {
    id: "lesson-06",
    lessonNumber: "Bài 06",
    numericIndex: 6,
    title: "Shortest Path",
    subtitle: "Dijkstra: Đường đi ngắn nhất đồ thị trọng số không âm",
    description:
      "Cơ chế giãn nở đỉnh (Relaxation) kết hợp Min-Heap. Luôn chốt khoảng cách cho đỉnh gần nhất và cập nhật khoảng cách đến các đỉnh lân cận. Thất bại nếu có cạnh âm.",
    tag: "Dijkstra Relaxation",
    timeComplexity: "O((V + E) log V)",
    spaceComplexity: "O(V)",
    canvasType: "3D Dijkstra Canvas",
    status: "completed",
    progress: 98,
    badge: "Đạt 98% Benchmark",
    actionText: "Ôn tập mô hình ↻",
  },
  {
    id: "lesson-07",
    lessonNumber: "Bài 07",
    numericIndex: 7,
    title: "Scheduling",
    subtitle: "Các bài toán lập lịch & phân bổ tài nguyên tối ưu",
    description:
      "Khám phá 3 bài toán lập lịch kinh điển: xếp phòng họp hạn chế trùng lặp, xếp thứ tự xử lý giảm thời gian chờ trung bình (SPT), và giảm thiểu độ trễ tối đa (EDF).",
    subBranches: [
      "Interval Scheduling (Phòng họp tối thiểu)",
      "Job Scheduling (Quy tắc SPT)",
      "Deadline Scheduling (Quy tắc EDF)",
    ],
    tag: "Task Scheduling",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(N)",
    canvasType: "Gantt Resource Flow",
    status: "in-progress",
    progress: 50,
    badge: "Thực hành 50%",
    actionText: "Tiếp tục học dở →",
  },
  {
    id: "lesson-08",
    lessonNumber: "Bài 08",
    numericIndex: 8,
    title: "Coin Change",
    subtitle: "Chọn đồng tiền lớn trước – Ranh giới Greedy & DP",
    description:
      "Luôn chọn đồng tiền có mệnh giá lớn nhất có thể. Giải thuật cho kết quả tối ưu trên hệ tiền Canonical (VND, USD), nhưng có thể cho kết quả sai trên hệ tiền tùy ý (phải dùng Quy hoạch động).",
    tag: "Canonical Systems",
    timeComplexity: "O(Số mệnh giá)",
    spaceComplexity: "O(1)",
    canvasType: "Coin Cashier Simulation",
    status: "not-started",
    badge: "Bẫy tư duy phỏng vấn",
    actionText: "Bắt đầu bài học →",
  },
  {
    id: "lesson-09",
    lessonNumber: "Bài 09",
    numericIndex: 9,
    title: "Minimum / Maximum Problems",
    subtitle: "Các bài toán tối ưu cực trị tài nguyên thường gặp",
    description:
      "Sử dụng kỹ thuật sắp xếp kết hợp 2 con trỏ (Two Pointers) để giải quyết bài toán số sân ga tối thiểu đón tàu đồng thời và số mũi tên tối thiểu để bắn nổ bóng bay.",
    subBranches: [
      "Minimum number of coins (Số xu tối thiểu)",
      "Minimum platforms (Sân ga tàu hỏa)",
      "Minimum arrows (Bắn bóng bay)",
    ],
    tag: "Extremum Greedy",
    timeComplexity: "O(N log N)",
    spaceComplexity: "O(1)",
    canvasType: "Railway & Vector Canvas",
    status: "not-started",
    badge: "LeetCode Hot",
    actionText: "Bắt đầu bài học →",
  },
  {
    id: "lesson-10",
    lessonNumber: "Bài 10",
    numericIndex: 10,
    title: "Graph Greedy",
    subtitle: "Tổng kết các thuật toán tham lam trên đồ thị",
    description:
      "So sánh bản chất tham lam của Kruskal, Prim và Dijkstra. Hiểu rõ cấu trúc Matroid và điều kiện khi nào chiến lược tham lam đảm bảo tìm được tối ưu toàn cục trên đồ thị.",
    subBranches: [
      "Kruskal (Edge-based MST)",
      "Prim (Vertex-based MST)",
      "Dijkstra (Shortest Path SPT)",
    ],
    tag: "Graph Theory",
    timeComplexity: "O((V + E) log V)",
    spaceComplexity: "O(V + E)",
    canvasType: "3D Multi-Graph Visualizer",
    status: "not-started",
    badge: "Chuyên đề tổng kết",
    actionText: "Bắt đầu bài học →",
  },
];

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

export interface HeapItem {
  node: string;
  dist: number | "∞";
  isNew?: boolean;
}

export interface SimulationStep {
  stepIndex: number; // 1-based
  activeNode: string;
  minDist: number | string;
  relaxingEdge?: { from: string; to: string; weight: number };
  visitedNodes: string[];
  activePathEdges: { from: string; to: string }[];
  heapItems: HeapItem[];
  distances: Record<string, number | "∞">;
  statusText: string;
  shortSummary: string; // Lời giải thích siêu ngắn gọn 1 câu
  actionExplanation: string; // Chi tiết hành động đơn giản
  aiAnalysis: {
    title: string;
    greeting: string;
    highlightTitle?: string;
    highlightContent?: string;
    quickQuestions: { q: string; a: string }[];
  };
  activeCodeLineCpp: number;
  activeCodeLinePy: number;
}

export interface AlgorithmSimulationData {
  id: string;
  sessionCode: string;
  badge: string;
  title: string;
  sourceNode: string;
  targetNode: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  steps: SimulationStep[];
  theory: {
    paradigm: string;
    title: string;
    description: string;
    timeComplexity: string;
    spaceComplexity: string;
  };
  realWorldApp: {
    badge: string;
    title: string;
    description: string;
    useCases: string[];
    linkText: string;
  };
  codeCpp: string[];
  codePy: string[];
}

export const DIJKSTRA_SIMULATION_DATA: AlgorithmSimulationData = {
  id: "dijkstra-demo",
  sessionCode: "SESSION #DK-8821",
  badge: "GRAPH SIMULATION",
  title: "Mô phỏng Thuật toán Dijkstra: Đường đi ngắn nhất Node A → Node F",
  sourceNode: "A",
  targetNode: "F",
  nodes: [
    { id: "A", x: 120, y: 250, label: "A" },
    { id: "B", x: 250, y: 160, label: "B" },
    { id: "C", x: 260, y: 340, label: "C" },
    { id: "D", x: 420, y: 170, label: "D" },
    { id: "E", x: 440, y: 340, label: "E" },
    { id: "F", x: 570, y: 250, label: "F" },
  ],
  edges: [
    { from: "A", to: "B", weight: 2 },
    { from: "A", to: "C", weight: 4 },
    { from: "B", to: "C", weight: 1 },
    { from: "B", to: "D", weight: 7 },
    { from: "C", to: "D", weight: 1 },
    { from: "C", to: "E", weight: 5 },
    { from: "D", to: "F", weight: 2 },
    { from: "E", to: "F", weight: 4 },
  ],
  steps: [
    {
      stepIndex: 1,
      activeNode: "A",
      minDist: 0,
      visitedNodes: [],
      activePathEdges: [],
      heapItems: [{ node: "A", dist: 0 }],
      distances: { A: 0, B: "∞", C: "∞", D: "∞", E: "∞", F: "∞" },
      statusText: "Khởi tạo khoảng cách nguồn dist[A] = 0, đẩy Node A vào Min-Heap",
      shortSummary: "Khởi tạo nguồn: dist[A] = 0, các đỉnh khác bằng ∞.",
      actionExplanation: "Bắt đầu tại đỉnh xuất phát A. Đẩy (A, 0) vào hàng đợi Min-Heap.",
      aiAnalysis: {
        title: "PHÂN TÍCH BƯỚC 1: KHỞI TẠO NGUỒN",
        greeting: "Chào bạn! Thuật toán bắt đầu bằng cách gán khoảng cách từ đỉnh nguồn A đến chính nó là dist[A] = 0 và tất cả các đỉnh khác là vô cùng (∞).",
        highlightTitle: "Khởi tạo Min-Heap:",
        highlightContent: "Đẩy (A, 0) vào Min-Heap. Hàng đợi ưu tiên sẽ luôn giữ đỉnh có khoảng cách nhỏ nhất ở đầu hàng để lấy ra trong O(log V).",
        quickQuestions: [
          { q: "Tại sao ban đầu phải gán các đỉnh khác là vô cùng (∞)?", a: "Vì ta chưa khám phá bất kỳ đường đi nào đến các đỉnh đó. Vô cùng thể hiện khoảng cách chưa với tới." },
          { q: "Dijkstra có chạy được với đồ thị có hướng không?", a: "Hoàn toàn chạy tốt! Chỉ cần đồ thị không có cạnh mang trọng số âm." },
        ],
      },
      activeCodeLineCpp: 6,
      activeCodeLinePy: 4,
    },
    {
      stepIndex: 2,
      activeNode: "A",
      minDist: 0,
      visitedNodes: ["A"],
      relaxingEdge: { from: "A", to: "B", weight: 2 },
      activePathEdges: [{ from: "A", to: "B" }],
      heapItems: [
        { node: "B", dist: 2, isNew: true },
        { node: "C", dist: 4, isNew: true },
      ],
      distances: { A: 0, B: 2, C: 4, D: "∞", E: "∞", F: "∞" },
      statusText: "Lấy Node A ra khỏi Heap. Relax các đỉnh kề B và C",
      shortSummary: "Từ A đi tới B (tốn 2) và C (tốn 4).",
      actionExplanation: "Lấy A ra chốt kết quả. Cập nhật khoảng cách B=2, C=4 và đưa vào hàng đợi.",
      aiAnalysis: {
        title: "PHÂN TÍCH BƯỚC 2: DUYỆT ĐỈNH NGUỒN A",
        greeting: "Lấy đỉnh A (dist = 0) ra khỏi Heap và chốt kết quả. Từ A xét 2 đỉnh kề là B và C.",
        highlightTitle: "Cập nhật khoảng cách (Relaxation):",
        highlightContent: "• Cạnh A → B: dist[A] + 2 = 2 < ∞ → cập nhật dist[B] = 2.\n• Cạnh A → C: dist[A] + 4 = 4 < ∞ → cập nhật dist[C] = 4.\nCả 2 đỉnh được thêm vào Min-Heap.",
        quickQuestions: [
          { q: "Khoảng cách của đỉnh A có bao giờ bị thay đổi lại không?", a: "Không bao giờ! Khi đỉnh A được lấy ra khỏi Min-Heap, khoảng cách của nó đã tối ưu tuyệt đối (Visited)." },
          { q: "Đỉnh nào sẽ được lấy ra tiếp theo?", a: "Đỉnh B (dist = 2) vì 2 < 4." },
        ],
      },
      activeCodeLineCpp: 11,
      activeCodeLinePy: 9,
    },
    {
      stepIndex: 3,
      activeNode: "B",
      minDist: 2,
      visitedNodes: ["A", "B"],
      relaxingEdge: { from: "B", to: "C", weight: 1 },
      activePathEdges: [{ from: "A", to: "B" }, { from: "B", to: "C" }],
      heapItems: [
        { node: "C", dist: 3, isNew: true },
        { node: "D", dist: 9, isNew: true },
      ],
      distances: { A: 0, B: 2, C: 3, D: 9, E: "∞", F: "∞" },
      statusText: "Lấy Node B ra khỏi Heap. Relax cạnh B → C (3 < 4) và B → D (9)",
      shortSummary: "Chọn B vì gần nhất (d=2). Đi tiếp tới C mất 2+1=3 < 4!",
      actionExplanation: "Đi đường vòng A → B → C (tốn 3) ngắn hơn đi thẳng A → C (tốn 4). Cập nhật C=3, D=9.",
      aiAnalysis: {
        title: "PHÂN TÍCH BƯỚC 3: RELAX TỪ NODE B",
        greeting: "Chọn Node B ra khỏi Heap vì dist[B] = 2 nhỏ nhất. Xét các đỉnh kề chưa chốt của B:",
        highlightTitle: "Tối ưu hóa đường đi đến C:",
        highlightContent: "Từ A đi thẳng đến C mất 4, nhưng đi vòng A → B → C chỉ mất 2 + 1 = 3! Vì 3 < 4, ta cập nhật dist[C] = 3. Cạnh B → D cho dist[D] = 2 + 7 = 9.",
        quickQuestions: [
          { q: "Hiện tượng dist[C] giảm từ 4 xuống 3 gọi là gì?", a: "Đó chính là kỹ thuật Giãn nở đỉnh (Edge Relaxation) cốt lõi của thuật toán Dijkstra." },
          { q: "Tại sao không lấy D ra trước C?", a: "Vì khoảng cách tạm thời của C là 3, nhỏ hơn D là 9." },
        ],
      },
      activeCodeLineCpp: 14,
      activeCodeLinePy: 12,
    },
    {
      stepIndex: 4,
      activeNode: "C",
      minDist: 3,
      visitedNodes: ["A", "B", "C"],
      relaxingEdge: { from: "C", to: "D", weight: 1 },
      activePathEdges: [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "D" }],
      heapItems: [
        { node: "D", dist: 4, isNew: true },
        { node: "E", dist: 8, isNew: true },
      ],
      distances: { A: 0, B: 2, C: 3, D: 4, E: 8, F: "∞" },
      statusText: "Lấy Node C (d:3). Relax cạnh C → D (4 < 9) và C → E (3 + 5 = 8)",
      shortSummary: "Chọn C (d=3). Đi tiếp tới D mất 3+1=4 < 9!",
      actionExplanation: "Đi vòng qua C tới D chỉ mất 4 (rút ngắn so với 9 từ B). Cập nhật D=4 và E=8.",
      aiAnalysis: {
        title: "PHÂN TÍCH BƯỚC 4: RELAX LÁNG GIỀNG NODE C",
        greeting: "Chào Minh! Tại bước này, thuật toán chọn Node C ra khỏi Min-Heap vì khoảng cách tích lũy nhỏ nhất hiện thời ( dist[C] = 3 ).",
        highlightTitle: "💡 Hiện tượng Relaxing cạnh C → D:",
        highlightContent: "Khoảng cách mới: dist[C] + weight(C, D) = 3 + 1 = 4. Vì 4 < 9 (giá trị cũ từ B), ta cập nhật dist[D] = 4 và thêm D vào Heap! Đồng thời dist[E] = 3 + 5 = 8.",
        quickQuestions: [
          { q: "Tại sao không duyệt tiếp Node E ngay bây giờ?", a: "Vì trong Min-Heap, Node D có dist = 4 nhỏ hơn Node E có dist = 8. Dijkstra luôn tham lam ưu tiên đỉnh có khoảng cách nhỏ nhất!" },
          { q: "Nếu đồ thị có trọng số âm, Dijkstra sẽ ra sao?", a: "Dijkstra sẽ thất bại vì khi đã chốt Visited, nó không bao giờ xem xét lại. Trường hợp đó bắt buộc phải dùng Bellman-Ford!" },
        ],
      },
      activeCodeLineCpp: 15,
      activeCodeLinePy: 13,
    },
    {
      stepIndex: 5,
      activeNode: "D",
      minDist: 4,
      visitedNodes: ["A", "B", "C", "D"],
      relaxingEdge: { from: "D", to: "F", weight: 2 },
      activePathEdges: [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "D" }, { from: "D", to: "F" }],
      heapItems: [
        { node: "F", dist: 6, isNew: true },
        { node: "E", dist: 8 },
      ],
      distances: { A: 0, B: 2, C: 3, D: 4, E: 8, F: 6 },
      statusText: "Lấy Node D (d:4). Relax cạnh D → F: dist[F] = 4 + 2 = 6",
      shortSummary: "Chọn D (d=4). Đi tiếp tới đích F mất 4+2=6.",
      actionExplanation: "Từ D đi tới đích đến F tốn thêm 2. Cập nhật khoảng cách tới F=6.",
      aiAnalysis: {
        title: "PHÂN TÍCH BƯỚC 5: MỞ RỘNG TỚI ĐÍCH F",
        greeting: "Lấy Node D (dist = 4) ra khỏi Min-Heap. Từ D có cạnh nối trực tiếp đến đích đến F với trọng số 2.",
        highlightTitle: "Tìm thấy đường đi đầu tiên tới F:",
        highlightContent: "Cập nhật khoảng cách: dist[F] = dist[D] + 2 = 4 + 2 = 6 < ∞. Đẩy (F, 6) vào Min-Heap!",
        quickQuestions: [
          { q: "Ta đã có thể dừng thuật toán và kết luận dist[F] = 6 ngay chưa?", a: "Chưa thể dừng! Phải đợi cho tới khi đỉnh F được lấy ra từ đỉnh của Min-Heap thì mới chắc chắn 100% không còn đường nào ngắn hơn." },
          { q: "Node nào sẽ được lấy ra tiếp theo?", a: "Đỉnh F (dist = 6) vì 6 < 8 (của E)!" },
        ],
      },
      activeCodeLineCpp: 14,
      activeCodeLinePy: 12,
    },
    {
      stepIndex: 6,
      activeNode: "F",
      minDist: 6,
      visitedNodes: ["A", "B", "C", "D", "F"],
      activePathEdges: [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "D" }, { from: "D", to: "F" }],
      heapItems: [{ node: "E", dist: 8 }],
      distances: { A: 0, B: 2, C: 3, D: 4, E: 8, F: 6 },
      statusText: "Lấy đích đến Node F (d:6) ra khỏi Heap! ĐÃ TÌM THẤY ĐƯỜNG ĐI NGẮN NHẤT",
      shortSummary: "Chốt đích đến F (d=6). Đã tìm ra đường đi ngắn nhất!",
      actionExplanation: "Lộ trình tối ưu: A → B → C → D → F với tổng chi phí ngắn nhất bằng 6.",
      aiAnalysis: {
        title: "PHÂN TÍCH BƯỚC 6: CHỐT ĐÍCH ĐẾN F",
        greeting: "Đỉnh F (dist = 6) được trích xuất ra khỏi Min-Heap. Vì F là đích đến cần tìm, ta chính thức chốt kết quả tối ưu!",
        highlightTitle: "🎉 Đạt đường đi ngắn nhất tối ưu:",
        highlightContent: "Lộ trình tối ưu: A → B → C → D → F với tổng chi phí = 2 + 1 + 1 + 2 = 6. Không có đường đi nào khác từ A đến F có tổng trọng số nhỏ hơn 6.",
        quickQuestions: [
          { q: "Còn đỉnh E trong Heap thì sao?", a: "Vì mục tiêu chỉ tìm từ A đến F, ta có thể dừng sớm (Early Exit). Nếu muốn tìm đường đi tới tất cả các đỉnh thì tiếp tục duyệt nốt E." },
          { q: "Làm sao truy vết được danh sách các đỉnh trên đường đi?", a: "Sử dụng mảng parent[] lưu đỉnh cha trước đó mỗi khi thực hiện relaxation thành công!" },
        ],
      },
      activeCodeLineCpp: 19,
      activeCodeLinePy: 16,
    },
  ],
  theory: {
    paradigm: "Greedy Paradigm",
    title: "LÝ THUYẾT THUẬT TOÁN",
    description:
      "Dijkstra đảm bảo tối ưu toàn cục nhờ tính chất không tồn tại trọng số âm. Tại mỗi bước, nút có dist nhỏ nhất luôn chốt kết quả tối ưu vĩnh viễn (Visited state).",
    timeComplexity: "O((V + E) log V)",
    spaceComplexity: "O(V)",
  },
  realWorldApp: {
    badge: "Thực Tế & Công Nghệ",
    title: "ỨNG DỤNG THỰC TẾ CỦA THUẬT TOÁN",
    description:
      "Mô hình đồ thị Dijkstra là nền tảng cốt lõi của công nghệ định tuyến mạng Internet và các hệ sinh thái bản đồ số toàn cầu:",
    useCases: [
      "Định tuyến gói tin OSPF (Open Shortest Path First) trong Router mạng Internet.",
      "Hệ thống dẫn đường vệ tinh GPS & Google Maps tính toán lộ trình ít tắc nghẽn nhất.",
      "Tối ưu hóa hành trình giao vận Logistics (Grab, Shopee Express, Hàng không).",
      "Mạng lưới truyền tải lưới điện thông minh (Smart Grid Power Flow).",
    ],
    linkText: "Khám phá kiến trúc OSPF Router trong mạng máy tính →",
  },
  codeCpp: [
    "#include <vector>",
    "#include <queue>",
    "using namespace std;",
    "",
    "vector<int> dijkstra(int V, vector<vector<pair<int, int>>>& adj, int src) {",
    "    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;",
    "    vector<int> dist(V, 1e9);",
    "    dist[src] = 0;",
    "    pq.push({0, src});",
    "",
    "    while (!pq.empty()) {",
    "        auto [d, u] = pq.top();",
    "        pq.pop();",
    "        if (d > dist[u]) continue;",
    "",
    "        for (auto& edge : adj[u]) {",
    "            int v = edge.first, weight = edge.second;",
    "            if (dist[u] + weight < dist[v]) {",
    "                dist[v] = dist[u] + weight; // Relaxation",
    "                pq.push({dist[v], v});",
    "            }",
    "        }",
    "    }",
    "    return dist;",
    "}",
  ],
  codePy: [
    "import heapq",
    "",
    "def dijkstra(graph, start):",
    "    dist = {node: float('inf') for node in graph}",
    "    dist[start] = 0",
    "    pq = [(0, start)]  # (distance, node)",
    "",
    "    while pq:",
    "        d, u = heapq.heappop(pq)",
    "        if d > dist[u]:",
    "            continue",
    "",
    "        for v, weight in graph[u]:",
    "            if dist[u] + weight < dist[v]:",
    "                dist[v] = dist[u] + weight  # Relaxation",
    "                heapq.heappush(pq, (dist[v], v))",
    "",
    "    return dist",
  ],
};

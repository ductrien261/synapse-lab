export interface MedicalLesson {
  id: string;
  order: number;
  code: string;
  title: string;
  duration: string;
  difficulty: "Cơ bản" | "Trung cấp" | "Chuyên sâu";
  status: "completed" | "in-progress" | "locked";
  hasSimulation: boolean;
  score?: number;
  coreConcepts: string[];
  clinicalSignificance: string;
  keyFormula?: string;
  summary: string;
}

export const MED_LESSONS_DATA: MedicalLesson[] = [
  {
    id: "med-lesson-01",
    order: 1,
    code: "BÀI 01",
    title: "Đại Cương Giải Phẫu & Sinh Lý Hệ Tuần Hoàn Kép",
    duration: "25 phút",
    difficulty: "Cơ bản",
    status: "completed",
    hasSimulation: false,
    score: 98,
    coreConcepts: ["Vòng tuần hoàn lớn (Hệ thống)", "Vòng tuần hoàn nhỏ (Phổi)", "Cung lượng tim (CO = SV x HR)"],
    clinicalSignificance: "Hiểu rõ sự phân phối áp lực từ thất trái qua động mạch chủ và hồi lưu tĩnh mạch chủ trên/dưới.",
    summary: "Tổng quan về giải phẫu định khu của tim trong trung thất giữa, các màng tim và sinh lý hai vòng tuần hoàn song song.",
  },
  {
    id: "med-lesson-02",
    order: 2,
    code: "BÀI 02",
    title: "Bóc Tách 3D: Cấu Trúc 4 Buồng Tim & Hệ Thống Van Tim",
    duration: "35 phút",
    difficulty: "Trung cấp",
    status: "completed",
    hasSimulation: true,
    score: 94,
    coreConcepts: ["Tâm nhĩ P/T", "Tâm thất P/T", "Van 2 lá & 3 lá", "Van tổ chim (ĐMC & ĐMP)"],
    clinicalSignificance: "Định vị dị tật hở van hai lá và hẹp van động mạch chủ trong siêu âm tim Doppler.",
    summary: "Khám phá không gian 3 chiều 4 buồng tim, cột cơ, thừng gân và chuyển động đóng mở cơ học của các lá van theo chu kỳ tim.",
  },
  {
    id: "med-lesson-03",
    order: 3,
    code: "BÀI 03",
    title: "Hệ Mạch Vành & Giả Lập Lưu Lượng Động Mạch LAD (Hẹp 70%)",
    duration: "45 phút",
    difficulty: "Chuyên sâu",
    status: "in-progress",
    hasSimulation: true,
    score: 88,
    coreConcepts: ["ĐM Vành Trái (LCA & LAD)", "ĐM Mũ (LCx)", "Hẹp LAD 70%", "FFR Index", "Định luật Poiseuille"],
    clinicalSignificance: "Tổn thương nhánh LAD ('nhánh góa phụ') chi phối 50% khối cơ thất trái; hẹp nặng đe dọa nhồi máu cơ tim diện rộng.",
    keyFormula: "R = (8 * η * L) / (π * r⁴)  →  Hẹp 70% bán kính khiến trở kháng tăng > 12 lần",
    summary: "Bóc tách cây động mạch vành 3D, định vị tổn thương hẹp LAD 70%, đo áp lực phân số FFR (0.68) và liên hệ mô hình dòng chảy cực đại.",
  },
  {
    id: "med-lesson-04",
    order: 4,
    code: "BÀI 04",
    title: "Hệ Thống Dẫn Truyền Điện Thế & Nút Xoang Nhĩ (SA / AV Node)",
    duration: "30 phút",
    difficulty: "Trung cấp",
    status: "completed",
    hasSimulation: true,
    score: 92,
    coreConcepts: ["Nút xoang (SA Node)", "Nút nhĩ thất (AV Node)", "Bó His & Mạng Purkinje", "Điện thế hoạt động pha 0-4"],
    clinicalSignificance: "Cơ chế khởi phát nhịp xoang bình thường và nguồn gốc các rối loạn nhịp như rung nhĩ hay block nhĩ thất độ III.",
    summary: "Theo dõi luồng dẫn truyền xung động điện sinh học từ nút xoang nhĩ qua thành tâm nhĩ đến mạng lưới Purkinje kích thích thất co bóp.",
  },
  {
    id: "med-lesson-05",
    order: 5,
    code: "BÀI 05",
    title: "Huyết Động Học & Định Luật Poiseuille Trong Trở Kháng Mạch Vành",
    duration: "40 phút",
    difficulty: "Chuyên sâu",
    status: "completed",
    hasSimulation: false,
    score: 90,
    coreConcepts: ["Trở kháng mạch Poiseuille (R ∝ 1/r⁴)", "Độ nhớt máu (η)", "Dòng chảy tầng vs Dòng chảy xoáy (Reynolds)"],
    clinicalSignificance: "Giải thích tại sao hẹp lòng mạch ở mức độ vừa (50%) chưa gây triệu chứng lúc nghỉ, nhưng hẹp 70% gây đau thắt ngực khi gắng sức.",
    keyFormula: "ΔP = Q × R  =  (8 * η * L * Q) / (π * r⁴)",
    summary: "Phân tích định lượng vật lý dòng chảy chất lỏng Newton trong ống trụ đàn hồi áp dụng trực tiếp vào lòng động mạch vành người bệnh.",
  },
  {
    id: "med-lesson-06",
    order: 6,
    code: "BÀI 06",
    title: "Bệnh Học Thiếu Máu Cơ Tim & Chiến Lược Tái Tưới Máu Can Thiệp PCI",
    duration: "40 phút",
    difficulty: "Chuyên sâu",
    status: "completed",
    hasSimulation: false,
    score: 96,
    coreConcepts: ["Đau thắt ngực ổn định", "Hội chứng vành cấp (ACS)", "Nong bóng & Đặt Stent phủ thuốc (DES)", "Cầu nối chủ vành (CABG)"],
    clinicalSignificance: "Quy trình ra quyết định lâm sàng dựa trên phân số dòng chảy dự trữ FFR và giải phẫu mạch vành tổn thương nhiều nhánh.",
    summary: "Từ mô phỏng giải phẫu 3D đến phác đồ điều trị thực tế: chỉ định can thiệp qua da (PCI) đặt stent giải áp nhánh LAD.",
  },
];

export interface HeartPin {
  id: string;
  name: string;
  shortTag: string;
  location: string;
  severity?: string;
  flowValue?: string;
  statusColor: string;
  x: number; // percentage in 3D viewport
  y: number;
  description: string;
  clinicalNote: string;
  hemodynamics: {
    pressure: string;
    flowVelocity: string;
    diameter: string;
    shearStress: string;
    ffr: string;
  };
}

export const HEART_PINS: HeartPin[] = [
  {
    id: "pin-a",
    name: "ĐM Vành Trái (LAD - Left Anterior Descending)",
    shortTag: "Pin A",
    location: "Rãnh liên thất trước, 1/3 trên",
    severity: "Hẹp 70% (Tổn thương nặng)",
    flowValue: "Edge Flow: 0.32",
    statusColor: "#EF4444",
    x: 48,
    y: 38,
    description: "Nhánh liên thất trước (LAD) xuất phát từ thân chung động mạch vành trái (LMCA), chạy dọc rãnh liên thất trước về phía mỏm tim. Cung cấp máu cho 45-55% khối cơ thất trái, vách liên thất trước và mỏm tim.",
    clinicalNote: "Khi hẹp 70%, diện tích lòng mạch giảm gần 91%. Áp lực sau hẹp sụt giảm nghiêm trọng dẫn đến phân số dự trữ FFR = 0.68 (< 0.80 là ngưỡng vàng chỉ định tái thông mạch máu bằng stent phủ thuốc PCI).",
    hemodynamics: {
      pressure: "52 mmHg (Trước hẹp: 98 mmHg)",
      flowVelocity: "85 cm/s (Xoáy tăng tốc tại điểm thắt)",
      diameter: "1.1 mm (Bình thường: 3.6 mm)",
      shearStress: "4.8 Pa",
      ffr: "0.68 (Hẹp có ý nghĩa huyết động)",
    },
  },
  {
    id: "pin-b",
    name: "Mỏm Tim & Thất Trái (Apex & Left Ventricle)",
    shortTag: "Pin B",
    location: "Mỏm tim (Khoang liên sườn 5 đường trung đòn trái)",
    severity: "Thiếu máu cơ tim vùng mỏm (Sink Node)",
    flowValue: "Tưới máu: 38% định mức",
    statusColor: "#F59E0B",
    x: 62,
    y: 68,
    description: "Vùng mỏm tim là đích tận cùng của dòng chảy mạch vành LAD. Trong mô hình đồ thị dòng chảy cực đại (Max-Flow), đây đóng vai trò là 'Sink Node' nhận lưu lượng tưới máu từ nguồn động mạch chủ.",
    clinicalNote: "Do LAD bị hẹp nặng, lượng máu đến mỏm tim suy giảm rõ rệt gây thiếu oxy mô cơ tim, biến đổi đoạn ST chênh xuống trên chuyển đạo V4-V6 điện tâm đồ và giảm vận động vùng mỏm trên siêu âm tim.",
    hemodynamics: {
      pressure: "44 mmHg (Áp lực tưới máu mô)",
      flowVelocity: "22 cm/s",
      diameter: "Mao mạch vi tuần hoàn",
      shearStress: "1.4 Pa",
      ffr: "0.65",
    },
  },
  {
    id: "pin-c",
    name: "Nút Xoang Nhĩ (SA Node - Sinoatrial Node)",
    shortTag: "Pin C",
    location: "Chỗ nối tĩnh mạch chủ trên và tâm nhĩ phải",
    severity: "Hoạt động sinh lý bình thường",
    flowValue: "Nhịp phát: 74 bpm",
    statusColor: "#10B981",
    x: 28,
    y: 22,
    description: "Nút xoang nhĩ là trung tâm chủ nhịp tự nhiên của tim, gồm tập hợp các tế bào tạo nhịp chuyên biệt có khả năng tự khử cực chậm trong pha 4 nhờ kênh dòng If (Funny current).",
    clinicalNote: "Được nuôi dưỡng bởi động mạch nút xoang (xuất phát từ RCA ở 60% người hoặc LCx ở 40% người). Trong trường hợp tổn thương riêng biệt LAD, nút xoang thường vẫn được bảo tồn tưới máu tốt.",
    hemodynamics: {
      pressure: "Nhĩ P: 4-6 mmHg",
      flowVelocity: "Dẫn truyền: 0.05 m/s",
      diameter: "Kích thước: 15 x 5 x 1.5 mm",
      shearStress: "Sinh lý",
      ffr: "1.00 (Bình thường)",
    },
  },
];

export interface HeartStep {
  stepIndex: number;
  title: string;
  subtitle: string;
  focusPinId: string;
  layer: "pericardium" | "myocardium" | "vessels" | "conduction";
  normalComparison: {
    diameter: string;
    resistance: string;
    flowRate: string;
    pressure: string;
  };
  stenosisComparison: {
    diameter: string;
    resistance: string;
    flowRate: string;
    pressure: string;
  };
  shortExplanation: string;
  clinicalTakeaway: string;
  codeFormula?: string;
}

export const HEART_SIMULATION_STEPS: HeartStep[] = [
  {
    stepIndex: 1,
    title: "Bước 1: Quai Động Mạch Chủ & Nguồn Cấp Máu",
    subtitle: "Máu giàu oxy được tống từ tâm thất trái lên quai ĐMC với áp lực 100 mmHg",
    focusPinId: "pin-a",
    layer: "pericardium",
    normalComparison: {
      diameter: "28 - 32 mm",
      resistance: "1x (Chuẩn)",
      flowRate: "5.0 L/phút",
      pressure: "100 / 60 mmHg",
    },
    stenosisComparison: {
      diameter: "Không đổi",
      resistance: "Bình thường",
      flowRate: "Bình thường",
      pressure: "100 mmHg",
    },
    shortExplanation: "Quai động mạch chủ là nguồn cung cấp lưu lượng chính. Hai lỗ động mạch vành nằm ngay tại xoang Valsalva để nhận máu tưới cho tim.",
    clinicalTakeaway: "Áp lực tống máu đầu vào bình thường là điều kiện tiên quyết để dòng máu chảy vào hệ mạch vành trong thì tâm trương.",
  },
  {
    stepIndex: 2,
    title: "Bước 2: Phân Nhánh Thân Chung Vành Trái & LAD",
    subtitle: "Nhánh liên thất trước (LAD) chạy dọc rãnh liên thất về phía mỏm tim",
    focusPinId: "pin-a",
    layer: "vessels",
    normalComparison: {
      diameter: "3.6 mm",
      resistance: "1x (R₀)",
      flowRate: "100% (75 ml/phút)",
      pressure: "98 mmHg",
    },
    stenosisComparison: {
      diameter: "3.6 mm (Đoạn gốc)",
      resistance: "Bình thường",
      flowRate: "100%",
      pressure: "98 mmHg",
    },
    shortExplanation: "Động mạch LAD chịu trách nhiệm cấp máu cho hơn 50% khối cơ thất trái, vách liên thất và toàn bộ vùng mỏm tim.",
    clinicalTakeaway: "Do nuôi dưỡng vùng cơ tim trọng yếu nhất, tổn thương LAD thường gây hậu quả lâm sàng nghiêm trọng nhất.",
  },
  {
    stepIndex: 3,
    title: "Bước 3: Vị Trí Tổn Thương Hẹp Nặng LAD 70%",
    subtitle: "Mảng xơ vữa làm khẩu kính lòng mạch giảm sâu từ 3.6mm xuống 1.1mm",
    focusPinId: "pin-a",
    layer: "vessels",
    normalComparison: {
      diameter: "3.6 mm",
      resistance: "1x",
      flowRate: "100%",
      pressure: "98 mmHg",
    },
    stenosisComparison: {
      diameter: "1.1 mm (Giảm 70%)",
      resistance: "Tăng 12.8 lần",
      flowRate: "Giảm còn 32%",
      pressure: "52 mmHg (Sụt giảm)",
    },
    shortExplanation: "Khi bán kính giảm còn 30% bán kính ban đầu, diện tích mặt cắt ngang của lòng mạch bị thu hẹp tới 91%.",
    clinicalTakeaway: "Dòng máu qua chỗ hẹp chuyển từ dòng chảy tầng êm ả sang dòng xoáy với vận tốc cao và lực ma sát trượt lớn.",
    codeFormula: "Tiết diện: A = π·r²  →  Giảm (1 - 0.3²) = 91% diện tích",
  },
  {
    stepIndex: 4,
    title: "Bước 4: Trở Kháng Poiseuille Tăng Vọt (R ∝ 1/r⁴)",
    subtitle: "Quy luật lũy thừa 4: Hẹp 70% làm trở kháng tăng gấp 13 lần, FFR tụt còn 0.68",
    focusPinId: "pin-a",
    layer: "vessels",
    normalComparison: {
      diameter: "r = r₀",
      resistance: "R₀ (Chuẩn)",
      flowRate: "FFR = 1.00",
      pressure: "Chênh áp ΔP nhỏ",
    },
    stenosisComparison: {
      diameter: "r = 0.3 r₀",
      resistance: "R = R₀ / (0.3)⁴ ≈ 12.8 R₀",
      flowRate: "FFR = 0.68 (< 0.80)",
      pressure: "ΔP = 46 mmHg (Sụt áp nặng)",
    },
    shortExplanation: "Định luật Poiseuille chứng minh trở kháng tỷ lệ nghịch với r⁴. Khẩu kính hẹp chút ít cũng làm trở kháng tăng gấp bội.",
    clinicalTakeaway: "Chỉ số FFR = 0.68 (< 0.80) khẳng định hẹp gây thiếu máu cơ tim huyết động nghiêm trọng, có chỉ định đặt stent nong mạch.",
    codeFormula: "R = (8·η·L) / (π·r⁴)  →  r = 0.3  ⇒  R tăng 1 / (0.3)⁴ = 12.8 lần",
  },
  {
    stepIndex: 5,
    title: "Bước 5: Thiếu Máu Cục Bộ Mỏm Tim & Thất Trái",
    subtitle: "Mỏm tim (Apex Sink) chỉ nhận được 38% lưu lượng định mức",
    focusPinId: "pin-b",
    layer: "myocardium",
    normalComparison: {
      diameter: "Mao mạch mô",
      resistance: "1x",
      flowRate: "Tưới máu 100%",
      pressure: "Oxy mô đầy đủ",
    },
    stenosisComparison: {
      diameter: "Mao mạch mô",
      resistance: "Tăng áp",
      flowRate: "Tưới máu 38%",
      pressure: "Thiếu oxy cơ tim",
    },
    shortExplanation: "Do trở kháng tại LAD tăng vọt, lưu lượng máu về mỏm tim suy kiệt, tế bào cơ tim chuyển sang hô hấp yếm khí sinh acid lactic.",
    clinicalTakeaway: "Gây ra triệu chứng kinh điển: đau thắt ngực kiểu đè nghẹt sau xương ức lan lên vai và tay trái khi gắng sức.",
  },
  {
    stepIndex: 6,
    title: "Bước 6: Khảo Sát Nút Xoang Nhĩ (SA Node) & Nhịp Tim",
    subtitle: "Nút xoang vẫn bảo tồn tưới máu tốt, tự phát xung nhịp sinh lý 74 bpm",
    focusPinId: "pin-c",
    layer: "conduction",
    normalComparison: {
      diameter: "ĐM Nút xoang",
      resistance: "Sinh lý",
      flowRate: "100%",
      pressure: "Xung: 60 - 100 bpm",
    },
    stenosisComparison: {
      diameter: "Bảo tồn",
      resistance: "Sinh lý",
      flowRate: "Bảo tồn",
      pressure: "Xung: 74 bpm (Nhịp xoang)",
    },
    shortExplanation: "Nút xoang nhĩ nhận máu từ nhánh riêng (thuộc ĐM vành phải RCA ở 60% người), do đó không bị tổn thương bởi hẹp nhánh LAD.",
    clinicalTakeaway: "Bệnh nhân có nhịp xoang đều, không bị rối loạn tạo nhịp tại nhĩ nhưng nguy cơ rối loạn nhịp thất do vùng cơ mỏm tim thiếu máu.",
  },
];

export const RELATED_PRACTICE_TOPICS = [
  {
    id: "cardio-01",
    category: "Cấp Cứu Tim Mạch",
    badge: "Chuyên sâu",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    meta: "Stanford A/B",
    title: "Chẩn Đoán Bóc Tách Động Mạch Chủ 3D",
    desc: "Phân định lòng thật - lòng giả (True vs False lumen) và định vị nếp rách nội mạc trên hình ảnh CT/MRI 3 chiều.",
    actionText: "Khám phá bóc tách ĐMC 3D →",
    type: "med",
  },
  {
    id: "cardio-02",
    category: "Can Thiệp Mạch Vành",
    badge: "Thực hành lâm sàng",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    meta: "PCI & DES",
    title: "Can Thiệp Đặt Stent Mạch Vành LAD",
    desc: "Mô phỏng quy trình luồn catheter, nong bóng áp lực cao và triển khai giá đỡ stent phủ thuốc DES giải áp vị trí hẹp 70%.",
    actionText: "Mô phỏng đặt Stent PCI 🩺",
    type: "med",
  },
  {
    id: "cardio-03",
    category: "Điện Sinh Lý Tim",
    badge: "Trung cấp",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    meta: "Holter & ECG",
    title: "Rối Loạn Dẫn Truyền Nút Xoang & Nhĩ Thất",
    desc: "Khảo sát luồng điện sinh học qua nút SA, AV, bó His và cơ chế hình thành các dạng Block nhĩ thất độ I, II, III.",
    actionText: "Khảo sát điện sinh lý ⚡",
    type: "med",
  },
  {
    id: "cardio-04",
    category: "Thăm Dò Không Xâm Lấn",
    badge: "Hình ảnh học",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    meta: "Doppler 4D",
    title: "Siêu Âm Tim Doppler: Đánh Giá Van 2 Lá & EF%",
    desc: "Đo đạc diện tích mở van hai lá, dòng phụt ngược hở van và tính toán phân suất tống máu thất trái (EF%).",
    actionText: "Thực hành Siêu âm tim 🫀",
    type: "med",
  },
];


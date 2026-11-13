/**
 * Gói bài thực hành (lab package): một bài thực hành mô tả hoàn toàn bằng dữ liệu JSON.
 * Màn hình chung đọc gói này để dựng đủ các bước: tìm hiểu, xem quy trình, tự lắp, đi dây, tính toán, thử tự do.
 * AI chỉ sinh ra dữ liệu theo schema này; linh kiện và chân phải lấy từ thư viện (lib/lab/parts), công thức do mã tính.
 * Đơn vị: mét cho vị trí trong cảnh 3D.
 */
import type { PartOrient, V3, ShapeDef } from '../parts';

export const PACKAGE_SCHEMA_VERSION = 1;

export interface PkgOverview {
  title: string;
  what: string;
  steps: string[];
}

export interface PkgCamera {
  pos: V3;
  target: V3;
  min?: number;
  max?: number;
}

export interface PkgScene {
  /** Góc nhìn khi lắp ráp */
  camera: PkgCamera;
  /** Góc nhìn khi đi dây (gần hơn) */
  wireCamera: PkgCamera;
  grid: number;
  /** Màu nền đặt vật thể */
  ground: string;
  /** Vật cố định không phải bộ phận để lắp (chậu, tấm nền...). Dùng các khối cơ bản. */
  decor: (ShapeDef & { color: string })[];
}

/** Một bộ phận trong bài: thông tin học tập + vị trí đặt linh kiện từ thư viện */
export interface PkgPart {
  id: string;
  /** Mã linh kiện trong thư viện (lib/lab/parts) */
  partId: string;
  name: string;
  role: string;
  color: string;
  /** Mục tiêu bước lắp, mô tả theo chức năng để người học tự suy ra bộ phận */
  goal: string;
  hint: string;
  facts: { k: string; v: string }[];
  details: string[];
  /** Vị trí điểm giữa mặt đáy (m) */
  at: V3;
  yaw?: number;
  flip?: boolean;
  scale?: number;
  /** Chỉ cần khi muốn đổi cách đặt mặc định của linh kiện */
  orient?: PartOrient;
  /** Điểm đầu nối vẽ đường nét đứt ở bước xem quy trình */
  node: V3;
}

export interface PkgNet {
  id: string;
  name: string;
  color: string;
  /** Giải thích khi đã nối đúng */
  done: string;
}

export interface PkgTerminal {
  id: string;
  /** Id bộ phận trong bài */
  part: string;
  /** Mã chân trong thư viện linh kiện */
  pin: string;
  label: string;
  desc: string;
  net: string;
  pos: V3;
  /** Độ cao thân linh kiện tại chân này (m), để vẽ cọc nối xuống */
  base: number;
}

/** Lý do khi nối hai chân khác mạch. Luật đầu tiên khớp sẽ được dùng. `*` khớp mọi mạch. */
export interface PkgRule {
  nets: [string, string];
  /** Nếu có, chỉ khớp khi đúng hai chân này (không phân biệt thứ tự) */
  terminals?: [string, string];
  message: string;
}

export interface PkgWiring {
  exercise: string;
  nets: PkgNet[];
  terminals: PkgTerminal[];
  rules: PkgRule[];
  /** Lý do chung khi không luật nào khớp */
  fallback: string;
  doneText: string;
}

export interface PkgInput {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

/**
 * Bài tính: công thức nằm ở `answer` và do mã tính, AI không tự cho đáp án.
 * Chữ trong `prompt`, `okText`, `failText` dùng `{tên}` hoặc `{tên:số chữ số thập phân}` để chèn giá trị
 * (từ `inputs`, `constants` và `answer`).
 */
export interface PkgExercise {
  title: string;
  prompt: string;
  inputs: PkgInput[];
  constants: Record<string, number>;
  /** Biểu thức: số, tên biến, + - * / ( ), min max abs sqrt pow round */
  answer: string;
  /** Sai số cho phép: `rel` (tỉ lệ) hoặc `abs` (đơn vị của đáp án) */
  tolerance: { rel?: number; abs?: number };
  placeholder: string;
  okText: string;
  failText: string;
  /** Bộ phận được làm nổi bật trong cảnh khi làm bài */
  focus: string;
}

/** Mẫu mô phỏng cho bước thử tự do: chỉ dùng các mẫu mã đã viết sẵn. */
export type TuneTemplate = 'iot-moisture';

export interface PkgTexts {
  buildDone: string;
  buildDoneLabel: string;
}

export interface LabPackage {
  schemaVersion: typeof PACKAGE_SCHEMA_VERSION;
  /** Mã duy nhất, kebab-case */
  slug: string;
  title: string;
  subtitle: string;
  overview: PkgOverview;
  scene: PkgScene;
  parts: PkgPart[];
  /** Đường nét đứt giữa các bộ phận ở bước xem quy trình (id bộ phận) */
  links: [string, string][];
  /** Thứ tự (chỉ số trong `parts`) hiển thị danh sách khi tự lắp, xáo trộn để người học tự suy luận */
  buildOrder: number[];
  wiring: PkgWiring;
  exercises: PkgExercise[];
  tune: { template: TuneTemplate };
  texts: PkgTexts;
}

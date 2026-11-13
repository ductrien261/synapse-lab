/**
 * Thư viện linh kiện dùng chung cho các phòng STEM.
 * Một linh kiện được mô tả bằng dữ liệu thuần (không phụ thuộc giao diện) để bài viết tay
 * và bài do AI sinh đều chọn linh kiện từ cùng một nguồn, bảo đảm có mô hình 3D, chân và thông số đúng.
 * Đơn vị: kích thước mm, điện áp V, dòng A.
 */

export type PartCategory = 'service' | 'controller' | 'sensor' | 'actuator' | 'driver' | 'power' | 'switch' | 'display' | 'relay';

/** Loại tín hiệu của một chân, dùng để kiểm tra dây nối hợp lý (ví dụ không nối nguồn vào ngõ tín hiệu). */
export type PinSignal = 'power-in' | 'power-out' | 'ground' | 'digital' | 'analog' | 'pwm' | 'motor' | 'switched';

export interface PartPin {
  /** Mã chân, duy nhất trong một linh kiện (ví dụ `vin`, `gnd`, `out`) */
  id: string;
  /** Nhãn hiển thị cho người học */
  labelVi: string;
  signal: PinSignal;
  /** Điện áp danh định (V) nếu chân là nguồn hoặc tín hiệu có mức điện áp rõ ràng */
  volts?: number;
  /** Vị trí trong hệ tọa độ của linh kiện (mm), gốc ở giữa đáy; có thể bổ sung sau khi đo trên mô hình */
  pos?: [number, number, number];
}

export type V3 = [number, number, number];

/** Cách đặt mô hình CAD trong cảnh 3D (khớp với BASES trong Scene3D) */
export type PartOrient = 'flat' | 'motor' | 'lying' | 'probe' | 'upright';

/** Khối dựng bằng code, tọa độ theo hệ của linh kiện (m), gốc ở giữa đáy. Không ghi `color` thì dùng màu của bộ phận. */
export type ShapeDef =
  | { t: 'blk'; pos: V3; size: V3; color?: string; rot?: V3 }
  | { t: 'cyl'; pos: V3; r: number; rBottom?: number; h: number; color?: string; rot?: V3 }
  | { t: 'arc'; pos: V3; r: number; tube: number; arc: number; color?: string; rot?: V3 };

export type PartModel =
  /** Tệp STL trong `public/lab/parts/<file>.stl`, kèm cách đặt mặc định */
  | { kind: 'stl'; file: string; orient: PartOrient; source: string; license: string }
  /** Dựng bằng các khối trong code, không có tệp mô hình */
  | { kind: 'procedural'; note: string; shapes: ShapeDef[] };

export interface PartSpec {
  /** Tên thông số, ví dụ `Điện áp nguồn` */
  label: string;
  /** Giá trị hiển thị */
  value: string;
  /** Giá trị số (nếu có) để công thức và bộ kiểm tra dùng */
  num?: number;
  unit?: string;
}

export interface PartDef {
  /** Mã duy nhất, kebab-case (ví dụ `esp32`) */
  id: string;
  nameVi: string;
  nameEn: string;
  category: PartCategory;
  /** Một câu giải thích vai trò cho người học */
  summaryVi: string;
  model: PartModel;
  /** Kích thước hộp bao [x, y, z] (mm), đo từ mô hình hoặc theo datasheet */
  sizeMm: [number, number, number];
  pins: PartPin[];
  specs: PartSpec[];
}

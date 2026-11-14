import { PARTS } from './catalog';
import type { PartDef } from './types';

export type { PartOrient, ShapeDef, V3, PartCategory, PartDef, PartModel, PartPin, PartSpec, PinSignal } from './types';
export { PARTS } from './catalog';
export { pinPlacement } from './geometry';

const byId = new Map(PARTS.map((p) => [p.id, p]));

export const getPart = (id: string): PartDef | undefined => byId.get(id);

export const hasPart = (id: string) => byId.has(id);

/** Chân `pinId` của linh kiện `partId` có tồn tại không (dùng khi kiểm tra bài do AI sinh) */
export const hasPin = (partId: string, pinId: string) => !!byId.get(partId)?.pins.some((p) => p.id === pinId);

const ID = /^[a-z][a-z0-9-]*$/;
/** Mã chân được phép bắt đầu bằng số (ví dụ `5v`, `3v3`) */
const PIN_ID = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Kiểm tra thư viện: trả về danh sách lỗi (rỗng là hợp lệ).
 * Dùng cho bộ kiểm tra tự động và cho bước kiểm tra bài do AI sinh.
 */
export function validateParts(parts: PartDef[] = PARTS): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const at = `Linh kiện "${p.id}"`;
    if (!ID.test(p.id)) errors.push(`${at}: mã phải là kebab-case`);
    if (seen.has(p.id)) errors.push(`${at}: trùng mã`);
    seen.add(p.id);
    if (!p.nameVi.trim() || !p.nameEn.trim() || !p.summaryVi.trim()) errors.push(`${at}: thiếu tên hoặc mô tả`);
    if (p.sizeMm.some((n) => !(n > 0))) errors.push(`${at}: kích thước phải dương`);
    if (p.model.kind === 'stl' && (!p.model.file || !p.model.license || !p.model.source)) errors.push(`${at}: mô hình STL thiếu tệp hoặc giấy phép`);
    if (p.pins.length === 0 && p.category !== 'service' && p.category !== 'structure') errors.push(`${at}: chưa có chân nào`);
    if (p.model.kind === 'procedural' && p.model.shapes.length === 0) errors.push(`${at}: mô hình dựng bằng code chưa có khối nào`);
    const pins = new Set<string>();
    for (const pin of p.pins) {
      if (!PIN_ID.test(pin.id)) errors.push(`${at}, chân "${pin.id}": mã phải là kebab-case`);
      if (pins.has(pin.id)) errors.push(`${at}, chân "${pin.id}": trùng mã`);
      pins.add(pin.id);
      if (!Array.isArray(pin.pos) || pin.pos.length !== 3 || !pin.pos.every(Number.isFinite) || !Number.isFinite(pin.base)) errors.push(`${at}, chân "${pin.id}": thiếu vị trí hoặc độ cao thân`);
      else if (pin.pos[1] < pin.base) errors.push(`${at}, chân "${pin.id}": chấm phải nằm trên thân (y không nhỏ hơn base)`);
    }
  }
  return errors;
}

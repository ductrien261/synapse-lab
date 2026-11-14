/** Tính các kết quả và đường cong của mẫu "công thức" (hàm thuần, dùng chung cho giao diện và bộ kiểm tra). */
import { evaluate } from './expr';
import type { FormulaTune } from './types';

export const formulaDefaults = (t: FormulaTune): Record<string, number> => Object.fromEntries(t.inputs.map((i) => [i.name, i.default]));

/** Tính lần lượt các kết quả; kết quả sau dùng được kết quả trước. Lỗi tính (ví dụ chia cho 0) cho ra NaN. */
export function computeOutputs(t: FormulaTune, values: Record<string, number>): Record<string, number> {
  const scope: Record<string, number> = { ...t.constants, ...values };
  const out: Record<string, number> = {};
  for (const o of t.outputs) {
    try {
      out[o.id] = evaluate(o.expr, scope);
    } catch {
      out[o.id] = NaN;
    }
    scope[o.id] = out[o.id];
  }
  return out;
}

/** Điểm của đường cong: quét đại lượng `xInput` từ nhỏ nhất tới lớn nhất, các đại lượng khác giữ nguyên */
export function sweep(t: FormulaTune, values: Record<string, number>, steps = 60): { x: number; y: number }[] {
  const inp = t.inputs.find((i) => i.name === t.chart.xInput);
  if (!inp) return [];
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = inp.min + ((inp.max - inp.min) * i) / steps;
    const y = computeOutputs(t, { ...values, [inp.name]: x })[t.chart.yOutput];
    if (Number.isFinite(y)) pts.push({ x, y });
  }
  return pts;
}

/** Các cảnh báo đang bị vi phạm */
export function activeLimits(t: FormulaTune, out: Record<string, number>): string[] {
  return t.limits.filter((l) => {
    const v = out[l.output];
    return Number.isFinite(v) && ((l.min !== undefined && v < l.min) || (l.max !== undefined && v > l.max));
  }).map((l) => l.text);
}

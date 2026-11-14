import type { PartPin, V3 } from './types';

/**
 * Vị trí chấm đấu dây của một chân trong cảnh 3D, tính từ vị trí đặt linh kiện.
 * `at` là điểm giữa đáy linh kiện, `yaw` là góc xoay quanh trục đứng (rad, cùng chiều với three.js).
 * Chưa xét linh kiện lật úp hay đổi tỉ lệ (bài cần thì khai báo vị trí chân tường minh).
 */
export function pinPlacement(at: V3, yaw: number | undefined, pin: Pick<PartPin, 'pos' | 'base'>): { pos: V3; base: number } {
  const c = Math.cos(yaw ?? 0);
  const s = Math.sin(yaw ?? 0);
  const [x, y, z] = pin.pos;
  return {
    pos: [at[0] + x * c + z * s, at[1] + y, at[2] - x * s + z * c],
    base: at[1] + pin.base,
  };
}

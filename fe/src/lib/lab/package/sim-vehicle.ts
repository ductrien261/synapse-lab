/**
 * Mô phỏng xe trong sân nhìn từ trên xuống (hàm thuần, không phụ thuộc giao diện).
 * Xe chạy thẳng; cứ mỗi chu kỳ đo, cảm biến đo khoảng cách phía trước. Gần hơn ngưỡng thì xe quay tại chỗ cho đến khi đường thoáng.
 * Đơn vị: mét, giây, rad.
 */

export const ARENA = { w: 2.4, h: 1.4 };
export const CAR_RADIUS = 0.06;
/** Tầm đo tối đa của cảm biến (m) */
export const SENSOR_RANGE = 2;

export interface Obstacle {
  x: number;
  y: number;
  r: number;
}

export const OBSTACLES: Obstacle[] = [
  { x: 0.9, y: 0.45, r: 0.12 },
  { x: 1.4, y: 0.95, r: 0.14 },
  { x: 1.95, y: 0.5, r: 0.11 },
  { x: 0.55, y: 1.05, r: 0.1 },
];

export interface VehicleParams {
  /** Tốc độ chạy thẳng (m/s) */
  speed: number;
  /** Khoảng cách phát hiện: gần hơn thì quay (m) */
  threshold: number;
  /** Tốc độ quay tại chỗ (độ/giây) */
  turnDeg: number;
  /** Chu kỳ giữa hai lần đo (s) */
  period: number;
}

export const DEFAULT_VEHICLE_PARAMS: VehicleParams = { speed: 0.4, threshold: 0.35, turnDeg: 120, period: 0.1 };

export interface VehicleState {
  x: number;
  y: number;
  /** Hướng (rad), 0 là sang phải */
  th: number;
  t: number;
  distance: number;
  /** Số lần phải quay để né */
  avoids: number;
  crashed: boolean;
  turning: boolean;
  /** Khoảng cách đo gần nhất (m) */
  lastRange: number;
  nextPing: number;
}

export const initialVehicle = (): VehicleState => ({ x: 0.2, y: 0.7, th: 0, t: 0, distance: 0, avoids: 0, crashed: false, turning: false, lastRange: SENSOR_RANGE, nextPing: 0 });

/** Khoảng cách từ (x, y) theo hướng th tới vật cản hoặc tường gần nhất (tới SENSOR_RANGE) */
export function rangeAhead(x: number, y: number, th: number): number {
  const dx = Math.cos(th);
  const dy = Math.sin(th);
  let best = SENSOR_RANGE;
  for (const o of OBSTACLES) {
    const fx = x - o.x;
    const fy = y - o.y;
    const b = fx * dx + fy * dy;
    const c = fx * fx + fy * fy - o.r * o.r;
    const disc = b * b - c;
    if (disc < 0) continue;
    const t = -b - Math.sqrt(disc);
    if (t >= 0 && t < best) best = t;
  }
  const walls: number[] = [];
  if (dx > 1e-9) walls.push((ARENA.w - x) / dx);
  if (dx < -1e-9) walls.push((0 - x) / dx);
  if (dy > 1e-9) walls.push((ARENA.h - y) / dy);
  if (dy < -1e-9) walls.push((0 - y) / dy);
  for (const t of walls) if (t >= 0 && t < best) best = t;
  return best;
}

const hits = (x: number, y: number) => x < CAR_RADIUS || y < CAR_RADIUS || x > ARENA.w - CAR_RADIUS || y > ARENA.h - CAR_RADIUS || OBSTACLES.some((o) => Math.hypot(x - o.x, y - o.y) < o.r + CAR_RADIUS);

/** Tiến mô phỏng thêm `dt` giây */
export function stepVehicle(s: VehicleState, p: VehicleParams, dt = 0.02): VehicleState {
  if (s.crashed) return s;
  let { x, y, th, turning, avoids, lastRange, nextPing } = s;
  const t = s.t + dt;
  if (t >= nextPing) {
    lastRange = rangeAhead(x, y, th);
    const blocked = lastRange < p.threshold;
    if (blocked && !turning) avoids += 1;
    turning = blocked;
    nextPing = t + p.period;
  }
  let distance = s.distance;
  if (turning) {
    th += (p.turnDeg * Math.PI) / 180 * dt;
  } else {
    x += Math.cos(th) * p.speed * dt;
    y += Math.sin(th) * p.speed * dt;
    distance += p.speed * dt;
  }
  return { x, y, th, t, distance, avoids, crashed: hits(x, y), turning, lastRange, nextPing };
}

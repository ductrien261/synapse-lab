/**
 * Mô hình xe hai bánh dẫn động vi sai dò vạch: thông số, đường đua và mô phỏng.
 * Toàn bộ vật lý nằm ở đây (hàm thuần, không phụ thuộc giao diện); trợ lý AI chỉ đọc kết quả.
 */
import type { AsmPart } from '@/components/lab/shared/assembly';

export const CAR = {
  /** Đường kính bánh (m) */
  wheelDiameter: 0.065,
  /** Khoảng cách giữa hai bánh (m) */
  track: 0.12,
  /** Tốc độ không tải của motor ở điện áp định mức (vòng/phút) */
  motorRpm: 200,
  /** Cảm biến đặt phía trước trục bánh (m) */
  sensorAhead: 0.07,
  /** Khoảng cách giữa hai cảm biến cạnh nhau (m) */
  sensorGap: 0.015,
  /** Bề rộng vạch đen (m) */
  lineWidth: 0.02,
  /** Hằng số thời gian đáp ứng của motor (s) */
  motorTau: 0.05,
  /** Một cell pin 18650 */
  cellMah: 2600,
  cellVolt: 3.7,
  /** Dòng tiêu thụ (A): mỗi motor khi chạy và mạch điều khiển cùng cảm biến */
  motorAmp: 0.35,
  logicAmp: 0.15,
} as const;

/** Tốc độ dài lớn nhất của xe (m/s): v = π·d·n / 60 */
export const maxSpeed = (d: number = CAR.wheelDiameter, rpm: number = CAR.motorRpm) => (Math.PI * d * rpm) / 60;

/** Tốc độ góc khi hai bánh có tốc độ khác nhau (rad/s, dương là quẹo trái) */
export const turnRate = (vLeft: number, vRight: number, track: number = CAR.track) => (vRight - vLeft) / track;

/** Thời gian chạy bằng pin (phút): t = dung lượng / dòng tiêu thụ */
export const runtimeMinutes = (cells: number) => ((cells * CAR.cellMah) / ((2 * CAR.motorAmp + CAR.logicAmp) * 1000)) * 60;

export const CAR_PARTS: AsmPart[] = [
  {
    id: 'chassis',
    name: 'Khung xe',
    role: 'Tấm nền chịu lực, mọi bộ phận khác được gắn lên nó.',
    color: '#6B7A99',
    goal: 'Bắt đầu bằng thứ nâng đỡ tất cả, để các bộ phận sau có chỗ gắn.',
    hint: 'Đây là tấm nền lớn nhất, nằm dưới cùng.',
    facts: [
      { k: 'Vật liệu', v: 'Mica hoặc nhựa in 3D' },
      { k: 'Kích thước', v: '20 × 12 cm' },
    ],
    details: ['Khung càng nhẹ thì xe càng nhanh nhưng phải đủ cứng để không cong.', 'Vị trí gắn motor và pin quyết định xe có cân bằng hay không.'],
  },
  {
    id: 'motors',
    name: 'Hai motor giảm tốc',
    role: 'Biến điện năng thành chuyển động quay, mỗi motor lái một bánh.',
    color: '#E08A2E',
    goal: 'Gắn thứ tạo ra lực quay, mỗi bên một cái để lái được từng bánh riêng.',
    hint: 'Hai khối có trục, gắn hai bên mép khung.',
    facts: [
      { k: 'Loại', v: 'Motor DC có hộp giảm tốc' },
      { k: 'Tốc độ', v: `${CAR.motorRpm} vòng/phút (không tải)` },
    ],
    details: ['Hộp giảm tốc đổi tốc độ cao thành lực quay lớn hơn.', 'Hai motor chạy tốc độ khác nhau là cách duy nhất để xe quẹo.'],
  },
  {
    id: 'wheels',
    name: 'Bánh xe và bánh đa hướng',
    role: 'Hai bánh chủ động tạo chuyển động, bánh đa hướng phía trước giữ xe không chúi.',
    color: '#2A2F3A',
    goal: 'Gắn thứ chạm đất, truyền chuyển động của motor xuống mặt đường.',
    hint: 'Hai bánh lớn gắn vào trục motor, một bánh nhỏ tự xoay ở đầu xe.',
    facts: [
      { k: 'Đường kính bánh', v: `${CAR.wheelDiameter * 1000} mm` },
      { k: 'Khoảng cách hai bánh', v: `${CAR.track * 100} cm` },
    ],
    details: ['Bánh to thì xe đi nhanh hơn ở cùng tốc độ motor nhưng lực kéo yếu hơn.', 'Hai bánh xa nhau thì xe quẹo chậm hơn nhưng vững hơn.'],
  },
  {
    id: 'battery',
    name: 'Pin',
    role: 'Cung cấp điện cho motor và mạch điều khiển.',
    color: '#C0392B',
    goal: 'Gắn nguồn năng lượng, đặt thấp và ở giữa để xe cân bằng.',
    hint: 'Khối chữ nhật nặng, đặt giữa khung.',
    facts: [
      { k: 'Loại', v: 'Pin 18650 (3,7 V mỗi cell)' },
      { k: 'Dung lượng', v: `${CAR.cellMah} mAh mỗi cell` },
    ],
    details: ['Dung lượng càng lớn thì chạy càng lâu nhưng xe càng nặng.', 'Thời gian chạy ≈ dung lượng chia cho dòng tiêu thụ.'],
  },
  {
    id: 'switch',
    name: 'Công tắc nguồn',
    role: 'Đóng hoặc ngắt điện từ pin ra toàn xe.',
    color: '#7C3AED',
    goal: 'Gắn chốt bật tắt ngay sau pin, để tắt xe mà không phải rút dây.',
    hint: 'Một nút gạt nhỏ nằm sát mép sau của khung.',
    facts: [
      { k: 'Loại', v: 'Công tắc gạt' },
      { k: 'Dòng chịu được', v: 'Từ 1 A trở lên (xe dùng khoảng 0,85 A)' },
    ],
    details: ['Công tắc mắc nối tiếp trên dây dương của pin.', 'Rút dây mỗi lần tắt xe rất dễ chạm chập, nên mới cần công tắc.'],
  },
  {
    id: 'regulator',
    name: 'Mạch ổn áp 5 V',
    role: 'Đổi điện áp pin thành 5 V ổn định để nuôi mạch điều khiển và cảm biến.',
    color: '#0E9F9A',
    goal: 'Gắn bộ biến đổi điện áp, vì bộ não và cảm biến cần điện áp ổn định chứ không dao động theo pin.',
    hint: 'Tấm mạch rất nhỏ nằm cạnh pin.',
    facts: [
      { k: 'Đầu ra', v: '5 V ổn định' },
      { k: 'Loại', v: 'Tăng áp khi dùng 1 cell, giảm áp khi dùng nhiều cell' },
    ],
    details: ['Pin yếu dần thì điện áp tụt, nhưng mạch ổn áp giữ đầu ra không đổi nên chương trình vẫn chạy đúng.', 'Một cell pin chỉ có 3,7 V nên phải tăng lên 5 V; pin 2 đến 3 cell thì giảm xuống.'],
  },
  {
    id: 'driver',
    name: 'Mạch điều khiển motor',
    role: 'Nhận tín hiệu nhỏ từ vi điều khiển rồi cấp dòng lớn, đúng chiều và đúng tốc độ, cho từng motor.',
    color: '#DB2777',
    goal: 'Gắn thứ nằm giữa bộ não và motor, vì vi điều khiển không thể tự cấp đủ dòng cho motor.',
    hint: 'Hai tấm mạch nhỏ hai bên, mỗi tấm nối với một motor.',
    facts: [
      { k: 'Số kênh', v: '2 (mỗi motor một mạch)' },
      { k: 'Dòng tối đa', v: '3,6 A mỗi kênh' },
    ],
    details: ['Tốc độ motor chỉnh bằng PWM: bật tắt rất nhanh, tỉ lệ thời gian bật càng lớn thì motor quay càng nhanh.', 'Mạch cầu H bên trong cho phép đảo chiều quay bằng cách đổi cực điện áp.'],
  },
  {
    id: 'controller',
    name: 'Mạch điều khiển',
    role: 'Bộ não của xe: đọc cảm biến, tính toán và ra lệnh cho mạch điều khiển motor.',
    color: '#0F8A6B',
    goal: 'Gắn bộ não, nơi chạy chương trình điều khiển.',
    hint: 'Tấm mạch xanh nằm giữa pin và đầu xe.',
    facts: [
      { k: 'Loại', v: 'Vi điều khiển ESP32' },
      { k: 'Thuật toán', v: 'PID bám vạch' },
    ],
    details: ['Chương trình đọc năm cảm biến rồi tính chênh lệch tốc độ hai bánh.', 'Nó gửi tín hiệu PWM tới mạch điều khiển motor chứ không cấp điện trực tiếp cho motor.'],
  },
  {
    id: 'sensors',
    name: 'Cảm biến dò vạch',
    role: 'Năm mắt hồng ngoại nhìn xuống đất, báo cho xe biết vạch đen đang ở đâu.',
    color: '#3B82F6',
    goal: 'Gắn thứ cuối cùng ở đầu xe để xe "nhìn" thấy đường đi.',
    hint: 'Một hàng năm mắt nhỏ ở mũi xe, hướng xuống đất.',
    facts: [
      { k: 'Số mắt', v: '5, cách nhau 1,5 cm' },
      { k: 'Vị trí', v: `${CAR.sensorAhead * 100} cm trước trục bánh` },
    ],
    details: ['Mắt nào đang nằm trên vạch thì báo 1.', 'Đặt cảm biến càng xa trước trục thì xe thấy sớm hơn nhưng dễ lắc.'],
  },
];

/* ---------- Đường đua ---------- */

export interface Pt {
  x: number;
  y: number;
}

/** Một đường đua khép kín. `points` cách đều nhau theo chiều dài đường. */
export interface TrackDef {
  id: string;
  name: string;
  /** Mô tả ngắn: đường này thử thách điều gì */
  blurb: string;
  points: Pt[];
}

/** Lấy mẫu lại một đường khép kín thành n điểm cách đều theo chiều dài. */
function resample(raw: Pt[], n: number): Pt[] {
  const m = raw.length;
  const cum = [0];
  for (let i = 0; i < m; i++) {
    const a = raw[i];
    const b = raw[(i + 1) % m];
    cum.push(cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cum[m];
  const out: Pt[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const d = (i / n) * total;
    while (cum[j + 1] < d) j++;
    const a = raw[j];
    const b = raw[(j + 1) % m];
    const u = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  }
  return out;
}

/** Làm mượt đường gấp khúc khép kín bằng cách cắt góc (Chaikin). */
function smooth(pts: Pt[], rounds: number): Pt[] {
  let cur = pts;
  for (let r = 0; r < rounds; r++) {
    const next: Pt[] = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i];
      const b = cur[(i + 1) % cur.length];
      next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y }, { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    cur = next;
  }
  return cur;
}

/** Hình chữ nhật góc vuông (bo rất nhỏ), bắt đầu giữa cạnh dưới và đi ngược chiều kim đồng hồ. */
function squareTrack(hw: number, hh: number, r: number): Pt[] {
  const out: Pt[] = [{ x: 0, y: -hh }];
  const corner = (cx: number, cy: number, from: number) => {
    for (let k = 0; k <= 6; k++) {
      const t = from + (k / 6) * (Math.PI / 2);
      out.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
    }
  };
  corner(hw - r, -hh + r, -Math.PI / 2);
  corner(hw - r, hh - r, 0);
  corner(-hw + r, hh - r, Math.PI / 2);
  corner(-hw + r, -hh + r, Math.PI);
  return out;
}

const OVAL: Pt[] = Array.from({ length: 360 }, (_, i) => {
  const t = (i / 360) * Math.PI * 2;
  return { x: 0.9 * Math.cos(t), y: 0.45 * Math.sin(t) + 0.15 * Math.sin(2 * t) + 0.05 * Math.sin(4 * t) };
});

/** Vòng răng cưa: bán kính dao động theo sóng tam giác nên cạnh có nhiều khúc gấp. */
const ZIGZAG: Pt[] = smooth(
  Array.from({ length: 20 }, (_, i) => {
    const t = (i / 20) * Math.PI * 2;
    const tri = i % 2 === 0 ? 1 : -1;
    return { x: (0.8 + 0.12 * tri) * Math.cos(t), y: (0.5 + 0.09 * tri) * Math.sin(t) };
  }),
  2,
);

export const TRACKS: TrackDef[] = [
  { id: 'oval', name: 'Đường cong', blurb: 'Vòng cong có đoạn uốn, đường đầu tiên để làm quen.', points: OVAL },
  { id: 'circle', name: 'Vòng tròn', blurb: 'Cua đều một chiều, đường dễ nhất. Kp thấp vẫn chạy được.', points: resample(Array.from({ length: 360 }, (_, i) => ({ x: 0.38 * Math.cos((i / 360) * Math.PI * 2), y: 0.38 * Math.sin((i / 360) * Math.PI * 2) })), 360) },
  { id: 'square', name: 'Góc vuông', blurb: 'Bốn khúc quẹo gần 90 độ. Tốc độ cao mà Kp thấp thì xe văng ra ở góc.', points: resample(squareTrack(0.8, 0.5, 0.02), 480) },
  { id: 'zigzag', name: 'Zích zắc', blurb: 'Nhiều khúc ngoặt liên tiếp, dễ làm xe lắc nếu Kd thấp.', points: resample(ZIGZAG, 480) },
];

/** Đường mặc định (đường cong). */
export const TRACK: Pt[] = TRACKS[0].points;

export function distToTrack(p: Pt, track: Pt[] = TRACK): { dist: number; index: number } {
  let best = Infinity;
  let bi = 0;
  for (let i = 0; i < track.length; i++) {
    const a = track[i];
    const b = track[(i + 1) % track.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const d = Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy));
    if (d < best) {
      best = d;
      bi = i;
    }
  }
  return { dist: best, index: bi };
}

/* ---------- Mô phỏng dò vạch ---------- */

export interface CarParams {
  /** Tốc độ nền (m/s) */
  speed: number;
  /** Hệ số tỉ lệ: bẻ lái mạnh bao nhiêu khi lệch vạch (0 đến 10) */
  kp: number;
  /** Hệ số vi phân: giảm lắc khi lệch đổi nhanh (0 đến 10) */
  kd: number;
}

export const DEFAULT_CAR_PARAMS: CarParams = { speed: 0.3, kp: 5, kd: 2 };

export interface CarState {
  x: number;
  y: number;
  th: number;
  vl: number;
  vr: number;
  /** Sai số lần trước, để tính vi phân */
  prevError: number;
  /** Thời gian liên tục mất vạch (s) */
  lostFor: number;
  t: number;
  /** Số điểm đã đi qua trên đường đua, dùng đếm vòng */
  progress: number;
  lastIndex: number;
  /** Độ lệch lớn nhất của tâm xe so với vạch (m) */
  maxOff: number;
  status: 'ready' | 'running' | 'lost' | 'finished';
  lapTime: number | null;
  sensors: boolean[];
  error: number;
  off: number;
}

export function initialCar(track: Pt[] = TRACK): CarState {
  const a = track[0];
  const b = track[1];
  return {
    x: a.x,
    y: a.y,
    th: Math.atan2(b.y - a.y, b.x - a.x),
    vl: 0,
    vr: 0,
    prevError: 0,
    lostFor: 0,
    t: 0,
    progress: 0,
    lastIndex: 0,
    maxOff: 0,
    status: 'ready',
    lapTime: null,
    sensors: [false, false, false, false, false],
    error: 0,
    off: 0,
  };
}

/** Mất vạch liên tục quá khoảng này (s) thì coi như hỏng chuyến */
const LOST_AFTER = 0.5;
export const KP_SCALE = 0.12;
const KD_SCALE = 0.001;

export function stepCar(s: CarState, p: CarParams, dt: number, track: Pt[] = TRACK): CarState {
  if (s.status === 'lost' || s.status === 'finished') return s;
  const cos = Math.cos(s.th);
  const sin = Math.sin(s.th);
  // Cảm biến: i = 0 là mắt ngoài cùng bên trái (+y trong hệ xe), trọng số +2
  const sensors: boolean[] = [];
  let sum = 0;
  let count = 0;
  for (let i = 0; i < 5; i++) {
    const lat = (2 - i) * CAR.sensorGap;
    const px = s.x + CAR.sensorAhead * cos - lat * sin;
    const py = s.y + CAR.sensorAhead * sin + lat * cos;
    const on = distToTrack({ x: px, y: py }, track).dist < CAR.lineWidth / 2;
    sensors.push(on);
    if (on) {
      sum += 2 - i;
      count += 1;
    }
  }
  let error: number;
  let lostFor = 0;
  if (count > 0) {
    error = sum / count;
  } else {
    // Mất vạch: bẻ lái hết cỡ về phía lần cuối thấy vạch
    error = s.prevError >= 0 ? 3 : -3;
    lostFor = s.lostFor + dt;
  }
  const dError = (error - s.prevError) / dt;
  const steer = p.kp * KP_SCALE * error + p.kd * KD_SCALE * dError;
  const vmax = maxSpeed();
  const cmdL = Math.max(-vmax, Math.min(vmax, p.speed - steer));
  const cmdR = Math.max(-vmax, Math.min(vmax, p.speed + steer));
  const k = 1 - Math.exp(-dt / CAR.motorTau);
  const vl = s.vl + (cmdL - s.vl) * k;
  const vr = s.vr + (cmdR - s.vr) * k;
  const v = (vl + vr) / 2;
  const w = turnRate(vl, vr);
  const thMid = s.th + (w * dt) / 2;
  const x = s.x + v * Math.cos(thMid) * dt;
  const y = s.y + v * Math.sin(thMid) * dt;
  const th = s.th + w * dt;

  const { dist, index } = distToTrack({ x, y }, track);
  let delta = index - s.lastIndex;
  if (delta > track.length / 2) delta -= track.length;
  if (delta < -track.length / 2) delta += track.length;
  const progress = s.progress + delta;
  const t = s.t + dt;
  let status: CarState['status'] = 'running';
  let lapTime: number | null = null;
  // Mất vạch quá lâu, đi ngược chiều hoặc chạy quá thời gian thì coi như hỏng chuyến
  if (lostFor > LOST_AFTER || progress < -40 || t > 60) status = 'lost';
  else if (progress >= track.length) {
    status = 'finished';
    lapTime = t;
  }
  return { x, y, th, vl, vr, prevError: error, lostFor, t, progress, lastIndex: index, maxOff: Math.max(s.maxOff, dist), status, lapTime, sensors, error, off: dist };
}

/** Chạy mô phỏng đến khi xong một vòng hoặc mất vạch (dùng để kiểm tra, không dùng trong giao diện). */
export function runLap(p: CarParams, track: Pt[] = TRACK, maxSeconds = 60, dt = 1 / 120): CarState {
  let s: CarState = { ...initialCar(track), status: 'running' };
  for (let i = 0; i < maxSeconds / dt && s.status === 'running'; i++) s = stepCar(s, p, dt, track);
  return s;
}

/** Quỹ đạo của xe khi hai bánh giữ tốc độ không đổi (cho bài tính vòng quay). */
export function arcPath(vLeft: number, vRight: number, seconds: number, steps = 60): Pt[] {
  const v = (vLeft + vRight) / 2;
  const w = turnRate(vLeft, vRight);
  const out: Pt[] = [];
  let x = 0;
  let y = 0;
  let th = 0;
  const dt = seconds / steps;
  for (let i = 0; i <= steps; i++) {
    out.push({ x, y });
    const mid = th + (w * dt) / 2;
    x += v * Math.cos(mid) * dt;
    y += v * Math.sin(mid) * dt;
    th += w * dt;
  }
  return out;
}

/** Trạng thái đóng gói cho trợ lý AI đọc và giải thích (AI không tự tính vật lý). */
export function carSimulationState(p: CarParams, s: CarState, track: TrackDef = TRACKS[0]) {
  return {
    track: { name: track.name, description: track.blurb },
    params: { base_speed_m_s: p.speed, kp: p.kp, kd: p.kd },
    car: { wheel_diameter_m: CAR.wheelDiameter, track_m: CAR.track, max_speed_m_s: Number(maxSpeed().toFixed(3)) },
    run: {
      status: s.status,
      time_s: Number(s.t.toFixed(1)),
      lap_time_s: s.lapTime === null ? null : Number(s.lapTime.toFixed(1)),
      lap_progress: Number(Math.min(1, s.progress / track.points.length).toFixed(2)),
      max_offset_from_line_cm: Number((s.maxOff * 100).toFixed(1)),
      sensors_on_line: s.sensors.map((b) => (b ? 1 : 0)),
      steering_error: Number(s.error.toFixed(2)),
    },
  };
}

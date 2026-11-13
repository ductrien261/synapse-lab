/**
 * Hệ thống tưới cây thông minh: bộ phận, công thức tính và mô phỏng độ ẩm đất.
 * Toàn bộ số liệu nằm ở đây (hàm thuần, không phụ thuộc giao diện); trợ lý AI chỉ đọc kết quả.
 */
import type { AsmPart } from '@/components/lab/shared/assembly';

export const IOT = {
  /** ADC 12 bit của ESP32, điện áp tham chiếu 3,3 V */
  adcMax: 4095,
  vref: 3.3,
  /** Số đo ADC khi cảm biến ở trong không khí khô và khi ngâm nước */
  rawDry: 3000,
  rawWet: 1200,
  /** Lưu lượng bơm (mL mỗi phút) */
  pumpFlow: 60,
  /** Độ ẩm đất giảm mỗi phút do bay hơi (%) và tăng mỗi phút khi bơm chạy (%) */
  evaporation: 0.02,
  watering: 3,
  /** Khoảng độ ẩm cây khỏe (%) */
  healthyLow: 30,
  healthyHigh: 80,
} as const;

/** Số đo ADC đổi ra điện áp (V): V = N / 4095 × 3,3 */
export const adcVolts = (raw: number) => (raw / IOT.adcMax) * IOT.vref;

/** Số đo ADC đổi ra độ ẩm (%): cảm biến điện dung đo càng cao thì đất càng khô */
export const rawToMoisture = (raw: number) => Math.max(0, Math.min(100, ((IOT.rawDry - raw) / (IOT.rawDry - IOT.rawWet)) * 100));

/** Thời gian bơm (giây) để đưa vào một thể tích nước (mL) */
export const pumpSeconds = (ml: number) => (ml / IOT.pumpFlow) * 60;

export const IOT_PARTS: AsmPart[] = [
  {
    id: 'sensor',
    name: 'Cảm biến độ ẩm đất',
    role: 'Cắm vào đất, đổi độ ẩm thành một điện áp để máy tính hiểu được.',
    color: '#0F8A6B',
    goal: 'Bắt đầu từ nơi dữ liệu sinh ra: thứ cắm xuống đất và "cảm nhận" độ ẩm.',
    hint: 'Một thanh mỏng cắm xuống chậu cây.',
    facts: [
      { k: 'Loại', v: 'Điện dung, ngõ ra analog' },
      { k: 'Ngõ ra', v: '0 đến 3,3 V' },
    ],
    details: ['Đất càng khô thì số đo càng cao với loại cảm biến này.', 'Loại điện dung bền hơn loại điện trở vì không bị ăn mòn.'],
  },
  {
    id: 'mcu',
    name: 'Vi điều khiển ESP32',
    role: 'Bộ não: đọc cảm biến, so với ngưỡng, quyết định bơm và gửi dữ liệu đi.',
    color: '#1E3F82',
    goal: 'Gắn bộ não nhận tín hiệu từ cảm biến và ra quyết định.',
    hint: 'Tấm mạch có chip và ăng-ten Wi-Fi, nối sau cảm biến.',
    facts: [
      { k: 'ADC', v: '12 bit (0 đến 4095)' },
      { k: 'Điện áp tham chiếu', v: '3,3 V' },
    ],
    details: ['ADC biến điện áp thành một số nguyên để chương trình xử lý.', 'Có sẵn Wi-Fi nên gửi dữ liệu lên mạng không cần thêm mạch.'],
  },
  {
    id: 'relay',
    name: 'Rơ-le',
    role: 'Công tắc điều khiển bằng điện: tín hiệu nhỏ của ESP32 đóng ngắt dòng lớn của máy bơm.',
    color: '#C0392B',
    goal: 'Vi điều khiển không đủ dòng cho máy bơm, hãy gắn thứ đóng ngắt hộ nó.',
    hint: 'Khối xanh có tiếng "tách" khi đóng, nối sau ESP32.',
    facts: [
      { k: 'Điều khiển', v: 'Tín hiệu 3,3 V từ ESP32' },
      { k: 'Đóng ngắt', v: 'Nguồn 5 V của bơm' },
    ],
    details: ['Rơ-le cách ly mạch điều khiển với mạch công suất.', 'Đóng ngắt quá thường xuyên làm rơ-le mòn nhanh.'],
  },
  {
    id: 'pump',
    name: 'Bơm nước mini',
    role: 'Đưa nước từ bình vào chậu khi rơ-le đóng.',
    color: '#3B82F6',
    goal: 'Gắn thứ thực sự đưa nước tới cây.',
    hint: 'Động cơ nhỏ có ống dẫn nước, nối sau rơ-le.',
    facts: [
      { k: 'Nguồn', v: '5 V' },
      { k: 'Lưu lượng', v: `${IOT.pumpFlow} mL mỗi phút` },
    ],
    details: ['Bơm chạy càng lâu thì nước càng nhiều.', 'Nên bơm vừa đủ để đất không bị úng.'],
  },
  {
    id: 'network',
    name: 'Kết nối Wi-Fi',
    role: 'Đưa dữ liệu từ ESP32 qua router lên máy chủ.',
    color: '#8B5CF6',
    goal: 'Gắn đường truyền để số liệu đi ra khỏi chậu cây.',
    hint: 'Biểu tượng sóng, đi từ ESP32 tới bảng điều khiển.',
    facts: [
      { k: 'Giao thức', v: 'MQTT hoặc HTTP' },
      { k: 'Tần suất', v: 'Theo chu kỳ lấy mẫu' },
    ],
    details: ['Gửi càng thường xuyên thì càng tốn điện và dữ liệu.', 'Mất Wi-Fi thì ESP32 vẫn nên tự quyết định tưới được.'],
  },
  {
    id: 'dashboard',
    name: 'Bảng điều khiển',
    role: 'Hiển thị độ ẩm theo thời gian và cho bạn xem hệ thống đang làm gì.',
    color: '#E08A2E',
    goal: 'Gắn thứ cuối để con người nhìn thấy dữ liệu.',
    hint: 'Màn hình có biểu đồ, ở cuối đường truyền.',
    facts: [
      { k: 'Hiển thị', v: 'Độ ẩm, trạng thái bơm' },
      { k: 'Truy cập', v: 'Trình duyệt hoặc điện thoại' },
    ],
    details: ['Biểu đồ giúp thấy xu hướng mà một con số không cho thấy.', 'Có thể đặt cảnh báo khi độ ẩm quá thấp.'],
  },
];

/* ---------- Mô phỏng độ ẩm đất ---------- */

export interface IotParams {
  /** Bơm bật khi số đo thấp hơn ngưỡng này (%) */
  threshold: number;
  /** Bơm tắt khi số đo vượt ngưỡng cộng độ trễ này (%) */
  hysteresis: number;
  /** Chu kỳ lấy mẫu (phút) */
  interval: number;
  /** Độ nhiễu của cảm biến (độ lệch chuẩn, %) */
  noise: number;
}

export const DEFAULT_IOT_PARAMS: IotParams = { threshold: 40, hysteresis: 15, interval: 5, noise: 2 };

export interface IotState {
  /** Số phút mô phỏng đã trôi qua */
  t: number;
  /** Độ ẩm thật của đất (%) */
  moisture: number;
  /** Số đo cảm biến gần nhất (%) */
  reading: number;
  pump: boolean;
  sinceSample: number;
  seed: number;
  /** Số lần rơ-le đóng ngắt */
  switches: number;
  waterMl: number;
  minutesHealthy: number;
  minM: number;
  maxM: number;
}

export function initialIot(): IotState {
  return { t: 0, moisture: 55, reading: 55, pump: false, sinceSample: 0, seed: 12345, switches: 0, waterMl: 0, minutesHealthy: 0, minM: 55, maxM: 55 };
}

/** Số ngẫu nhiên xấp xỉ phân phối chuẩn, có hạt giống để kết quả lặp lại được. */
function gaussian(seed: number): { value: number; seed: number } {
  let s = seed;
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    sum += s / 4294967296;
  }
  return { value: (sum - 3) * Math.SQRT2, seed: s };
}

/** Tiến mô phỏng thêm đúng một phút. */
export function stepIot(s: IotState, p: IotParams): IotState {
  let moisture = s.moisture - IOT.evaporation + (s.pump ? IOT.watering : 0);
  moisture = Math.max(0, Math.min(100, moisture));
  let { reading, pump, sinceSample, seed, switches } = s;
  sinceSample += 1;
  if (sinceSample >= p.interval) {
    const g = gaussian(seed);
    seed = g.seed;
    reading = Math.max(0, Math.min(100, moisture + g.value * p.noise));
    const wasOn = pump;
    if (reading < p.threshold) pump = true;
    else if (reading > p.threshold + p.hysteresis) pump = false;
    if (pump !== wasOn) switches += 1;
    sinceSample = 0;
  }
  const healthy = moisture >= IOT.healthyLow && moisture <= IOT.healthyHigh;
  return {
    t: s.t + 1,
    moisture,
    reading,
    pump,
    sinceSample,
    seed,
    switches,
    waterMl: s.waterMl + (s.pump ? IOT.pumpFlow : 0),
    minutesHealthy: s.minutesHealthy + (healthy ? 1 : 0),
    minM: Math.min(s.minM, moisture),
    maxM: Math.max(s.maxM, moisture),
  };
}

/** Chạy mô phỏng nhiều phút liền (dùng để kiểm tra, không dùng trong giao diện). */
export function runIot(p: IotParams, minutes: number): IotState {
  let s = initialIot();
  for (let i = 0; i < minutes; i++) s = stepIot(s, p);
  return s;
}

/** Trạng thái đóng gói cho trợ lý AI đọc và giải thích (AI không tự tính vật lý). */
export function iotSimulationState(p: IotParams, s: IotState) {
  return {
    params: { threshold_pct: p.threshold, hysteresis_pct: p.hysteresis, sample_interval_min: p.interval, sensor_noise_pct: p.noise },
    rules: { healthy_range_pct: [IOT.healthyLow, IOT.healthyHigh], pump_flow_ml_per_min: IOT.pumpFlow },
    run: {
      simulated_minutes: s.t,
      soil_moisture_pct: Number(s.moisture.toFixed(1)),
      last_sensor_reading_pct: Number(s.reading.toFixed(1)),
      pump_on: s.pump,
      relay_switches: s.switches,
      water_used_ml: Math.round(s.waterMl),
      healthy_time_pct: s.t === 0 ? null : Math.round((s.minutesHealthy / s.t) * 100),
      min_moisture_pct: Number(s.minM.toFixed(1)),
      max_moisture_pct: Number(s.maxM.toFixed(1)),
      readings_per_day: Math.round(1440 / p.interval),
    },
  };
}

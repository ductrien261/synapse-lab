/**
 * Đi dây cho xe dò vạch: chân của từng linh kiện và các mạch cần nối (bộ máy kiểm tra ở wiring.ts).
 */
import { createWiring, type NetDef, type Terminal } from './wiring';


type NetId = 'bat' | 'vsw' | 'v5' | 'gnd' | 'pwml' | 'pwmr' | 'sens' | 'ml' | 'mr';

const NETS: NetDef[] = [
  { id: 'bat', name: 'Từ pin tới công tắc', color: '#DC2626', done: 'Điện đi từ cực dương của pin vào công tắc. Công tắc mắc nối tiếp nên bật tắt được toàn xe.' },
  { id: 'vsw', name: 'Điện pin sau công tắc', color: '#EA580C', done: 'Điện pin sau công tắc chia ba nhánh: vào mạch ổn áp, và vào hai mạch điều khiển motor. Motor ăn dòng lớn nên lấy thẳng từ pin, không qua mạch ổn áp.' },
  { id: 'v5', name: 'Đường 5 V', color: '#D97706', done: 'Mạch ổn áp cấp 5 V ổn định cho mạch điều khiển và cảm biến, đây là phần cần điện áp ổn định.' },
  { id: 'gnd', name: 'Đường nối đất (GND) chung', color: '#1F2937', done: 'Mọi linh kiện dùng chung một mức 0 V. Không chung GND thì tín hiệu giữa các mạch không có mốc để so sánh.' },
  { id: 'pwml', name: 'Tín hiệu điều khiển motor trái', color: '#2563EB', done: 'Mạch điều khiển gửi PWM tới mạch điều khiển motor trái để chỉnh tốc độ bánh trái.' },
  { id: 'pwmr', name: 'Tín hiệu điều khiển motor phải', color: '#7C3AED', done: 'Mạch điều khiển gửi PWM tới mạch điều khiển motor phải để chỉnh tốc độ bánh phải.' },
  { id: 'sens', name: 'Tín hiệu từ cảm biến', color: '#059669', done: 'Mạch điều khiển đọc được vạch đen đang ở đâu từ năm mắt cảm biến.' },
  { id: 'ml', name: 'Dây ra motor trái', color: '#0891B2', done: 'Mạch điều khiển motor cấp dòng lớn, đúng chiều và tốc độ cho motor trái.' },
  { id: 'mr', name: 'Dây ra motor phải', color: '#DB2777', done: 'Mạch điều khiển motor cấp dòng lớn, đúng chiều và tốc độ cho motor phải.' },
];

const DECK = 0.0475;
const DRV_TOP = DECK + 0.0101;

/** Chân của mạch điều khiển motor: cột sau là nguồn, cột trước là tín hiệu; "gần giữa" là phía mạch điều khiển. */
function driverPins(side: 'l' | 'r'): Terminal[] {
  const cy = side === 'l' ? 0.043 : -0.043;
  const toward = side === 'l' ? -0.0055 : 0.0055;
  const name = side === 'l' ? 'Mạch điều khiển motor trái' : 'Mạch điều khiển motor phải';
  const z = DRV_TOP + 0.006;
  const sideName = side === 'l' ? 'trái' : 'phải';
  return [
    { id: `driver-${side}-vm`, part: 'driver', partName: name, label: 'VM (nguồn motor)', desc: `Nhận điện áp pin để cấp dòng lớn cho motor ${sideName}.`, net: 'vsw', pos: [-0.0055, cy + toward, z], base: DRV_TOP },
    { id: `driver-${side}-gnd`, part: 'driver', partName: name, label: 'GND', desc: 'Chân nối đất của mạch.', net: 'gnd', pos: [-0.0055, cy - toward, z], base: DRV_TOP },
    { id: `driver-${side}-in`, part: 'driver', partName: name, label: 'IN (tín hiệu PWM)', desc: `Nhận tín hiệu PWM từ mạch điều khiển để chỉnh tốc độ motor ${sideName}.`, net: side === 'l' ? 'pwml' : 'pwmr', pos: [0.0055, cy + toward, z], base: DRV_TOP },
    { id: `driver-${side}-out`, part: 'driver', partName: name, label: 'OUT (ra motor)', desc: `Đầu ra cấp điện cho motor ${sideName}.`, net: side === 'l' ? 'ml' : 'mr', pos: [0.0055, cy - toward, z], base: DRV_TOP },
  ];
}

const TERMINALS: Terminal[] = [
  { id: 'bat-pos', part: 'battery', partName: 'Pin', label: 'Cực dương (+)', desc: 'Điện đi ra khỏi pin ở đây.', net: 'bat', pos: [-0.075, 0.01, 0.0715], base: 0.0655 },
  { id: 'bat-neg', part: 'battery', partName: 'Pin', label: 'Cực âm (−)', desc: 'Đường về của dòng điện, mức 0 V.', net: 'gnd', pos: [-0.075, -0.01, 0.0715], base: 0.0655 },

  { id: 'sw-in', part: 'switch', partName: 'Công tắc nguồn', label: 'Vào', desc: 'Nhận điện từ pin.', net: 'bat', pos: [-0.09, 0.0335, DECK + 0.012], base: DECK + 0.004 },
  { id: 'sw-out', part: 'switch', partName: 'Công tắc nguồn', label: 'Ra', desc: 'Đưa điện ra các mạch khi công tắc bật.', net: 'vsw', pos: [-0.09, 0.0565, DECK + 0.012], base: DECK + 0.004 },

  { id: 'reg-in', part: 'regulator', partName: 'Mạch ổn áp 5 V', label: 'VIN (vào)', desc: 'Nhận điện áp pin (đã qua công tắc) để đổi thành 5 V.', net: 'vsw', pos: [-0.0395, -0.045, DECK + 0.0111], base: DECK + 0.0051 },
  { id: 'reg-out', part: 'regulator', partName: 'Mạch ổn áp 5 V', label: '5 V (ra)', desc: 'Đầu ra 5 V ổn định.', net: 'v5', pos: [-0.0205, -0.045, DECK + 0.0111], base: DECK + 0.0051 },
  { id: 'reg-gnd', part: 'regulator', partName: 'Mạch ổn áp 5 V', label: 'GND', desc: 'Chân nối đất của mạch.', net: 'gnd', pos: [-0.03, -0.0325, DECK + 0.0111], base: DECK + 0.0051 },

  ...driverPins('l'),
  ...driverPins('r'),

  { id: 'esp-5v', part: 'controller', partName: 'Mạch điều khiển (ESP32)', label: '5V', desc: 'Chân cấp nguồn cho cả bo mạch.', net: 'v5', pos: [0.026, -0.0075, 0.0599], base: 0.0539 },
  { id: 'esp-gnd', part: 'controller', partName: 'Mạch điều khiển (ESP32)', label: 'GND', desc: 'Chân nối đất của bo mạch.', net: 'gnd', pos: [0.026, 0.0075, 0.0599], base: 0.0539 },
  { id: 'esp-pwml', part: 'controller', partName: 'Mạch điều khiển (ESP32)', label: 'PWM trái', desc: 'Tín hiệu điều khiển tốc độ bánh trái, đi tới mạch điều khiển motor trái.', net: 'pwml', pos: [0.012, 0.0075, 0.0599], base: 0.0539 },
  { id: 'esp-pwmr', part: 'controller', partName: 'Mạch điều khiển (ESP32)', label: 'PWM phải', desc: 'Tín hiệu điều khiển tốc độ bánh phải, đi tới mạch điều khiển motor phải.', net: 'pwmr', pos: [0.012, -0.0075, 0.0599], base: 0.0539 },
  { id: 'esp-sens', part: 'controller', partName: 'Mạch điều khiển (ESP32)', label: 'Đầu vào cảm biến', desc: 'Nhận tín hiệu năm mắt dò vạch.', net: 'sens', pos: [0.047, 0, 0.0599], base: 0.0539 },

  { id: 'sen-vcc', part: 'sensors', partName: 'Cảm biến dò vạch', label: 'VCC', desc: 'Cấp nguồn cho các mắt hồng ngoại.', net: 'v5', pos: [0.0585, 0.014, 0.056], base: 0.0495 },
  { id: 'sen-gnd', part: 'sensors', partName: 'Cảm biến dò vạch', label: 'GND', desc: 'Chân nối đất của cảm biến.', net: 'gnd', pos: [0.0585, -0.014, 0.056], base: 0.0495 },
  { id: 'sen-sig', part: 'sensors', partName: 'Cảm biến dò vạch', label: 'Tín hiệu', desc: 'Báo mắt nào đang thấy vạch đen.', net: 'sens', pos: [0.0585, 0, 0.056], base: 0.0495 },

  { id: 'mot-l', part: 'motors', partName: 'Hai motor giảm tốc', label: 'Motor trái', desc: 'Dây cấp điện của motor bánh trái.', net: 'ml', pos: [-0.045, 0.0417, 0.0535], base: 0.0437 },
  { id: 'mot-r', part: 'motors', partName: 'Hai motor giảm tốc', label: 'Motor phải', desc: 'Dây cấp điện của motor bánh phải.', net: 'mr', pos: [-0.045, -0.0417, 0.0535], base: 0.0437 },
];

const isPower = (n: string) => n === 'bat' || n === 'vsw';
const isSignal = (n: string) => n === 'pwml' || n === 'pwmr' || n === 'sens';
const isMotorOut = (n: string) => n === 'ml' || n === 'mr';

/** Lý do khi hai chân thuộc hai mạch khác nhau bị nối. */
function mismatch(ta: Terminal, tb: Terminal): string {
  const na = ta.net as NetId;
  const nb = tb.net as NetId;
  const pair = (x: NetId, y: NetId) => (na === x && nb === y) || (na === y && nb === x);
  if (ta.part === 'switch' && tb.part === 'switch') {
    return 'Nối tắt hai chân của công tắc: điện chạy thẳng qua, công tắc mất tác dụng và không tắt được xe.';
  }
  if (pair('bat', 'vsw')) {
    return 'Điện đang bỏ qua công tắc. Xe sẽ không có cách ngắt điện, nên mọi dây dương phải đi qua công tắc trước.';
  }
  if ((isPower(na) && nb === 'v5') || (isPower(nb) && na === 'v5')) {
    return 'Điện áp pin đi thẳng vào đường 5 V mà bỏ qua mạch ổn áp. Pin 2 cell trở lên (7,4 V) sẽ làm mạch điều khiển và cảm biến quá áp, có thể hỏng.';
  }
  if (na === 'gnd' || nb === 'gnd') {
    const other = na === 'gnd' ? nb : na;
    if (isPower(other) || other === 'v5') return 'Nối đường điện với GND là chập mạch: pin bị nối tắt, dây nóng lên và điện áp sụt mạnh.';
    if (isSignal(other)) return 'Nối tín hiệu xuống GND giữ nó ở 0 V, mạch sẽ không nhận được lệnh hoặc không đọc được cảm biến.';
    return 'Nối dây ra motor xuống GND làm motor bị chập, mạch điều khiển motor có thể hỏng.';
  }
  if ((isSignal(na) && (isPower(nb) || nb === 'v5')) || (isSignal(nb) && (isPower(na) || na === 'v5'))) {
    return 'Đưa điện áp nguồn vào chân tín hiệu có thể làm hỏng chân vi điều khiển, vì ESP32 chỉ chịu được 3,3 V ở chân tín hiệu.';
  }
  if (isSignal(na) && isSignal(nb)) {
    return 'Hai tín hiệu khác nhau bị nối chung nên xe nhận lệnh lẫn lộn giữa bánh trái, bánh phải và cảm biến.';
  }
  if (isMotorOut(na) && isMotorOut(nb)) {
    return 'Hai dây motor đang nối với nhau: hai mạch điều khiển motor đẩy dòng ngược nhau, rất dễ hỏng. Mỗi motor chỉ nối với mạch điều khiển của nó.';
  }
  if (isMotorOut(na) || isMotorOut(nb)) {
    return 'Dây ra motor chỉ nối giữa mạch điều khiển motor và motor tương ứng, không nối với phần khác của mạch.';
  }
  return 'Hai chân này không nên nối với nhau.';
}

export const CAR_WIRING = createWiring({ exercise: 'Đi dây cho xe dò vạch', nets: NETS, terminals: TERMINALS, mismatch });

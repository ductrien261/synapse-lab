/**
 * Đi dây cho hệ thống tưới cây thông minh: chân của từng linh kiện và các mạch cần nối (bộ máy kiểm tra ở wiring.ts).
 * Vị trí chân là tọa độ của cảnh 3D (mét).
 */
import { createWiring, type NetDef, type Terminal } from './wiring';

const NETS: NetDef[] = [
  { id: 'v33', name: 'Nguồn 3,3 V cho cảm biến', color: '#EA580C', done: 'Cảm biến được cấp 3,3 V, nên tín hiệu analog của nó không vượt quá mức mà ADC của ESP32 chịu được.' },
  { id: 'v5', name: 'Nguồn 5 V cho rơ-le và bơm', color: '#D97706', done: 'Chân 5 V của ESP32 (lấy từ cổng USB) nuôi cuộn dây rơ-le và cũng là nguồn đưa tới bơm khi rơ-le đóng.' },
  { id: 'gnd', name: 'Đường nối đất (GND) chung', color: '#1F2937', done: 'Mọi linh kiện dùng chung mức 0 V làm mốc, để tín hiệu và dòng điện có đường về.' },
  { id: 'sense', name: 'Tín hiệu độ ẩm về ESP32', color: '#059669', done: 'Điện áp analog của cảm biến đi vào chân ADC, ESP32 đổi nó thành số để so với ngưỡng.' },
  { id: 'ctrl', name: 'Lệnh bật tắt bơm', color: '#2563EB', done: 'Chân GPIO của ESP32 điều khiển rơ-le. Chân này chỉ cấp được dòng rất nhỏ nên không thể nuôi bơm trực tiếp.' },
  { id: 'pump', name: 'Điện cấp cho bơm', color: '#DB2777', done: 'Khi rơ-le đóng, 5 V từ tiếp điểm đi qua tới bơm nên bơm chạy. Rơ-le đóng vai trò công tắc do ESP32 điều khiển.' },
];

const T = 0.0154;
const RT = 0.0315;

const TERMINALS: Terminal[] = [
  { id: 'soil-vcc', part: 'sensor', partName: 'Cảm biến độ ẩm đất', label: 'VCC', desc: 'Chân cấp nguồn cho cảm biến. Cảm biến chịu 3,3 V đến 5 V.', net: 'v33', pos: [-0.144, 0.1085, 0], base: 0.1017 },
  { id: 'soil-aout', part: 'sensor', partName: 'Cảm biến độ ẩm đất', label: 'AOUT (tín hiệu)', desc: 'Điện áp analog thay đổi theo độ ẩm của đất.', net: 'sense', pos: [-0.132, 0.1085, 0], base: 0.1017 },
  { id: 'soil-gnd', part: 'sensor', partName: 'Cảm biến độ ẩm đất', label: 'GND', desc: 'Chân nối đất của cảm biến.', net: 'gnd', pos: [-0.12, 0.1085, 0], base: 0.1017 },

  { id: 'esp-3v3', part: 'mcu', partName: 'Vi điều khiển ESP32', label: '3V3', desc: 'Đầu ra 3,3 V do bo mạch tạo ra, dùng nuôi các cảm biến nhỏ.', net: 'v33', pos: [-0.019, T, -0.006], base: 0.0094 },
  { id: 'esp-gnd', part: 'mcu', partName: 'Vi điều khiển ESP32', label: 'GND', desc: 'Chân nối đất của bo mạch.', net: 'gnd', pos: [-0.006, T, -0.006], base: 0.0094 },
  { id: 'esp-5v', part: 'mcu', partName: 'Vi điều khiển ESP32', label: '5V', desc: 'Đầu ra 5 V lấy từ cổng USB cấp nguồn cho bo mạch.', net: 'v5', pos: [0.008, T, -0.006], base: 0.0094 },
  { id: 'esp-adc', part: 'mcu', partName: 'Vi điều khiển ESP32', label: 'ADC (đọc analog)', desc: 'Chân đọc điện áp analog, chỉ chịu tối đa 3,3 V.', net: 'sense', pos: [-0.019, T, 0.006], base: 0.0094 },
  { id: 'esp-gpio', part: 'mcu', partName: 'Vi điều khiển ESP32', label: 'GPIO (xuất lệnh)', desc: 'Chân xuất tín hiệu bật tắt mức 3,3 V, chỉ cấp được dòng vài chục mA.', net: 'ctrl', pos: [0.008, T, 0.006], base: 0.0094 },

  { id: 'rly-vcc', part: 'relay', partName: 'Rơ-le', label: 'VCC', desc: 'Cấp nguồn 5 V nuôi cuộn dây của rơ-le.', net: 'v5', pos: [-0.01, RT, 0.056], base: 0.0255 },
  { id: 'rly-gnd', part: 'relay', partName: 'Rơ-le', label: 'GND', desc: 'Chân nối đất của mạch rơ-le.', net: 'gnd', pos: [-0.01, RT, 0.068], base: 0.0255 },
  { id: 'rly-in', part: 'relay', partName: 'Rơ-le', label: 'IN (lệnh)', desc: 'Nhận lệnh bật tắt từ vi điều khiển.', net: 'ctrl', pos: [-0.022, RT, 0.062], base: 0.0255 },
  { id: 'rly-com', part: 'relay', partName: 'Rơ-le', label: 'COM (chung)', desc: 'Đầu chung của tiếp điểm: nhận điện cần đóng ngắt (5 V).', net: 'v5', pos: [0.014, RT, 0.056], base: 0.0255 },
  { id: 'rly-no', part: 'relay', partName: 'Rơ-le', label: 'NO (thường hở)', desc: 'Tiếp điểm hở khi rơ-le nghỉ, nối với COM khi rơ-le được cấp lệnh.', net: 'pump', pos: [0.014, RT, 0.068], base: 0.0255 },

  { id: 'pump-pos', part: 'pump', partName: 'Bơm nước mini', label: 'Dây dương (+)', desc: 'Nhận điện từ tiếp điểm của rơ-le.', net: 'pump', pos: [0.096, 0.0125, 0.079], base: 0.0045 },
  { id: 'pump-neg', part: 'pump', partName: 'Bơm nước mini', label: 'Dây âm (−)', desc: 'Đường về của dòng điện qua bơm, mức 0 V.', net: 'gnd', pos: [0.108, 0.0125, 0.079], base: 0.0045 },
];

const isSignal = (n: string) => n === 'sense' || n === 'ctrl';

/** Lý do khi hai chân thuộc hai mạch khác nhau bị nối. */
function mismatch(a: Terminal, b: Terminal): string {
  const na = a.net;
  const nb = b.net;
  const pair = (x: string, y: string) => (na === x && nb === y) || (na === y && nb === x);
  const has = (id: string) => a.id === id || b.id === id;
  if (a.part === 'relay' && b.part === 'relay' && pair('v5', 'pump') && has('rly-com') && has('rly-no')) {
    return 'Nối thẳng COM với NO là bỏ qua rơ-le: bơm sẽ chạy liên tục và ESP32 không điều khiển được nữa.';
  }
  if (pair('v33', 'v5')) {
    return 'Nối 3,3 V với 5 V làm hai nguồn đẩy dòng vào nhau, chân 3,3 V của ESP32 có thể hỏng.';
  }
  if (pair('v33', 'sense') && has('soil-vcc')) {
    return 'Đưa nguồn vào chân tín hiệu cảm biến làm sai số đo và có thể phá hỏng cảm biến.';
  }
  if (na === 'gnd' || nb === 'gnd') {
    const other = na === 'gnd' ? nb : na;
    if (isSignal(other)) return 'Nối tín hiệu xuống GND giữ nó ở 0 V, ESP32 sẽ luôn đọc ra "rất ẩm" hoặc không ra được lệnh bật bơm.';
    return 'Nối đường điện với GND là chập mạch: nguồn USB bị nối tắt, bo mạch có thể tự ngắt hoặc nóng lên.';
  }
  if (pair('ctrl', 'pump')) {
    return 'Chân GPIO chỉ cấp được khoảng 12 mA mà bơm cần hàng trăm mA: chân sẽ quá tải và hỏng. Phải dùng rơ-le làm công tắc cho bơm.';
  }
  if (pair('pump', 'v5')) {
    return 'Bơm nối thẳng vào 5 V sẽ chạy liên tục, không qua rơ-le nên ESP32 không điều khiển được. Điện tới bơm phải đi qua tiếp điểm rơ-le.';
  }
  if (pair('sense', 'v5') || pair('sense', 'v33')) {
    return 'Đưa điện áp nguồn vào chân đọc analog có thể vượt quá 3,3 V mà ADC của ESP32 chịu được và làm hỏng nó.';
  }
  if (pair('ctrl', 'v5') || pair('ctrl', 'v33')) {
    return 'Chân điều khiển rơ-le phải nhận tín hiệu từ GPIO của ESP32, không nối với đường nguồn.';
  }
  if (pair('sense', 'ctrl')) {
    return 'Hai tín hiệu khác nhau bị nối chung nên ESP32 vừa đọc cảm biến vừa ra lệnh trên cùng một dây, kết quả lẫn lộn.';
  }
  if (pair('pump', 'v33')) {
    return 'Bơm cần dòng lớn, chân 3,3 V của ESP32 không đủ sức nuôi nó.';
  }
  return 'Hai chân này không nên nối với nhau.';
}

export const IOT_WIRING = createWiring({ exercise: 'Đi dây cho hệ thống tưới cây', nets: NETS, terminals: TERMINALS, mismatch });

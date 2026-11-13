/**
 * Đi dây cho cánh tay robot SO-101: bộ nguồn, máy tính, bo mạch điều khiển servo và chuỗi sáu servo nối tiếp nhau.
 * Vị trí chấm của bộ nguồn, bo mạch và máy tính là cố định trong cảnh; vị trí các servo lấy từ mô hình 3D lúc chạy.
 */
import { PARTS } from './arm-spec';
import { createWiring, type NetDef, type Terminal } from './wiring';

/** Vị trí các thiết bị ngoài cánh tay trong cảnh 3D (mét) */
export const ARM_DEVICES = {
  psu: { center: [-0.3, 0.02, 0.1] as [number, number, number], size: [0.07, 0.04, 0.05] as [number, number, number], color: '#475569', name: 'Bộ nguồn 12 V' },
  board: { center: [-0.2, 0.006, 0] as [number, number, number], size: [0.07, 0.012, 0.05] as [number, number, number], color: '#0F8A6B', name: 'Bo mạch điều khiển servo' },
  pc: { center: [-0.3, 0.02, -0.1] as [number, number, number], size: [0.08, 0.04, 0.06] as [number, number, number], color: '#1E3F82', name: 'Máy tính' },
};

const NETS: NetDef[] = [
  { id: 'psu', name: 'Nguồn điện cho bo mạch', color: '#DC2626', done: 'Bộ nguồn cấp điện cho bo mạch điều khiển servo. Bo mạch sẽ phân phối điện này đi cùng tín hiệu tới cả chuỗi servo.' },
  { id: 'usb', name: 'Lệnh từ máy tính', color: '#2563EB', done: 'Máy tính gửi lệnh góc qua cáp USB tới bo mạch. USB chỉ truyền tín hiệu, không cấp điện cho servo.' },
  { id: 'chain', name: 'Chuỗi nối tiếp các servo', color: '#059669', done: 'Các servo nối tiếp nhau bằng cáp ba dây (nguồn, GND, tín hiệu). Mỗi servo có địa chỉ riêng nên bo mạch ra lệnh cho từng khớp qua cùng một đường truyền.' },
];

const servoName = (i: number) => `Servo ${i + 1} (${PARTS[i].name})`;

const TERMINALS: Terminal[] = [
  { id: 'psu-out', part: 'psu', partName: ARM_DEVICES.psu.name, label: 'Đầu ra 12 V', desc: 'Cấp điện một chiều cho bo mạch điều khiển.', net: 'psu' },
  { id: 'pc-usb', part: 'pc', partName: ARM_DEVICES.pc.name, label: 'Cổng USB', desc: 'Gửi lệnh điều khiển xuống bo mạch.', net: 'usb' },
  { id: 'board-psu', part: 'board', partName: ARM_DEVICES.board.name, label: 'Cổng nguồn', desc: 'Nhận điện từ bộ nguồn.', net: 'psu' },
  { id: 'board-usb', part: 'board', partName: ARM_DEVICES.board.name, label: 'Cổng USB', desc: 'Nhận lệnh từ máy tính.', net: 'usb' },
  { id: 'board-port', part: 'board', partName: ARM_DEVICES.board.name, label: 'Cổng servo', desc: 'Đầu ra cáp ba dây (nguồn, GND, tín hiệu) tới chuỗi servo.', net: 'chain' },
  ...PARTS.flatMap((_, i): Terminal[] => {
    const inT: Terminal = { id: `s${i + 1}-in`, part: `servo${i + 1}`, partName: servoName(i), label: i === 0 ? 'Cổng vào' : 'Cổng vào (từ servo trước)', desc: i === 0 ? 'Nhận cáp từ bo mạch.' : 'Nhận cáp từ servo đứng trước trong chuỗi.', net: 'chain' };
    if (i === PARTS.length - 1) return [{ ...inT, desc: 'Servo cuối chuỗi, chỉ cần một cổng vào.' }];
    return [inT, { id: `s${i + 1}-out`, part: `servo${i + 1}`, partName: servoName(i), label: 'Cổng ra (tới servo sau)', desc: 'Cổng thứ hai cùng thông với cổng vào, để nối tiếp servo kế bên.', net: 'chain' }];
  }),
];

/** Cổng vào và cổng ra của một servo thông sẵn với nhau bên trong. */
const INTERNAL: [string, string][] = PARTS.slice(0, -1).map((_, i) => [`s${i + 1}-in`, `s${i + 1}-out`]);

function mismatch(a: Terminal, b: Terminal): string {
  const pair = (x: string, y: string) => (a.net === x && b.net === y) || (a.net === y && b.net === x);
  if (pair('psu', 'chain')) return 'Bộ nguồn không cắm thẳng vào servo. Nguồn phải vào bo mạch điều khiển, rồi bo mạch mới đưa điện cùng tín hiệu xuống chuỗi servo.';
  if (pair('psu', 'usb')) return 'Nối bộ nguồn 12 V vào cổng USB có thể làm hỏng cả máy tính lẫn bo mạch, vì USB chỉ chịu 5 V.';
  if (pair('usb', 'chain')) return 'USB chỉ mang lệnh từ máy tính tới bo mạch và không cấp đủ điện cho servo, nên không nối thẳng vào servo.';
  return 'Hai chân này không nên nối với nhau.';
}

export const ARM_WIRING = createWiring({
  exercise: 'Đi dây cho cánh tay robot',
  nets: NETS,
  terminals: TERMINALS,
  internal: INTERNAL,
  mismatch,
  redundant: 'Hai cổng của cùng một servo đã thông sẵn với nhau bên trong, nối thêm dây giữa chúng là vô ích. Hãy nối cổng ra với servo kế tiếp.',
});

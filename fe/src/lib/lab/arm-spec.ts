/**
 * Dữ liệu mô tả cánh tay robot SO-101 (mô hình mã nguồn mở, Apache-2.0, xem fe/public/lab/so101).
 * Thứ tự PARTS cũng là thứ tự lắp ráp. Mỗi bộ phận ứng với một link trong file URDF.
 */
export type PartId = 'base' | 'turntable' | 'upper' | 'forearm' | 'wrist' | 'gripper';

export interface ArmPart {
  id: PartId;
  name: string;
  role: string;
  joint: string;
  dof: string;
  details: string[];
  color: string;
  hint: string;
  /** Tên link trong URDF */
  link: string;
  /** Khối lượng theo URDF, gam */
  massG: number;
}

export const PARTS: ArmPart[] = [
  {
    id: 'base',
    name: 'Đế và motor xoay',
    role: 'Giữ cả cánh tay đứng vững, chứa motor làm khớp 1 xoay cánh tay quanh trục dọc và bo mạch điều khiển.',
    joint: 'Cố định, không có khớp nối vào bộ phận khác',
    dof: '0 bậc tự do',
    details: ['Đế được bắt chặt xuống mặt bàn để không bị lật khi tay vươn xa.', 'Motor xoay nằm trong đế nên phần xoay phía trên không phải gánh thêm khối lượng của nó.'],
    color: '#6B7A99',
    hint: 'Đặt đế xuống trước. Mọi bộ phận khác đều gắn lên nó.',
    link: 'base_link',
    massG: 147,
  },
  {
    id: 'turntable',
    name: 'Bệ vai',
    role: 'Xoay cùng khớp 1 và mang motor của khớp vai, giúp nâng hạ cả cánh tay.',
    joint: 'Khớp 1: xoay quanh trục dọc (shoulder pan)',
    dof: '1 bậc tự do',
    details: ['Góc xoay quyết định hướng của mặt phẳng làm việc của cánh tay.', 'Bệ vai chứa motor của khớp 2 nên nó nặng hơn vẻ ngoài.'],
    color: '#3B82F6',
    hint: 'Gắn bệ vai lên đế để cánh tay có thể quay quanh trục dọc.',
    link: 'shoulder_link',
    massG: 100,
  },
  {
    id: 'upper',
    name: 'Cánh tay trên',
    role: 'Nâng hạ toàn bộ phần phía trước tại khớp vai. Đây là khớp chịu moment lớn nhất.',
    joint: 'Khớp 2: vai, xoay quanh trục ngang (shoulder lift)',
    dof: '1 bậc tự do',
    details: ['Motor vai gánh cả cánh tay, cẳng tay và vật gắp.', 'Đầu xa của đoạn này mang motor của khuỷu.'],
    color: '#1E3F82',
    hint: 'Gắn cánh tay trên vào bệ vai, tại khớp vai.',
    link: 'upper_arm_link',
    massG: 103,
  },
  {
    id: 'forearm',
    name: 'Cẳng tay',
    role: 'Gập hoặc duỗi để đổi khoảng cách từ đầu tay tới đế.',
    joint: 'Khớp 3: khuỷu (elbow flex)',
    dof: '1 bậc tự do',
    details: ['Vai và khuỷu cùng quyết định vị trí đầu tay.', 'Gập khuỷu lại giúp giảm moment lên khớp vai.'],
    color: '#4F7CCB',
    hint: 'Gắn cẳng tay vào đầu cánh tay trên, tại khớp khuỷu.',
    link: 'lower_arm_link',
    massG: 104,
  },
  {
    id: 'wrist',
    name: 'Cổ tay',
    role: 'Gập lên xuống để giữ hướng của bàn kẹp, ví dụ chúc xuống khi gắp vật.',
    joint: 'Khớp 4: gập cổ tay (wrist flex)',
    dof: '1 bậc tự do',
    details: ['Đầu tay giữ nguyên hướng dù vai và khuỷu đổi góc.', 'Nhẹ nên chịu moment nhỏ nhất trong ba khớp gập.'],
    color: '#0F8A6B',
    hint: 'Gắn cổ tay vào cuối cẳng tay.',
    link: 'wrist_link',
    massG: 79,
  },
  {
    id: 'gripper',
    name: 'Bàn kẹp',
    role: 'Xoay theo trục cánh tay và mở khép hàm để gắp vật.',
    joint: 'Khớp 5: xoay cổ tay (wrist roll) và khớp 6: kẹp',
    dof: '2 bậc tự do',
    details: ['Lực kẹp đủ giữ vật nhưng không làm hỏng vật.', 'Khối lượng bàn kẹp cộng vật gắp là tải ở đầu tay.'],
    color: '#E08A2E',
    hint: 'Bước cuối: gắn bàn kẹp vào cổ tay.',
    link: 'gripper_link',
    massG: 99,
  },
];

export type SupplyKey = 'v74' | 'v12';

/** Moment kẹt (stall) của servo STS3215: bản 7,4 V là 19,5 kg·cm, bản 12 V là 30 kg·cm. */
export const SUPPLY: Record<SupplyKey, { label: string; kgcm: number; nm: number; note: string }> = {
  v74: { label: 'Nguồn 7,4 V', kgcm: 19.5, nm: 19.5 * 0.0980665, note: 'Servo 19,5 kg·cm, phổ biến ở bộ SO-101.' },
  v12: { label: 'Nguồn 12 V', kgcm: 30, nm: 30 * 0.0980665, note: 'Servo 30 kg·cm, mạnh hơn khoảng 50%.' },
};

export interface ArmParams {
  /** Góc các khớp, độ (đúng quy ước khớp trong URDF) */
  pan: number;
  lift: number;
  elbow: number;
  flex: number;
  roll: number;
  /** Độ mở hàm kẹp, 0 đến 1 */
  grip: number;
  /** Vật đang gắp, kg */
  payload: number;
  supply: SupplyKey;
}

/** Giới hạn góc khớp lấy từ URDF, độ. */
export const LIMITS = {
  pan: [-110, 110],
  lift: [-100, 100],
  elbow: [-96.8, 96.8],
  flex: [-95, 95],
  roll: [-157.2, 162.8],
  grip: [-10, 100],
} as const;

export const DEFAULT_PARAMS: ArmParams = {
  pan: 0,
  lift: -35,
  elbow: 65,
  flex: 35,
  roll: 0,
  grip: 0.3,
  payload: 0.05,
  supply: 'v74',
};

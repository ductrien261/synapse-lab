/**
 * Danh mục Phòng thí nghiệm. Muốn thêm môn (Vật lý, Hóa học...) hoặc bài mới,
 * chỉ cần thêm một khối vào LAB_FIELDS; giao diện tự hiển thị.
 */
export type LabArtKey = 'arm' | 'car' | 'iot' | 'generic';

export interface LabExperiment {
  slug: string;
  title: string;
  summary: string;
  /** Các ý chính người học sẽ thử */
  topics: string[];
  art: LabArtKey;
  status: 'ready' | 'soon';
  /** Thời lượng ước tính, tính bằng phút */
  minutes: number;
  level: 'Cơ bản' | 'Trung bình' | 'Nâng cao';
  /** guided = học theo bài, free = tự do chỉnh thử */
  modes: ('guided' | 'free')[];
}

export interface LabField {
  key: string;
  name: string;
  /** Câu mô tả ngắn, nói về điều người học làm được */
  pitch: string;
  /** Màu chủ đạo của hàng (xem TONES ở trang Lab) */
  tone: 'blue' | 'green' | 'amber' | 'violet';
  experiments: LabExperiment[];
}

export const LAB_FIELDS: LabField[] = [
  {
    key: 'robotics',
    tone: 'blue',
    name: 'Robot và cơ khí',
    pitch: 'Cho máy móc cử động theo ý bạn, rồi xem vì sao nó cử động như vậy.',
    experiments: [
      {
        slug: 'arm',
        title: 'Cánh tay robot',
        summary: 'Tìm hiểu từng bộ phận, tự lắp ráp, rồi chỉnh thông số và xem moment động cơ.',
        topics: ['Bộ phận và chức năng', 'Lắp ráp từng bước', 'Động học và moment'],
        art: 'arm',
        status: 'ready',
        minutes: 25,
        level: 'Cơ bản',
        modes: ['guided', 'free'],
      },
      {
        slug: 'car',
        title: 'Xe tự hành bám vạch',
        summary: 'Chỉnh bánh xe, cảm biến và bộ điều khiển để xe chạy ổn định.',
        topics: ['Bánh xe vi sai', 'Cảm biến dò line', 'Bộ điều khiển PID'],
        art: 'car',
        status: 'ready',
        minutes: 30,
        level: 'Trung bình',
        modes: ['guided', 'free'],
      },
    ],
  },
  {
    key: 'electronics',
    tone: 'amber',
    name: 'Điện tử và IoT',
    pitch: 'Theo dõi dữ liệu đi từ cảm biến tới màn hình, từng chặng một.',
    experiments: [
      {
        slug: 'iot',
        title: 'Hệ thống tưới cây thông minh',
        summary: 'Cảm biến đo độ ẩm, vi điều khiển quyết định, bảng điều khiển hiển thị.',
        topics: ['Cảm biến', 'Vi điều khiển', 'Mạng và bảng điều khiển'],
        art: 'iot',
        status: 'ready',
        minutes: 15,
        level: 'Cơ bản',
        modes: ['guided'],
      },
    ],
  },
  {
    key: 'physics',
    tone: 'green',
    name: 'Vật lý',
    pitch: 'Thay đổi lực, khối lượng, góc và quan sát chuyển động.',
    experiments: [],
  },
  {
    key: 'chemistry',
    tone: 'violet',
    name: 'Hóa học',
    pitch: 'Trộn, đun, đo và thấy phản ứng diễn ra mà không cần hóa chất.',
    experiments: [],
  },
];

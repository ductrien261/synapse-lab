// ============================================================
// Nội dung trang giới thiệu (landing + các trang con).
// Thêm lĩnh vực / tính năng mới: chỉ cần thêm một mục vào danh sách bên dưới.
// ============================================================

export const SITE = {
  name: 'Synapse Lab',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3100').replace(/\/$/, ''),
  tagline: 'Nền tảng học tập trực quan tích hợp AI',
  description:
    'Synapse Lab là nền tảng học tập trực quan và tương tác: mô hình 3D, mô phỏng từng bước và trợ lý AI có dẫn nguồn giúp người học hiểu bản chất kiến thức.',
  /** Email liên hệ hiển thị công khai. Để trống thì ẩn khối liên hệ qua email. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
};

export const NAV = [
  { href: '/', label: 'Nền tảng' },
  { href: '/about', label: 'Giới thiệu' },
  { href: '/sources', label: 'Nguồn tri thức' },
  { href: '/library', label: 'Kho học liệu' },
];

export type CapabilityKey = 'visual-3d' | 'simulation' | 'assistant' | 'review' | 'profile' | 'spaces';

export interface Capability {
  key: CapabilityKey;
  anchor: string;
  title: string;
  summary: string;
  points: string[];
  /** Nơi xem thêm / dùng thử tính năng */
  href?: string;
  soon?: boolean;
}

export const CAPABILITIES: Capability[] = [
  {
    key: 'visual-3d',
    anchor: '3d-visualization',
    href: '/library',
    title: 'Trực quan hóa 3D',
    summary: 'Khám phá cấu trúc phức tạp trên mô hình ba chiều: xoay, phóng to và chọn từng thành phần để xem giải thích chi tiết.',
    points: [
      'Mô hình có chú thích theo từng thành phần',
      'Giải thích song ngữ Việt – Anh kèm trích dẫn',
      'Ghi chú cá nhân gắn trực tiếp lên mô hình',
    ],
  },
  {
    key: 'simulation',
    anchor: 'simulation',
    href: '/library?tab=algorithms',
    title: 'Mô phỏng từng bước',
    summary: 'Quan sát một quá trình diễn ra theo từng bước, điều khiển tốc độ, tua lại và đối chiếu với mã nguồn hoặc lý thuyết tương ứng.',
    points: ['Điều khiển phát, tạm dừng, tua từng bước', 'Đồng bộ trạng thái với mã nguồn', 'Diễn giải bằng tiếng Việt ở mỗi bước'],
  },
  {
    key: 'assistant',
    anchor: 'ai-assistant',
    href: '/sources#ai',
    title: 'Trợ lý AI có dẫn nguồn',
    summary: 'Đặt câu hỏi ngay trong ngữ cảnh đang học. Câu trả lời được tổng hợp từ học liệu đã kiểm duyệt và đánh số trích dẫn.',
    points: ['Hiểu ngữ cảnh bạn đang xem', 'Trích dẫn tới mục cụ thể trong học liệu', 'Thông báo rõ khi nguồn chưa có thông tin'],
  },
  {
    key: 'review',
    anchor: 'adaptive-review',
    href: '/register',
    title: 'Ôn tập thích ứng',
    summary: 'Lịch ôn tập riêng cho từng khái niệm theo phương pháp lặp lại ngắt quãng, ưu tiên nội dung bạn dễ quên hoặc hay nhầm lẫn.',
    points: ['Khoảng cách ôn tăng dần từ 10 phút đến 16 ngày', 'Câu hỏi đa dạng: nhận diện, trắc nghiệm, tình huống', 'Ghi nhận và sửa các lỗi nhầm lẫn thường gặp'],
  },
  {
    key: 'profile',
    anchor: 'learning-profile',
    href: '/register',
    title: 'Hồ sơ học tập minh bạch',
    summary: 'Theo dõi mức độ nắm vững, điểm cần cải thiện và mục tiêu học tập. Bạn xem và chỉnh sửa được mọi điều hệ thống ghi nhận về mình.',
    points: ['Mức độ nắm vững theo từng khái niệm', 'Mục tiêu và ghi chú do bạn tự đặt', 'Xóa hoặc đặt lại dữ liệu bất cứ lúc nào'],
  },
  {
    key: 'spaces',
    anchor: 'spaces',
    title: 'Không gian cộng tác',
    summary: 'Tạo không gian học nhóm, thảo luận hoặc thuyết trình; thành viên tham gia bằng mã mời.',
    points: ['Học nhóm theo thời gian thực', 'Tham gia nhanh bằng mã mời', 'Phù hợp cho lớp học và nhóm nghiên cứu'],
    soon: true,
  },
];

export interface Domain {
  key: string;
  field: string;
  title: string;
  summary: string;
  highlights: string[];
  href: string;
  cta: string;
  status: 'live' | 'soon';
}

export const DOMAINS: Domain[] = [
  {
    key: 'anatomy',
    field: 'Y sinh',
    title: 'Giải phẫu học người',
    summary:
      'Mô hình 3D có chú thích theo hệ cơ quan, nội dung tiếng Việt đối chiếu thuật ngữ quốc tế và trích dẫn giáo trình.',
    highlights: ['Duyệt theo hệ cơ quan', 'Giải thích song ngữ Việt – Anh', 'Ôn tập nhận diện trên mô hình'],
    href: '/library',
    cta: 'Khám phá thư viện mô hình',
    status: 'live',
  },
  {
    key: 'algorithms',
    field: 'Khoa học máy tính',
    title: 'Giải thuật & Cấu trúc dữ liệu',
    summary: 'Mô phỏng trực quan các nhóm giải thuật kinh điển, đồng bộ từng bước với mã nguồn và phần diễn giải.',
    highlights: ['Chia để trị, quy hoạch động, tham lam', 'Quay lui, nhánh cận, đệ quy', 'Mã nguồn tô sáng theo từng bước'],
    href: '/library?tab=algorithms',
    cta: 'Mở thư viện giải thuật',
    status: 'live',
  },
];

export const SOURCES = [
  {
    name: 'OpenStax',
    role: 'Giáo trình',
    license: 'CC BY 4.0',
    description: 'Giáo trình đại học có giấy phép mở của Đại học Rice, nền tảng cho phần giải thích và câu trả lời của trợ lý AI.',
    url: 'https://openstax.org',
  },
  {
    name: 'AnatomyTOOL',
    role: 'Thư viện học liệu giải phẫu',
    license: 'Giấy phép mở theo từng học liệu',
    description: 'Thư viện học liệu giải phẫu mở do các trường đại học châu Âu đóng góp, nguồn tuyển chọn mô hình 3D.',
    url: 'https://anatomytool.org',
  },
  {
    name: 'Sketchfab',
    role: 'Hiển thị mô hình 3D',
    license: 'Theo từng mô hình',
    description: 'Nền tảng hiển thị mô hình 3D. Tác giả và giấy phép được ghi trên từng mô hình.',
    url: 'https://sketchfab.com',
  },
];

export const FAQS = [
  {
    q: 'Synapse Lab là gì?',
    a: 'Synapse Lab là nền tảng học tập trực quan và tương tác, kết hợp mô hình 3D, mô phỏng từng bước và trợ lý AI có dẫn nguồn, giúp người học hiểu bản chất kiến thức thay vì ghi nhớ máy móc.',
  },
  {
    q: 'Synapse Lab có miễn phí không?',
    a: 'Có. Các tính năng hiện tại được cung cấp miễn phí; trợ lý AI áp dụng hạn mức sử dụng hằng ngày cho mỗi tài khoản để đảm bảo chất lượng dịch vụ.',
  },
  {
    q: 'Tôi có cần tạo tài khoản để sử dụng không?',
    a: 'Không bắt buộc. Bạn có thể khám phá mô hình 3D và mô phỏng giải thuật ngay. Tài khoản miễn phí cần cho trợ lý AI, ôn tập và ghi chú cá nhân.',
  },
  {
    q: 'Nội dung trên Synapse Lab được lấy từ đâu?',
    a: 'Từ học liệu có giấy phép mở như giáo trình OpenStax và thư viện mô hình AnatomyTOOL, Sketchfab. Nội dung giải thích được đối chiếu nguồn và kiểm duyệt trước khi xuất bản.',
  },
  {
    q: 'Trợ lý AI có thể trả lời sai không?',
    a: 'Không hệ thống AI nào chính xác tuyệt đối. Vì vậy trợ lý chỉ trả lời dựa trên học liệu đã kiểm duyệt, luôn kèm trích dẫn để đối chiếu và thông báo rõ khi nguồn chưa có thông tin.',
  },
  {
    q: 'Synapse Lab phù hợp với ai?',
    a: 'Sinh viên, người tự học và giảng viên cần một công cụ trực quan để học, ôn tập hoặc minh họa bài giảng. Hiện nền tảng hỗ trợ lĩnh vực y sinh và khoa học máy tính.',
  },
];

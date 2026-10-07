import type { ComponentType } from 'react';
import { BookHalf, Easel2Fill, PeopleFill, PersonVideo3 } from 'react-bootstrap-icons';

export type SpacePurpose = 'study' | 'group' | 'presentation' | 'teaching';

export interface SpaceTemplate {
  id: SpacePurpose;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  iconTone: string;
}

export interface SpaceSummary {
  code: string;
  name: string;
  purpose: SpacePurpose;
  purposeLabel: string;
  updatedAt: string;
  participants: number;
  materials: number;
  live?: boolean;
  progress?: number;
}

export const SPACE_TEMPLATES: SpaceTemplate[] = [
  {
    id: 'study',
    title: 'Tự học tập trung',
    description: 'Sắp xếp tài liệu, ghi chú và tự kiểm tra trong một phiên học riêng.',
    icon: BookHalf,
    tone: 'bg-[#EEF4FF] border-[#D9E6FA]',
    iconTone: 'bg-[#DDE9FB] text-[#1E3F82]',
  },
  {
    id: 'group',
    title: 'Học nhóm',
    description: 'Mời bạn bè, cùng thảo luận và hoàn thành hoạt động theo thời gian thực.',
    icon: PeopleFill,
    tone: 'bg-[#EEF9F5] border-[#D8EEE5]',
    iconTone: 'bg-[#D8F0E5] text-emerald-700',
  },
  {
    id: 'presentation',
    title: 'Mock presentation',
    description: 'Tập thuyết trình, bấm giờ và nhận phản hồi ngay sau mỗi phần.',
    icon: Easel2Fill,
    tone: 'bg-[#FFF7EA] border-[#F3E4C8]',
    iconTone: 'bg-[#F8E8C9] text-amber-700',
  },
  {
    id: 'teaching',
    title: 'Buổi hướng dẫn',
    description: 'Trình bày nội dung, đặt câu hỏi và theo dõi mức độ hiểu của người tham gia.',
    icon: PersonVideo3,
    tone: 'bg-[#F7F1FF] border-[#E8DCF8]',
    iconTone: 'bg-[#E9DDF8] text-violet-700',
  },
];

export const RECENT_SPACES: SpaceSummary[] = [
  {
    code: 'BFS204',
    name: 'Ôn tập BFS & DFS',
    purpose: 'group',
    purposeLabel: 'Học nhóm',
    updatedAt: 'Vừa xong',
    participants: 6,
    materials: 4,
    live: true,
    progress: 58,
  },
  {
    code: 'MED312',
    name: 'Mock present: Hệ tuần hoàn',
    purpose: 'presentation',
    purposeLabel: 'Mock presentation',
    updatedAt: 'Hôm qua',
    participants: 4,
    materials: 7,
    progress: 75,
  },
  {
    code: 'QUIZ08',
    name: 'Tự ôn cấu trúc dữ liệu',
    purpose: 'study',
    purposeLabel: 'Tự học',
    updatedAt: '3 ngày trước',
    participants: 1,
    materials: 5,
    progress: 32,
  },
];

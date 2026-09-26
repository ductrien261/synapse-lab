import { request } from './api';

export type FeedbackKind = 'bug' | 'content' | 'idea' | 'other';
export type FeedbackStatus = 'new' | 'in_progress' | 'done' | 'dismissed';

export const FEEDBACK_KINDS: { key: FeedbackKind; label: string }[] = [
  { key: 'bug', label: 'Báo lỗi' },
  { key: 'content', label: 'Nội dung chưa đúng' },
  { key: 'idea', label: 'Đề xuất' },
  { key: 'other', label: 'Khác' },
];

export const FEEDBACK_STATUS: Record<FeedbackStatus, string> = {
  new: 'Mới',
  in_progress: 'Đang xử lý',
  done: 'Đã xử lý',
  dismissed: 'Bỏ qua',
};

export interface FeedbackItem {
  id: number;
  kind: FeedbackKind;
  message: string;
  email: string;
  user_name: string;
  is_guest: boolean;
  page_url: string;
  status: FeedbackStatus;
  admin_note: string;
  created_at: string;
}

export interface RatedAnswer {
  id: number;
  value: 1 | -1;
  note: string;
  reviewed: boolean;
  question: string;
  answer: string;
  status: string;
  from_cache: boolean;
  citations: { n: number; heading?: string; document_title?: string; url?: string }[];
  model: { uid: string; title: string } | null;
  user_email: string;
  created_at: string;
}

export interface ReportedQuiz {
  id: number;
  kind: string;
  question: string;
  options: string[];
  correct_index: number | null;
  explanation: string;
  status: 'active' | 'review' | 'disabled';
  reports: number;
  served: number;
  correct_count: number;
  structure: { id: number; name: string };
  created_at: string;
}

export interface QualitySummary {
  feedback_new: number;
  answers_down_open: number;
  answers_up: number;
  answers_down: number;
  quiz_open: number;
}

const BASE = '/feedback';

export const feedbackApi = {
  submit: (data: { kind: FeedbackKind; message: string; email?: string; page_url?: string }) =>
    request<{ ok: boolean }>(`${BASE}/`, { method: 'POST', body: JSON.stringify(data) }),
};

export const qualityApi = {
  summary: () => request<QualitySummary>(`${BASE}/admin/summary/`),
  feedback: (query: { status?: string; kind?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]).toString();
    return request<{ counts: Partial<Record<FeedbackStatus, number>>; results: FeedbackItem[] }>(`${BASE}/admin/${qs ? `?${qs}` : ''}`);
  },
  updateFeedback: (id: number, data: Partial<Pick<FeedbackItem, 'status' | 'admin_note'>>) =>
    request<FeedbackItem>(`${BASE}/admin/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  answers: (query: { value?: string; reviewed?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]).toString();
    return request<{ results: RatedAnswer[] }>(`${BASE}/admin/answers/${qs ? `?${qs}` : ''}`);
  },
  answerAction: (id: number, action: 'reviewed' | 'purge_cache') =>
    request<{ reviewed: boolean; purged: number }>(`${BASE}/admin/answers/${id}/`, { method: 'POST', body: JSON.stringify({ action }) }),
  quiz: () => request<{ results: ReportedQuiz[] }>(`${BASE}/admin/quiz/`),
  updateQuiz: (id: number, data: { status?: ReportedQuiz['status']; reset_reports?: boolean }) =>
    request<ReportedQuiz>(`${BASE}/admin/quiz/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ============================================================
// SYNAPSE-LAB — Hồ sơ học tập ("AI hiểu gì về bạn") + ôn tập thích ứng
// ============================================================

import { request } from './api';

export interface SourceRef {
  n: number;
  heading: string;
  excerpt: string;
  url: string;
  document_title: string;
  page_label: string;
}

export type ItemKind = 'identify' | 'mcq' | 'case' | 'short';

export const KIND_LABEL: Record<ItemKind, string> = {
  identify: 'Nhận diện trên 3D',
  mcq: 'Trắc nghiệm',
  case: 'Tình huống lâm sàng',
  short: 'Tự luận ngắn',
};

export interface PlanEntry {
  structure_id: number;
  name: string;
  kind: ItemKind;
  difficulty: number;
  reason: string;
  item_id?: number;
}

export interface ReviewSession {
  id: string;
  plan: PlanEntry[];
  position: number;
  correct: number;
  finished: boolean;
  model_uid: string | null;
}

export interface QuizItemPublic {
  id: number;
  kind: ItemKind;
  difficulty: number;
  question: string;
  options: string[];
  structure: { id: number; name_vi: string; name_en: string };
  source: 'ai' | 'template';
}

export interface AnswerResult {
  correct: boolean;
  score: number;
  correct_index: number | null;
  explanation: string;
  feedback: string;
  rubric: string[];
  hits: number[];
  misconception: string;
  citations: SourceRef[];
  mastery: { box: number; score: number; next_review_at: string | null };
  finished: boolean;
  session: ReviewSession;
}

export interface MasteryRow {
  structure_id: number;
  name_vi: string;
  name_en: string;
  box: number;
  score: number;
  attempts: number;
  correct: number;
  last_seen_at: string | null;
  next_review_at: string | null;
  models: string[];
}

export interface MisconceptionRow {
  id: number;
  text: string;
  evidence: number;
  status: 'active' | 'resolved';
  source: string;
  structure: string;
  updated_at: string;
}

export interface LearnerPreferences {
  level: string;
  style: string;
  goals: string;
  updated_at?: string;
}

export interface LearnerProfileData {
  preferences: LearnerPreferences;
  choices: { level: [string, string][]; style: [string, string][] };
  stats: { concepts: number; mastered: number; due_now: number; attempts: number; accuracy: number | null };
  mastery: MasteryRow[];
  misconceptions: MisconceptionRow[];
}

export const learnerApi = {
  profile: () => request<LearnerProfileData>('/learner/profile/'),
  updatePreferences: (data: Partial<LearnerPreferences>) =>
    request<LearnerPreferences>('/learner/profile/', { method: 'PATCH', body: JSON.stringify(data) }),
  reset: () => request<void>('/learner/profile/', { method: 'DELETE' }),
  setMisconception: (id: number, status: 'active' | 'resolved') =>
    request<{ id: number; status: string }>(`/learner/misconceptions/${id}/`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteMisconception: (id: number) => request<void>(`/learner/misconceptions/${id}/`, { method: 'DELETE' }),
  due: () => request<{ due: number; concepts: number }>('/learner/due/'),

  startReview: (modelUid: string, size = 5) =>
    request<ReviewSession>('/learner/review/start/', { method: 'POST', body: JSON.stringify({ model_uid: modelUid, size }) }),
  item: (sessionId: string) =>
    request<{ position: number; total: number; reason: string; item: QuizItemPublic }>(`/learner/review/${sessionId}/item/`, {
      method: 'POST',
      body: '{}',
    }),
  answer: (sessionId: string, itemId: number, answer: { choice?: number; picked_index?: number | null; text?: string }) =>
    request<AnswerResult>(`/learner/review/${sessionId}/answer/`, { method: 'POST', body: JSON.stringify({ item_id: itemId, answer }) }),
  report: (itemId: number) => request<{ reported: boolean }>(`/learner/items/${itemId}/report/`, { method: 'POST', body: '{}' }),
};

/** "Ôn lại sau 2 ngày" */
export function reviewIn(iso: string | null): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'đến hạn ôn';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `ôn lại sau ${minutes} phút`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `ôn lại sau ${hours} giờ`;
  return `ôn lại sau ${Math.round(hours / 24)} ngày`;
}

export const BOX_LABEL = ['Mới', 'Đang làm quen', 'Đang nhớ', 'Khá vững', 'Vững', 'Rất vững'];

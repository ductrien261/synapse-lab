// ============================================================
// SYNAPSE-LAB — Gia sư "Hỏi AI"
// ============================================================

import { request, streamRequest } from './api';

export interface TutorCitation {
  n: number;
  chunk_id: number;
  document_id: string;
  document_title: string;
  heading: string;
  url: string;
  page_label: string;
  excerpt: string;
}

export interface QuickCheck {
  question: string;
  options: string[];
  correct_index?: number;
  explanation?: string;
  answered_index?: number;
  correct?: boolean;
}

export type TutorStatus = 'ok' | 'unverified' | 'no_source' | 'error' | '';

export interface TutorMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  status: TutorStatus;
  part_index: number | null;
  citations: TutorCitation[];
  highlights: number[];
  suggestions: string[];
  from_cache: boolean;
  feedback: number | null;
  quick_check: QuickCheck | null;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

export interface AskHandlers {
  onMeta?: (conversationId: string) => void;
  onStatus?: (text: string) => void;
  onToken?: (text: string) => void;
  onReplace?: (text: string) => void;
  onDone?: (message: TutorMessage) => void;
  onError?: (message: string) => void;
}

export const tutorApi = {
  ask: (
    body: { question: string; model_uid?: string; part_index?: number | null; conversation_id?: string | null },
    h: AskHandlers,
    signal?: AbortSignal,
  ) =>
    streamRequest(
      '/tutor/ask/',
      body,
      (event, data) => {
        if (event === 'meta') h.onMeta?.(String(data.conversation_id));
        else if (event === 'status') h.onStatus?.(String(data.text ?? ''));
        else if (event === 'token') h.onToken?.(String(data.text ?? ''));
        else if (event === 'replace') h.onReplace?.(String(data.text ?? ''));
        else if (event === 'done') h.onDone?.(data as unknown as TutorMessage);
        else if (event === 'error') h.onError?.(String(data.message ?? 'Gia sư đang gặp lỗi.'));
      },
      signal,
    ),

  conversations: (modelUid: string) =>
    request<ConversationSummary[]>(`/tutor/conversations/?model=${encodeURIComponent(modelUid)}`),

  conversation: (id: string) =>
    request<{ id: string; title: string; messages: TutorMessage[] }>(`/tutor/conversations/${id}/`),

  deleteConversation: (id: string) => request<void>(`/tutor/conversations/${id}/`, { method: 'DELETE' }),

  feedback: (messageId: number, value: 1 | -1 | 0) =>
    request<{ feedback: number | null }>(`/tutor/messages/${messageId}/feedback/`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    }),

  quickCheck: (messageId: number) =>
    request<QuickCheck>(`/tutor/messages/${messageId}/quick-check/`, { method: 'POST', body: '{}' }),

  answerQuickCheck: (messageId: number, choice: number) =>
    request<QuickCheck>(`/tutor/messages/${messageId}/quick-check/answer/`, {
      method: 'POST',
      body: JSON.stringify({ choice }),
    }),
};

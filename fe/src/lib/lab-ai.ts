import { request } from './api';

export type LabAiLab = 'arm' | 'car' | 'iot';
export type LabAiMode = 'explain' | 'ask' | 'hint';

export interface LabAiResult {
  mode: LabAiMode;
  title: string;
  content: string;
  prompt_version: string;
}

/**
 * Trợ lý giải thích cho Phòng thí nghiệm. Chỉ gửi số liệu mô phỏng đã tính sẵn;
 * AI đọc và giải thích, không tự tính vật lý.
 */
export const labAiApi = {
  explain: (body: { lab: LabAiLab; mode: LabAiMode; stage?: string; state: Record<string, unknown>; question?: string }) =>
    request<LabAiResult>('/ai/lab/explain/', { method: 'POST', body: JSON.stringify(body) }),
};

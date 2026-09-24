// ============================================================
// SYNAPSE-LAB — AI: hạn mức token của tôi + API trang admin "AI & Chi phí"
// ============================================================

import { useEffect, useState } from 'react';
import { request } from './api';

export interface AiQuota {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
}

const QUOTA_EVENT = 'synapse:ai-quota';

/** Gọi sau mỗi lần dùng AI để thanh token tự cập nhật. */
export function refreshAiQuota() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(QUOTA_EVENT));
}

export function useAiQuota(): AiQuota | null {
  const [quota, setQuota] = useState<AiQuota | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      request<AiQuota>('/ai/quota/')
        .then((q) => {
          if (!cancelled) setQuota(q);
        })
        .catch(() => undefined);
    void load();
    window.addEventListener(QUOTA_EVENT, load);
    window.addEventListener('focus', load);
    return () => {
      cancelled = true;
      window.removeEventListener(QUOTA_EVENT, load);
      window.removeEventListener('focus', load);
    };
  }, []);
  return quota;
}

// ---------------- Admin ----------------

export interface AiTotals {
  requests: number;
  input_tokens: number;
  output_tokens: number;
  embed_tokens: number;
  tokens: number;
  llm_calls: number;
  cost_usd: number;
  avg_latency_ms: number;
  errors: number;
  error_rate: number;
  cached: number;
  quota_blocked: number;
}

export interface AiDaily {
  date: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface AiFeatureRow {
  feature: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  errors: number;
  cached: number;
}

export interface AiUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  requests: number;
  tokens: number;
  cost_usd: number;
  daily_limit: number;
  custom_limit: boolean;
}

export interface AiServiceHealth {
  status: string;
  llm: boolean;
  embedding: boolean;
  knowledge_db: boolean;
  langfuse: boolean;
  model: string;
}

export interface AiOverview {
  days: number;
  totals: AiTotals;
  today: AiTotals;
  daily: AiDaily[];
  by_feature: AiFeatureRow[];
  top_users: AiUserRow[];
  missing_prices: { provider: string; model: string }[];
  service: AiServiceHealth | null;
}

export interface AiUsageStep {
  step: string;
  kind: 'chat' | 'embedding';
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  status: string;
  error: string;
}

export interface AiRequestRow {
  id: number;
  user: string | null;
  user_email: string;
  feature: string;
  status: 'ok' | 'cached' | 'error' | 'quota';
  counted: boolean;
  input_tokens: number;
  output_tokens: number;
  embed_tokens: number;
  total_tokens: number;
  llm_calls: number;
  cost_usd: string;
  latency_ms: number;
  models_used: string[];
  steps: AiUsageStep[];
  trace_id: string;
  trace_url: string;
  error: string;
  created_at: string;
}

export interface AiSettings {
  default_daily_tokens: number;
  llm_judge_enabled: boolean;
  updated_at: string;
}

export interface ModelPrice {
  id: number;
  provider: string;
  model: string;
  input_per_million: string;
  output_per_million: string;
  updated_at: string;
}

export const FEATURE_LABEL: Record<string, string> = {
  translate: 'Dịch',
  search: 'Tìm giáo trình',
  draft: 'AI viết nháp',
  tutor: 'Gia sư Hỏi AI',
  quiz: 'Ôn tập',
  grade: 'Chấm bài',
  memory: 'Hồ sơ học tập',
};

const BASE = '/ai/admin';

export const adminAiApi = {
  overview: (days: number) => request<AiOverview>(`${BASE}/overview/?days=${days}`),

  requests: (query: { feature?: string; status?: string; user?: string; page?: number }) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => v && params.set(k, String(v)));
    return request<{ count: number; page: number; page_size: number; results: AiRequestRow[] }>(`${BASE}/requests/?${params.toString()}`);
  },

  settings: () => request<AiSettings>(`${BASE}/settings/`),
  updateSettings: (data: Partial<Pick<AiSettings, 'default_daily_tokens' | 'llm_judge_enabled'>>) =>
    request<AiSettings>(`${BASE}/settings/`, { method: 'PATCH', body: JSON.stringify(data) }),

  prices: () => request<ModelPrice[]>(`${BASE}/prices/`),
  createPrice: (data: Omit<ModelPrice, 'id' | 'updated_at'>) =>
    request<ModelPrice>(`${BASE}/prices/`, { method: 'POST', body: JSON.stringify(data) }),
  updatePrice: (id: number, data: Partial<Omit<ModelPrice, 'id' | 'updated_at'>>) =>
    request<ModelPrice>(`${BASE}/prices/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePrice: (id: number) => request<void>(`${BASE}/prices/${id}/`, { method: 'DELETE' }),

  setUserQuota: (userId: string, dailyTokens: number | null) =>
    request<AiQuota>(`${BASE}/users/${userId}/quota/`, { method: 'PUT', body: JSON.stringify({ daily_tokens: dailyTokens }) }),
};

export const formatTokens = (n: number) => n.toLocaleString('vi-VN');
export const formatUsd = (n: number) =>
  n === 0 ? '$0' : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ============================================================
// SYNAPSE-LAB — Django Backend API Client
// - Tự gắn access token vào mọi request
// - Access token hết hạn (401) -> tự gọi refresh 1 lần rồi gửi lại
// - Refresh cũng hết hạn -> xóa token, chuyển về /login
// - Lỗi từ Django được đọc ra thành câu dễ hiểu (ApiError.message)
// ============================================================

import type { Track } from './tracks';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

// ---------------- Token ----------------

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(access: string, refresh?: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Nhiều request cùng hết hạn một lúc chỉ gọi refresh 1 lần
let refreshing: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  const refresh = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
  if (!refresh) return Promise.resolve(false);

  if (!refreshing) {
    refreshing = fetch(`${BASE_URL}/users/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = (await res.json()) as { access: string; refresh?: string };
        setTokens(data.access, data.refresh);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

// ---------------- Request ----------------

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Đổi lỗi DRF ({ email: ["..."] } / { detail: "..." }) thành một câu. */
function extractMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string') return record.detail;
    const messages = Object.values(record)
      .flat()
      .filter((v): v is string => typeof v === 'string');
    if (messages.length) return messages.join(' ');
  }
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 404) return 'Không tìm thấy dữ liệu.';
  if (status >= 500) return 'Máy chủ đang gặp lỗi, thử lại sau.';
  return `Lỗi ${status}`;
}

interface RequestOptions extends RequestInit {
  /** false = không gửi token (login, register) */
  auth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...init } = options;

  const send = () => {
    const token = auth ? getAccessToken() : null;
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  };

  let res = await send();

  if (res.status === 401 && auth) {
    if (await refreshAccessToken()) {
      res = await send();
    } else {
      clearTokens();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw new ApiError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 401);
    }
  }

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = undefined;
    }
    throw new ApiError(extractMessage(data, res.status), res.status, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------------- Kiểu dữ liệu ----------------

export type Role = 'user' | 'admin';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  track: Track | null;
  is_active: boolean;
  date_joined: string;
}

export interface AdminUser extends CurrentUser {
  last_login: string | null;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface TokenPair {
  access: string;
  refresh: string;
}

// ---------------- Auth ----------------

export const authApi = {
  login: (email: string, password: string) =>
    request<TokenPair>('/users/login/', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { name: string; email: string; password: string; track?: Track }) =>
    request<TokenPair & { user: CurrentUser }>('/users/register/', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(data),
    }),

  me: () => request<CurrentUser>('/users/me/'),

  updateMe: (data: Partial<Pick<CurrentUser, 'name' | 'track'>>) =>
    request<CurrentUser>('/users/me/', { method: 'PATCH', body: JSON.stringify(data) }),
};

// ---------------- Quản trị ----------------

export interface AdminUserQuery {
  search?: string;
  role?: Role | '';
  track?: Track | '';
  is_active?: 'true' | 'false' | '';
  page?: number;
}

export const adminApi = {
  listUsers: (query: AdminUserQuery = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const qs = params.toString();
    return request<Paginated<AdminUser>>(`/users/admin/${qs ? `?${qs}` : ''}`);
  },

  updateUser: (id: string, data: Partial<Pick<AdminUser, 'role' | 'is_active'>>) =>
    request<AdminUser>(`/users/admin/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ---------------- Anatomy (API sẽ có khi làm app anatomy) ----------------

export const anatomyApi = {
  getSystems: () =>
    request<{ id: string; slug: string; name_vi: string; name_en: string; iframe_url: string; sketchfab_model_id: string; part_count: number }[]>('/anatomy/systems/'),

  getSystem: (slug: string) =>
    request<{ id: string; slug: string; name_vi: string; name_en: string; iframe_url: string; sketchfab_model_id: string }>(`/anatomy/systems/${slug}/`),

  getPartByAnnotation: (systemSlug: string, annotationIndex: number) =>
    request<{ id: string; annotation_index: number; name_vi: string; name_en: string; definition: string; physiology: string; clinical_note: string; document_links: object[] }>(
      `/anatomy/systems/${systemSlug}/parts/?annotation_index=${annotationIndex}`,
    ),

  askAI: (partId: string, question: string) =>
    request<{ answer: string; sources: object[] }>('/ai/ask/', {
      method: 'POST',
      body: JSON.stringify({ part_id: partId, question, context: 'anatomy' }),
    }),
};

// ---------------- Algorithms (API sẽ có khi làm app algorithms) ----------------

export const algorithmApi = {
  getAll: () =>
    request<{ id: string; category: string; name: string; slug: string; description: string; tags: string[] }[]>('/algorithms/'),

  getDetail: (slug: string) =>
    request<{ id: string; category: string; name: string; description: string; steps: object[] }>(`/algorithms/${slug}/`),

  askAI: (algorithmId: string, question: string) =>
    request<{ answer: string; sources: object[] }>('/ai/ask/', {
      method: 'POST',
      body: JSON.stringify({ algorithm_id: algorithmId, question, context: 'algorithm' }),
    }),
};

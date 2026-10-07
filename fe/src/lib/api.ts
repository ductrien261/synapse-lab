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
  // Khách chưa đăng nhập gặp 401 thì chỉ báo lỗi, không chuyển trang; phiên hết hạn mới về trang đăng nhập
  const hadToken = auth && Boolean(getAccessToken());

  const send = () => {
    const token = auth ? getAccessToken() : null;
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        // FormData (upload file): để trình duyệt tự đặt Content-Type kèm boundary
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  };

  let res = await send();

  if (res.status === 401 && hadToken) {
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

  // 204 hoặc body rỗng -> không parse JSON
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Download a protected file with the same bearer-token refresh behavior as JSON requests. */
export async function requestBlob(path: string): Promise<Blob> {
  const hadToken = Boolean(getAccessToken());
  const send = () => {
    const token = getAccessToken();
    return fetch(`${BASE_URL}${path}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  };
  let res = await send();
  if (res.status === 401 && hadToken) {
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
    const data = await res.json().catch(() => undefined);
    throw new ApiError(extractMessage(data, res.status), res.status, data);
  }
  return res.blob();
}

/**
 * Gọi API trả về Server-Sent Events (vd. gia sư AI trả lời dần từng chữ).
 * Dùng fetch (EventSource không gửi được token). Lỗi trước khi stream -> ApiError.
 */
export async function streamRequest(
  path: string,
  body: unknown,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  signal?: AbortSignal,
): Promise<void> {
  const send = () => {
    const token = getAccessToken();
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  };

  let res = await send();
  if (res.status === 401 && (await refreshAccessToken())) res = await send();
  if (!res.ok || !res.body) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = undefined;
    }
    throw new ApiError(extractMessage(data, res.status), res.status, data);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      if (data.length) {
        try {
          onEvent(event, JSON.parse(data.join('\n')) as Record<string, unknown>);
        } catch {
          // bỏ qua khối lỗi định dạng
        }
      }
    }
  }
}

// ---------------- Kiểu dữ liệu ----------------

export type Role = 'user' | 'admin';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  track: Track | null;
  weekly_goal: number;
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

  updateMe: (data: Partial<Pick<CurrentUser, 'name' | 'track' | 'weekly_goal'>>) =>
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

// ---------------- Lịch sử học ----------------

export interface LearningActivityDto {
  id: number;
  track: Track;
  kind: 'algorithm' | 'anatomy_model';
  object_key: string;
  href: string;
  title: string;
  subtitle: string;
  group: string;
  visit_count: number;
  first_visited_at: string;
  last_visited_at: string;
}

export interface LearningSummaryDto {
  streak: number;
  learned_today: boolean;
  last7: { date: string; label: string; active: boolean; is_today: boolean }[];
  days_this_week: number;
  weekly_goal: number;
  explored_count: number;
}

export const learningApi = {
  activities: (limit = 200) => request<LearningActivityDto[]>(`/learning/activities/?limit=${limit}`),

  record: (data: Pick<LearningActivityDto, 'track' | 'kind' | 'object_key' | 'href' | 'title' | 'subtitle' | 'group'>) =>
    request<LearningActivityDto>('/learning/activities/', { method: 'POST', body: JSON.stringify(data) }),

  summary: () => request<LearningSummaryDto>('/learning/summary/'),
};

// ---------------- Dịch tự động ----------------

export const translateApi = {
  translate: (text: string, target: 'vi' | 'en' = 'vi') =>
    request<{ translated: string; cached: boolean }>('/translate/', {
      method: 'POST',
      body: JSON.stringify({ text, target }),
    }),
};

// ---------------- Ghi chú ----------------

export type NoteKind = 'algorithm' | 'anatomy_model';

export interface StudyNoteDto {
  kind: NoteKind;
  object_key: string;
  /** -1 = ghi chú cho cả bài / cả mô hình */
  part_index: number;
  content: string;
  updated_at: string;
}

export const notesApi = {
  list: (kind: NoteKind, objectKey: string) =>
    request<StudyNoteDto[]>(`/learning/notes/?kind=${kind}&object_key=${encodeURIComponent(objectKey)}`),

  save: (data: Pick<StudyNoteDto, 'kind' | 'object_key' | 'part_index' | 'content'>) =>
    request<StudyNoteDto | undefined>('/learning/notes/', { method: 'PUT', body: JSON.stringify(data) }),
};

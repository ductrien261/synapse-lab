const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error ${res.status}: ${res.statusText}`);
  return res.json();
}

// --- Auth ---
export const authApi = {
  login: (email: string, password: string) =>
    request<{ access: string; refresh: string }>('/users/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { name: string; email: string; password: string; role: string }) =>
    request<{ access: string; refresh: string }>('/users/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<{ id: string; name: string; email: string; role: string }>('/users/me/'),
};

// --- Anatomy ---
export const anatomyApi = {
  getSystems: () =>
    request<{ id: string; slug: string; name_vi: string; name_en: string; iframe_url: string; sketchfab_model_id: string; part_count: number }[]>('/anatomy/systems/'),

  getSystem: (slug: string) =>
    request<{ id: string; slug: string; name_vi: string; name_en: string; iframe_url: string; sketchfab_model_id: string }>(`/anatomy/systems/${slug}/`),

  getPartByAnnotation: (systemSlug: string, annotationIndex: number) =>
    request<{ id: string; annotation_index: number; name_vi: string; name_en: string; definition: string; physiology: string; clinical_note: string; document_links: object[] }>(
      `/anatomy/systems/${systemSlug}/parts/?annotation_index=${annotationIndex}`
    ),

  askAI: (partId: string, question: string) =>
    request<{ answer: string; sources: object[] }>('/ai/ask/', {
      method: 'POST',
      body: JSON.stringify({ part_id: partId, question, context: 'anatomy' }),
    }),
};

// --- Algorithms (via backend knowledge store) ---
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

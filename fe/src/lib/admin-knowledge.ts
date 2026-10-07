// ============================================================
// SYNAPSE-LAB — API quản trị kho tri thức / Tài liệu (chỉ admin)
// ============================================================

import { request, requestBlob } from './api';
import type { BackgroundJob } from './jobs';

export type DocScope = 'cs' | 'med' | 'general';
export type DocStatus = 'pending' | 'processing' | 'ready' | 'failed';

export const SCOPE_LABEL: Record<DocScope, string> = {
  med: 'Y khoa',
  cs: 'Công nghệ thông tin',
  general: 'Chung',
};

/** Tài liệu của ngành nào thì AI dùng cho phần đó (Giải phẫu 3D / Thuật toán); "Chung" dùng cho mọi phần. */
export const SCOPE_HINT: Record<DocScope, string> = {
  med: 'Dùng cho Giải phẫu 3D, gia sư & ôn tập Y khoa',
  cs: 'Dùng cho Thuật toán, gia sư & ôn tập CNTT',
  general: 'Dùng cho mọi phần',
};

export const SCOPES: DocScope[] = ['med', 'cs', 'general'];

/** Sách OpenStax gợi ý (miễn phí, giấy phép mở) — bấm để quét mục lục nhanh. */
export const SUGGESTED_BOOKS: { scope: DocScope; title: string; slug: string; note: string }[] = [
  { scope: 'med', title: 'Anatomy and Physiology 2e', slug: 'anatomy-and-physiology-2e', note: 'Giải phẫu – sinh lý, khớp với mô hình 3D' },
  { scope: 'med', title: 'Microbiology', slug: 'microbiology', note: 'Vi sinh' },
  { scope: 'cs', title: 'Introduction to Computer Science', slug: 'introduction-computer-science', note: 'Chương 3: cấu trúc dữ liệu & thuật toán' },
  { scope: 'cs', title: 'Introduction to Python Programming', slug: 'introduction-python-programming', note: 'Lập trình Python cơ bản' },
  { scope: 'cs', title: 'Principles of Data Science', slug: 'principles-data-science', note: 'Khoa học dữ liệu' },
];

export function bookUrl(slug: string) {
  return `https://openstax.org/details/books/${slug}`;
}

/** Đoán chuyên ngành từ tên sách (admin vẫn đổi được). */
export function guessScope(slugOrTitle: string): DocScope {
  const s = slugOrTitle.toLowerCase();
  const known = SUGGESTED_BOOKS.find((b) => s.includes(b.slug));
  if (known) return known.scope;
  if (/(anatomy|physiology|biology|microbio|nursing|health|medic|chemistry|psycholog|pharma)/.test(s)) return 'med';
  if (/(computer|python|program|data-science|data science|algorithm|software|comput)/.test(s)) return 'cs';
  return 'general';
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  source_type: 'openstax' | 'pdf';
  source_key: string;
  source_url: string;
  license_name: string;
  license_url: string;
  authors: string;
  year: number | null;
  scope: DocScope;
  language: string;
  status: DocStatus;
  error_message: string;
  chunk_count: number;
  section_count: number;
  page_count: number | null;
  index_mode: 'hybrid' | 'keyword';
  original_filename: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface TocPage {
  slug: string;
  title: string;
  kind: 'content' | 'extra';
}

export interface TocChapter {
  key: string;
  title: string;
  unit: string;
  pages: TocPage[];
}

export interface DocumentSection {
  key: string;
  title: string;
  chunks: number;
  url: string;
}

export interface KnowledgeDocumentDetail extends KnowledgeDocument {
  sections: DocumentSection[];
  toc: TocChapter[];
}

export interface OpenStaxBook {
  slug: string;
  title: string;
  url: string;
  license_name: string;
  license_url: string;
  toc: TocChapter[];
}

export interface CuratedSource {
  key: string;
  title: string;
  authors: string;
  url: string;
  license_name: string;
  license_url: string;
  document_id: string | null;
}

export interface IngestJob extends BackgroundJob {
  kind: 'openstax' | 'pdf';
  document: string | null;
  document_title: string;
}

export interface KnowledgeStats {
  documents: { total: number; ready: number };
  chunks: number;
  sections: number;
  embeddings_configured: boolean;
}

export interface SearchResult {
  id: number;
  document_id: string;
  document_title: string;
  heading: string;
  url: string;
  page_label: string;
  content: string;
  score: number;
  dense_rank: number | null;
  keyword_rank: number | null;
  citation: string;
}

export interface SearchResponse {
  query: string;
  english_query: string;
  dense: number;
  keyword: number;
  results: SearchResult[];
}

const BASE = '/knowledge/admin';

export const adminKnowledgeApi = {
  stats: () => request<KnowledgeStats>(`${BASE}/stats/`),

  documents: () => request<KnowledgeDocument[]>(`${BASE}/documents/`),

  document: (id: string) => request<KnowledgeDocumentDetail>(`${BASE}/documents/${id}/`),

  previewPdf: (id: string) => requestBlob(`${BASE}/documents/${id}/preview/`),

  updateDocument: (id: string, data: Partial<Pick<KnowledgeDocument, 'title' | 'authors' | 'year' | 'scope'>>) =>
    request<KnowledgeDocument>(`${BASE}/documents/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteDocument: (id: string) => request<void>(`${BASE}/documents/${id}/`, { method: 'DELETE' }),

  removeSections: (id: string, keys: string[]) =>
    request<{ deleted_chunks: number }>(`${BASE}/documents/${id}/sections/remove/`, {
      method: 'POST',
      body: JSON.stringify({ keys }),
    }),

  scanOpenStax: (url: string) =>
    request<{ book: OpenStaxBook; document_id: string | null; ingested: string[] }>(`${BASE}/openstax/scan/`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  ingestOpenStax: (book: string, pages: string[], scope?: DocScope) =>
    request<IngestJob>(`${BASE}/openstax/ingest/`, { method: 'POST', body: JSON.stringify({ book, pages, scope }) }),

  curatedSources: () => request<CuratedSource[]>(`${BASE}/curated/`),

  ingestCurated: (key: string) =>
    request<IngestJob>(`${BASE}/curated/`, { method: 'POST', body: JSON.stringify({ key }) }),

  uploadPdf: (data: { file: File; title: string; authors: string; year: string; scope: DocScope }) => {
    const form = new FormData();
    form.append('file', data.file);
    form.append('title', data.title);
    form.append('authors', data.authors);
    if (data.year) form.append('year', data.year);
    form.append('scope', data.scope);
    return request<IngestJob>(`${BASE}/pdf/`, { method: 'POST', body: form });
  },

  latestJob: () =>
    request<IngestJob | { job: null }>(`${BASE}/jobs/latest/`).then((data) => (data && 'id' in data ? data : null)),

  job: (id: string) => request<IngestJob>(`${BASE}/jobs/${id}/`),

  cancelJob: (id: string) => request<IngestJob>(`${BASE}/jobs/${id}/cancel/`, { method: 'POST', body: '{}' }),

  search: (q: string, scope?: DocScope | '') => {
    const params = new URLSearchParams({ q });
    if (scope) params.set('scope', scope);
    return request<SearchResponse>(`${BASE}/search/?${params.toString()}`);
  },
};

export const INGEST_JOB_API = { job: adminKnowledgeApi.job, cancel: adminKnowledgeApi.cancelJob };
export const INGEST_JOB_KINDS = { openstax: 'Nạp sách OpenStax', pdf: 'Nạp file PDF' };

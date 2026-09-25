// ============================================================
// SYNAPSE-LAB — API quản trị giải phẫu (chỉ admin)
// ============================================================

import { request } from './api';
import { invalidateAnatomyCatalog, type AnatomyModelSummary, type BodySystem } from './anatomy-catalog';
import { isJobActive, type BackgroundJob, type JobStatus } from './jobs';

export { isJobActive, type JobStatus };

export interface AdminModelRow extends AnatomyModelSummary {
  filled_count: number;
  source_url: string;
  created_at: string;
  updated_at: string;
}

export interface AdminStructure {
  id: number;
  name_en: string;
  name_vi: string;
  latin_name: string;
  definition: string;
  function: string;
  clinical_note: string;
  status: 'draft' | 'published';
  model_count: number | null;
  draft?: DraftSummary | null;
}

export type DraftStatus = 'pending' | 'applied' | 'discarded' | 'no_source' | 'failed';

export interface DraftSummary {
  id: number;
  status: DraftStatus;
  error: string;
}

export interface DraftCitation {
  n: number;
  chunk_id: number;
  document_id: string;
  document_title: string;
  heading: string;
  url: string;
  page_label: string;
  excerpt: string;
  citation: string;
}

export interface StructureDraft {
  id: number;
  status: DraftStatus;
  name_vi: string;
  definition: string;
  function: string;
  clinical_note: string;
  citations: DraftCitation[];
  error: string;
  llm_model: string;
  prompt_tokens: number;
  completion_tokens: number;
  structure: Pick<AdminStructure, 'id' | 'name_en' | 'name_vi' | 'latin_name' | 'status' | 'definition' | 'function' | 'clinical_note'>;
  models: { uid: string; title: string; thumbnail_url: string; is_published: boolean; system: string | null }[];
  created_at: string;
  updated_at: string;
}

export type DraftFields = Pick<StructureDraft, 'name_vi' | 'definition' | 'function' | 'clinical_note'>;

export interface ReadyModel {
  uid: string;
  title: string;
  /** số bộ phận đã duyệt / đã gắn cấu trúc */
  approved?: number;
  linked?: number;
}

export interface AdminAnnotation {
  index: number;
  label: string;
  raw_content: string;
  structure: AdminStructure | null;
}

export interface SourceMeta {
  source?: string;
  nid?: string;
  title?: string;
  description?: string;
  structures_latin?: string[];
  creators?: string;
  institution?: string;
  license_text?: string;
}

export interface AdminModelDetail extends AdminModelRow {
  description: string;
  tags: string[];
  author_url: string;
  license_url: string;
  sketchfab_url: string;
  system_detail: BodySystem | null;
  annotations: AdminAnnotation[];
  source_meta: SourceMeta;
  last_synced_at: string | null;
}

export interface AnatomyToolCollection {
  id: number;
  url: string;
  title: string;
  suggested_system: string | null;
  candidate_count: number | null;
  imported_count: number;
  last_scanned_at: string | null;
  last_imported_at: string | null;
}

export interface ImportJob extends BackgroundJob {
  kind: 'scan_index' | 'import' | 'ai_draft';
}

export const ANATOMY_JOB_KINDS = { scan_index: 'Quét danh mục', import: 'Nhập mô hình', ai_draft: 'AI viết nháp' };

export interface AnatomyStats {
  models: { total: number; published: number; draft: number; no_system: number; publishable: number };
  structures: { total: number; published: number; with_content: number };
  drafts: { pending: number };
}

const BASE = '/anatomy/admin';

function withInvalidate<T>(value: T): T {
  invalidateAnatomyCatalog();
  return value;
}

export const adminAnatomyApi = {
  stats: () => request<AnatomyStats>(`${BASE}/stats/`),

  models: (query: { status?: string; system?: string; search?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => v && params.set(k, v));
    const qs = params.toString();
    return request<AdminModelRow[]>(`${BASE}/models/${qs ? `?${qs}` : ''}`);
  },

  bulk: (uids: string[], action: 'publish' | 'unpublish' | 'set_system' | 'delete', system?: string | null) =>
    request<{ affected: number }>(`${BASE}/models/bulk/`, {
      method: 'POST',
      body: JSON.stringify({ uids, action, system }),
    }).then(withInvalidate),

  model: (uid: string) => request<AdminModelDetail>(`${BASE}/models/${uid}/`),

  updateModel: (uid: string, data: Partial<{ title_vi: string; system: string | null; is_published: boolean }>) =>
    request<AdminModelDetail>(`${BASE}/models/${uid}/`, { method: 'PATCH', body: JSON.stringify(data) }).then(withInvalidate),

  syncAnnotations: (uid: string, annotations: { index: number; label: string; content: string }[]) =>
    request<{ result: { total: number; linked: number; new_structures: number; removed: number }; model: AdminModelDetail }>(
      `${BASE}/models/${uid}/annotations/`,
      { method: 'POST', body: JSON.stringify({ annotations }) },
    ),

  publish: (uid: string, approveStructures: boolean) =>
    request<{ published: boolean; approved_structures: number }>(`${BASE}/models/${uid}/publish/`, {
      method: 'POST',
      body: JSON.stringify({ approve_structures: approveStructures }),
    }).then(withInvalidate),

  updateStructure: (id: number, data: Partial<Omit<AdminStructure, 'id' | 'name_en' | 'model_count'>>) =>
    request<AdminStructure>(`${BASE}/structures/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  collections: () => request<AnatomyToolCollection[]>(`${BASE}/anatomytool/collections/`),

  scan: () => request<ImportJob>(`${BASE}/anatomytool/scan/`, { method: 'POST', body: '{}' }),

  startImport: (data: { collections: { id: number; system: string | null }[]; links: string[]; links_system?: string | null }) =>
    request<ImportJob>(`${BASE}/anatomytool/import/`, { method: 'POST', body: JSON.stringify(data) }),

  latestJob: () =>
    request<ImportJob | { job: null }>(`${BASE}/jobs/latest/`).then((data) => (data && 'id' in data ? data : null)),

  job: (id: string) => request<ImportJob>(`${BASE}/jobs/${id}/`),

  cancelJob: (id: string) => request<ImportJob>(`${BASE}/jobs/${id}/cancel/`, { method: 'POST', body: '{}' }),

  // ---- AI viết nháp + duyệt nhanh ----
  structureDraft: (structureId: number) =>
    request<StructureDraft | { draft: null }>(`${BASE}/structures/${structureId}/draft/`).then((d) => (d && 'id' in d ? d : null)),

  writeDraft: (structureId: number) => request<StructureDraft>(`${BASE}/structures/${structureId}/draft/`, { method: 'POST', body: '{}' }),

  generateDrafts: (data: { model_uid?: string; structure_ids?: number[]; only_empty?: boolean }) =>
    request<ImportJob>(`${BASE}/drafts/generate/`, { method: 'POST', body: JSON.stringify({ only_empty: true, ...data }) }),

  drafts: (query: { status?: DraftStatus; model?: string; system?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => v && params.set(k, v));
    const qs = params.toString();
    return request<{ counts: Partial<Record<DraftStatus, number>>; results: StructureDraft[]; publishable: ReadyModel[] }>(`${BASE}/drafts/${qs ? `?${qs}` : ''}`);
  },

  approveDraft: (id: number, fields: Partial<DraftFields> = {}) =>
    request<{ approved: number; structure_id: number; ready_models: ReadyModel[] }>(`${BASE}/drafts/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify(fields),
    }).then(withInvalidate),

  approveDrafts: (ids: number[]) =>
    request<{ approved: number; ready_models: ReadyModel[] }>(`${BASE}/drafts/approve-bulk/`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }).then(withInvalidate),

  discardDraft: (id: number) => request<{ discarded: number }>(`${BASE}/drafts/${id}/discard/`, { method: 'POST', body: '{}' }),
};

export const ANATOMY_JOB_API = { job: adminAnatomyApi.job, cancel: adminAnatomyApi.cancelJob };

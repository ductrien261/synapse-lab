// ============================================================
// SYNAPSE-LAB — API quản trị giải phẫu (chỉ admin)
// ============================================================

import { request } from './api';
import type { AnatomyModelSummary, BodySystem } from './anatomy-catalog';

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

export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

export interface ImportJob {
  id: string;
  kind: 'scan_index' | 'import';
  status: JobStatus;
  total: number;
  processed: number;
  created_count: number;
  skipped_count: number;
  failed_count: number;
  log: { at: string; level: 'info' | 'success' | 'warning' | 'error'; message: string }[];
  cancel_requested: boolean;
  created_at: string;
  finished_at: string | null;
}

export interface AnatomyStats {
  models: { total: number; published: number; draft: number; no_system: number };
  structures: { total: number; published: number; with_content: number };
}

export function isJobActive(job: ImportJob | null | undefined): boolean {
  return Boolean(job && (job.status === 'queued' || job.status === 'running'));
}

const BASE = '/anatomy/admin';

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
    }),

  model: (uid: string) => request<AdminModelDetail>(`${BASE}/models/${uid}/`),

  updateModel: (uid: string, data: Partial<{ title_vi: string; system: string | null; is_published: boolean }>) =>
    request<AdminModelDetail>(`${BASE}/models/${uid}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  syncAnnotations: (uid: string, annotations: { index: number; label: string; content: string }[]) =>
    request<{ result: { total: number; linked: number; new_structures: number; removed: number }; model: AdminModelDetail }>(
      `${BASE}/models/${uid}/annotations/`,
      { method: 'POST', body: JSON.stringify({ annotations }) },
    ),

  publish: (uid: string, approveStructures: boolean) =>
    request<{ published: boolean; approved_structures: number }>(`${BASE}/models/${uid}/publish/`, {
      method: 'POST',
      body: JSON.stringify({ approve_structures: approveStructures }),
    }),

  updateStructure: (id: number, data: Partial<Omit<AdminStructure, 'id' | 'name_en' | 'model_count'>>) =>
    request<AdminStructure>(`${BASE}/structures/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  collections: () => request<AnatomyToolCollection[]>(`${BASE}/anatomytool/collections/`),

  scan: () => request<ImportJob>(`${BASE}/anatomytool/scan/`, { method: 'POST', body: '{}' }),

  startImport: (data: { collections: { id: number; system: string | null }[]; links: string[]; links_system?: string | null }) =>
    request<ImportJob>(`${BASE}/anatomytool/import/`, { method: 'POST', body: JSON.stringify(data) }),

  latestJob: () => request<ImportJob | null>(`${BASE}/jobs/latest/`),

  job: (id: string) => request<ImportJob>(`${BASE}/jobs/${id}/`),

  cancelJob: (id: string) => request<ImportJob>(`${BASE}/jobs/${id}/cancel/`, { method: 'POST', body: '{}' }),
};

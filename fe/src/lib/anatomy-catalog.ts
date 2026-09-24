// ============================================================
// SYNAPSE-LAB — Giải phẫu: kiểu dữ liệu, API và hook dùng chung
// Danh sách hệ cơ quan / mô hình chỉ tải 1 lần mỗi phiên rồi dùng lại
// (sidebar, dashboard, trang giải phẫu).
// ============================================================

import { useEffect, useState } from 'react';
import { request } from './api';

export interface BodySystem {
  id: number;
  slug: string;
  name_vi: string;
  name_en: string;
  description: string;
  color: string;
  order: number;
  is_published: boolean;
  model_count: number;
}

export interface AnatomyModelSummary {
  id: string;
  sketchfab_uid: string;
  system: string | null;
  title: string;
  title_vi: string;
  thumbnail_url: string;
  embed_url: string;
  author_name: string;
  license_label: string;
  is_published: boolean;
  order: number;
  annotation_count: number;
}

export interface StructureReference {
  id: number;
  document: string;
  document_title: string;
  citation: string;
  page_start: number | null;
  page_end: number | null;
  excerpt: string;
}

export interface StructureInfo {
  id: number;
  name_en: string;
  name_vi: string;
  published: boolean;
  latin_name?: string;
  definition?: string;
  function?: string;
  clinical_note?: string;
  references?: StructureReference[];
}

export interface ModelAnnotation {
  index: number;
  label: string;
  structure: StructureInfo | null;
}

export interface AnatomyModelDetail extends AnatomyModelSummary {
  description: string;
  tags: string[];
  author_url: string;
  license_url: string;
  source_url: string;
  sketchfab_url: string;
  system_detail: BodySystem | null;
  annotations: ModelAnnotation[];
}

export const anatomyApi = {
  systems: () => request<BodySystem[]>('/anatomy/systems/'),

  models: (query: { system?: string; search?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.system) params.set('system', query.system);
    if (query.search) params.set('search', query.search);
    const qs = params.toString();
    return request<AnatomyModelSummary[]>(`/anatomy/models/${qs ? `?${qs}` : ''}`);
  },

  model: (uid: string) => request<AnatomyModelDetail>(`/anatomy/models/${uid}/`),
};

export function modelTitle(m: Pick<AnatomyModelSummary, 'title' | 'title_vi'>): string {
  return m.title_vi || m.title;
}

export function modelHref(uid: string): string {
  return `/anatomy/models/${uid}`;
}

// ---------------- Hook có cache ----------------

type LoadState = 'loading' | 'ready' | 'error';

function cachedLoader<T>(load: () => Promise<T>) {
  let cache: Promise<T> | null = null;
  return () => {
    if (!cache) {
      cache = load().catch((err: unknown) => {
        cache = null;
        throw err;
      });
    }
    return cache;
  };
}

const loadSystems = cachedLoader(anatomyApi.systems);
const loadAllModels = cachedLoader(() => anatomyApi.models());

function useCached<T>(loader: () => Promise<T>, empty: T): { data: T; state: LoadState } {
  const [data, setData] = useState<T>(empty);
  const [state, setState] = useState<LoadState>('loading');
  useEffect(() => {
    let cancelled = false;
    loader()
      .then((value) => {
        if (cancelled) return;
        setData(value);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [loader]);
  return { data, state };
}

const NO_SYSTEMS: BodySystem[] = [];
const NO_MODELS: AnatomyModelSummary[] = [];

/** Hệ cơ quan (kèm số mô hình đã xuất bản). */
export function useBodySystems() {
  const { data, state } = useCached(loadSystems, NO_SYSTEMS);
  return { systems: data, state };
}

/** Toàn bộ mô hình đã xuất bản. */
export function useAnatomyModels() {
  const { data, state } = useCached(loadAllModels, NO_MODELS);
  return { models: data, state };
}

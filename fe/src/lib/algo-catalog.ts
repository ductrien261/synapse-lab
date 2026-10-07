// ============================================================
// SYNAPSE-LAB — Danh mục thuật toán dùng chung
// Sidebar, dashboard, gợi ý... cùng gọi hook này nhưng chỉ tải
// từ algo-server đúng 1 lần mỗi phiên.
// ============================================================

import { useEffect, useState } from 'react';
import { algorithmApi, type AlgorithmCategory } from './algorithm-api';

let cache: Promise<AlgorithmCategory[]> | null = null;

export function invalidateAlgoCatalog() {
  cache = null;
}

export function loadAlgoCatalog(): Promise<AlgorithmCategory[]> {
  if (!cache) {
    cache = algorithmApi
      .categories()
      .then((data) => (Array.isArray(data) ? data : []))
      .catch((err: unknown) => {
        cache = null; // lần sau thử lại
        throw err;
      });
  }
  return cache;
}

export type CatalogState = 'loading' | 'ready' | 'error';

export function useAlgoCatalog(): { categories: AlgorithmCategory[]; state: CatalogState } {
  const [categories, setCategories] = useState<AlgorithmCategory[]>([]);
  const [state, setState] = useState<CatalogState>('loading');

  useEffect(() => {
    let cancelled = false;
    loadAlgoCatalog()
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, state };
}

export function countAlgorithms(categories: AlgorithmCategory[]): number {
  return categories.reduce((sum, c) => sum + (c.algorithms?.length ?? 0), 0);
}

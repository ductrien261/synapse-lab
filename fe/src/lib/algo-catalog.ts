// ============================================================
// SYNAPSE-LAB — Danh mục thuật toán dùng chung
// Sidebar, dashboard, gợi ý... cùng gọi hook này nhưng chỉ tải
// từ algo-server đúng 1 lần mỗi phiên.
// ============================================================

import { useEffect, useState } from 'react';
import { algoVizApi, type AlgoCategory } from './algo-api';

let cache: Promise<AlgoCategory[]> | null = null;

export function loadAlgoCatalog(): Promise<AlgoCategory[]> {
  if (!cache) {
    cache = algoVizApi
      .getCategories()
      .then((data) => (Array.isArray(data.categories) ? data.categories : []))
      .catch((err: unknown) => {
        cache = null; // lần sau thử lại
        throw err;
      });
  }
  return cache;
}

export type CatalogState = 'loading' | 'ready' | 'error';

export function useAlgoCatalog(): { categories: AlgoCategory[]; state: CatalogState } {
  const [categories, setCategories] = useState<AlgoCategory[]>([]);
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

export function countAlgorithms(categories: AlgoCategory[]): number {
  return categories.reduce((sum, c) => sum + (c.algorithms?.length ?? 0), 0);
}

// ============================================================
// SYNAPSE-LAB — Algo-Server API Client (packages/algo-viz/server)
// Direct calls to Node.js server on port 8080
// ============================================================

const ALGO_API = process.env.NEXT_PUBLIC_ALGO_API_URL || 'http://localhost:8080/api';

async function algoRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${ALGO_API}${path}`);
  if (!res.ok) throw new Error(`Algo API Error ${res.status}`);
  return res.json();
}

export interface AlgoCategory {
  key: string;
  name: string;
  algorithms: AlgoItem[];
}

export interface AlgoItem {
  key: string;
  name: string;
  description?: string;
}

export interface AlgoDetail {
  categoryKey: string;
  categoryName: string;
  algorithmKey: string;
  algorithmName: string;
  description: string;
  files: { name: string; content: string }[];
}

export const algoVizApi = {
  // GET /api/algorithms/ → { categories: AlgoCategory[] }
  getCategories: () =>
    algoRequest<{ categories: AlgoCategory[] }>('/algorithms/'),

  // GET /api/algorithms/:category/:algo
  getAlgorithm: (category: string, algo: string) =>
    algoRequest<{ algorithm: AlgoDetail }>(`/algorithms/${category}/${algo}`),
};

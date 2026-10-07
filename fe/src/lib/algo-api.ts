import type { AlgorithmViewDetail } from './algorithm-api';
import type { SimulationTrace } from './simulation';

const ALGO_API = process.env.NEXT_PUBLIC_ALGO_API_URL || 'http://localhost:8080/api';

async function algoRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${ALGO_API}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Algo API Error ${res.status}`);
  }
  return res.json();
}

export const algoVizApi = {
  // GET /api/algorithms/:category/:algo
  getAlgorithm: (category: string, algo: string) =>
    algoRequest<{ algorithm: AlgorithmViewDetail }>(`/algorithms/${category}/${algo}`),
};

export function getSimulationTrace(algorithmPath: string, sample: string, adjacency?: number[][]) {
  const params = new URLSearchParams({ sample });
  if (adjacency) params.set('adjacency', JSON.stringify(adjacency));
  return algoRequest<SimulationTrace>(`/algorithms/${algorithmPath}/visualization?${params}`);
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { algoVizApi, AlgoDetail } from '@/lib/algo-api';
import { AlgorithmSimulationView } from '@/components/simulation/AlgorithmSimulationView';
import { ArrowLeft } from 'react-bootstrap-icons';

export default function AlgorithmViewerPage() {
  const params = useParams();
  const router = useRouter();
  const category = decodeURIComponent(params.category as string);
  const algo = decodeURIComponent(params.algo as string);

  const [detail, setDetail] = useState<AlgoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    algoVizApi.getAlgorithm(category, algo)
      .then((data) => setDetail(data.algorithm))
      .catch(() => setError('Khong tim thay thuat toan nay'))
      .finally(() => setLoading(false));
  }, [category, algo]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3 text-stone-400">
        <div className="w-8 h-8 border-2 border-[#3D568F] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Dang tai thuat toan...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-sm text-stone-500 font-mono">{error}</p>
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-[#3D568F] text-white hover:bg-[#2F4371] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Quay lai
      </button>
    </div>
  );

  return (
    <AlgorithmSimulationView
      algorithmDetail={detail}
      onBack={() => router.push('/algorithms')}
    />
  );
}
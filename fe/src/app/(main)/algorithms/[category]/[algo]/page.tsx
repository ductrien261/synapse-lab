'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'react-bootstrap-icons';
import { algoVizApi, type AlgoDetail } from '@/lib/algo-api';
import { addRecent } from '@/lib/recent';
import { AlgorithmSimulationView } from '@/components/simulation/AlgorithmSimulationView';

export default function AlgorithmViewerPage() {
  const params = useParams<{ category: string; algo: string }>();
  const router = useRouter();
  const category = decodeURIComponent(params.category ?? '');
  const algo = decodeURIComponent(params.algo ?? '');

  const [detail, setDetail] = useState<AlgoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!category || !algo) return;
    algoVizApi
      .getAlgorithm(category, algo)
      .then((data) => {
        setDetail(data.algorithm);
        // Ghi lại để hiện ở mục "Tiếp tục học" trên dashboard
        track('algorithm_opened', { category, algo });
        addRecent({
          track: 'cs',
          href: `/algorithms/${category}/${algo}`,
          title: data.algorithm.algorithmName,
          subtitle: data.algorithm.categoryName,
          group: category,
        });
      })
      .catch(() => setError('Không tìm thấy thuật toán này'))
      .finally(() => setLoading(false));
  }, [category, algo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-stone-400">
          <div className="w-8 h-8 border-2 border-[#1E3F82] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Đang tải thuật toán...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm text-stone-500 font-medium">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/algorithms')}
          className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-[#1E3F82] text-white hover:bg-[#163070] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại kho thuật toán
        </button>
      </div>
    );
  }

  return <AlgorithmSimulationView algorithmDetail={detail} onBack={() => router.push('/algorithms')} />;
}

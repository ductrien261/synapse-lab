'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'react-bootstrap-icons';
import { algoVizApi } from '@/lib/algo-api';
import { algorithmApi, toAlgorithmViewDetail, type AlgorithmContentDto, type AlgorithmViewDetail } from '@/lib/algorithm-api';
import { addRecent } from '@/lib/recent';
import { AlgorithmSimulationView } from '@/components/simulation/AlgorithmSimulationView';

export default function AlgorithmViewerPage() {
  const params = useParams<{ category: string; algo: string }>();
  const category = decodeURIComponent(params.category ?? '');
  const algo = decodeURIComponent(params.algo ?? '');
  return <AlgorithmViewer key={`${category}/${algo}`} category={category} algo={algo} />;
}

function AlgorithmViewer({ category, algo }: { category: string; algo: string }) {
  const router = useRouter();

  const [detail, setDetail] = useState<AlgorithmViewDetail | null>(null);
  const [content, setContent] = useState<AlgorithmContentDto | null>(null);
  const [contentError, setContentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!category || !algo) return;
    let cancelled = false;
    algorithmApi.get(category, algo)
      .then(async (lesson) => {
        if (cancelled) return;
        const content = lesson.content?.status === 'published' ? lesson.content : null;
        let source: Awaited<ReturnType<typeof algoVizApi.getAlgorithm>> | null = null;
        if (!content?.simulation?.config) {
          source = await algoVizApi.getAlgorithm(category, algo).catch(() => null);
        }
        if (cancelled) return;
        const detail = toAlgorithmViewDetail(lesson.algorithm, source?.algorithm ?? {});
        setDetail(detail);
        setError('');
        setContent(content);
        setContentError(content && !content.simulation?.config && !source ? 'Không tải được mô phỏng từ kho packages.' : '');
        addRecent({ track: 'cs', href: `/algorithms/${category}/${algo}`,
          title: detail.algorithmName, subtitle: detail.categoryName, group: category });
      }).catch(() => { if (!cancelled) setError('Không tìm thấy thuật toán này.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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

  return <>{contentError && <p role="alert" className="rounded-xl border border-rose-100 bg-white p-4 text-sm text-rose-700">{contentError}</p>}<AlgorithmSimulationView key={`${category}/${algo}`} algorithmDetail={detail} lessonContent={content} onBack={() => router.push('/algorithms')} /></>;
}

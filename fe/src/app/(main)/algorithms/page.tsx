'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BoxFill, Search } from 'react-bootstrap-icons';
import { algoVizApi, type AlgoCategory } from '@/lib/algo-api';
import { categoryLabelVi } from '@/lib/algo-categories';

export default function AlgorithmsPage() {
  // useSearchParams cần Suspense bao ngoài (yêu cầu của Next khi build)
  return (
    <Suspense fallback={<ListSkeleton />}>
      <AlgorithmsBrowser />
    </Suspense>
  );
}

function AlgorithmsBrowser() {
  const q = useSearchParams().get('q') ?? '';
  // key = q: bấm tag tìm nhanh khác thì ô tìm kiếm nhận giá trị mới
  return <AlgorithmsList key={q} initialQuery={q} />;
}

function AlgorithmsList({ initialQuery }: { initialQuery: string }) {
  const [categories, setCategories] = useState<AlgoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState(initialQuery);

  useEffect(() => {
    algoVizApi
      .getCategories()
      .then((data) => setCategories(Array.isArray(data.categories) ? data.categories : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = categories
    .map((cat) => {
      const catMatch =
        !q ||
        cat.name.toLowerCase().includes(q) ||
        categoryLabelVi(cat.key, '').toLowerCase().includes(q);
      const all = cat.algorithms ?? [];
      return {
        ...cat,
        algorithms: catMatch ? all : all.filter((a) => a.name.toLowerCase().includes(q)),
      };
    })
    .filter((cat) => cat.algorithms.length > 0);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0F2258] via-[#163070] to-[#1E3F82] text-white rounded-3xl p-7 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#5B8FD8]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold tracking-wider uppercase text-[#E8F0FB] mb-3">
            <BoxFill className="w-3 h-3" /> Thuật toán & cấu trúc dữ liệu
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Kho Thuật Toán</h1>
          <p className="text-sm text-white/80 mt-2">Khám phá và trực quan hóa các thuật toán theo từng nhóm</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên thuật toán hoặc nhóm (ví dụ: Dijkstra, Quy hoạch động)..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10 transition-all"
        />
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="text-center py-12 text-stone-500 text-sm">
          Không kết nối được máy chủ thuật toán (algo-server).
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">Không tìm thấy thuật toán phù hợp</div>
      ) : (
        <div className="flex flex-col gap-6">
          {filtered.map((cat) => (
            <div key={cat.key} className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#1E3F82]/10 text-[#1E3F82] border border-[#1E3F82]/15">
                  {categoryLabelVi(cat.key, cat.name)}
                </span>
                <span className="text-xs text-stone-400">
                  {cat.name} · {cat.algorithms.length} thuật toán
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.algorithms.map((algo) => (
                  <Link
                    key={algo.key}
                    href={`/algorithms/${cat.key}/${algo.key}`}
                    className="group flex flex-col gap-1.5 p-3.5 rounded-xl border border-stone-100 hover:border-[#1E3F82]/40 hover:bg-[#F4F7FC] transition-all"
                  >
                    <span className="font-semibold text-sm text-stone-800 group-hover:text-[#1E3F82] transition-colors leading-snug">
                      {algo.name}
                    </span>
                    {algo.description && (
                      <span className="text-xs text-stone-400 line-clamp-2 leading-relaxed">{algo.description}</span>
                    )}
                    <span className="text-[11px] font-semibold text-[#1E3F82]/60 mt-auto">Xem mô phỏng →</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 rounded-2xl bg-stone-100 animate-pulse" />
      ))}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { ArrowRight, BoxFill } from 'react-bootstrap-icons';
import { useAlgoCatalog } from '@/lib/algo-catalog';

export function ExploreAlgorithms() {
  const { categories, state } = useAlgoCatalog();

  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <BoxFill className="w-4 h-4 text-[#1E3F82]" />
          Khám phá theo nhóm thuật toán
        </h2>
        <Link href="/algorithms" className="text-xs font-bold text-[#1E3F82] hover:underline">
          Xem tất cả
        </Link>
      </div>

      {state === 'loading' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      )}

      {state === 'error' && (
        <p className="text-sm text-stone-500 py-6 text-center">
          Không tải được danh mục thuật toán. Vui lòng thử lại sau.
        </p>
      )}

      {state === 'ready' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((cat) => (
            <Link
              key={cat.key}
              href={`/algorithms?q=${encodeURIComponent(cat.name)}`}
              className="group p-4 rounded-2xl border border-stone-100 hover:border-[#1E3F82]/30 hover:bg-[#F4F7FC] transition-all flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-stone-900 group-hover:text-[#1E3F82]">
                    {cat.name}
                  </div>
                  <div className="text-xs text-stone-400">{cat.name}</div>
                </div>
                <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E8F0FB] text-[#1E3F82]">
                  {cat.algorithms.length} bài
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                <span className="truncate">
                  {cat.algorithms
                    .slice(0, 3)
                    .map((a) => a.name)
                    .join(' · ')}
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-stone-300 group-hover:text-[#1E3F82]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

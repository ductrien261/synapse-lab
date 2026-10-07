'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'react-bootstrap-icons';
import { algorithmApi, type AlgorithmCategory } from '@/lib/algorithm-api';
import { SortDemo } from './SortDemo';

export function AlgorithmLibraryTab() {
  const [categories, setCategories] = useState<AlgorithmCategory[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    algorithmApi.categories()
      .then((data) => {
        if (!cancelled) setCategories(data.filter((category) => category.algorithms.length));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, []);

  return <div className="flex flex-col gap-12">
    <div>
      <h2 className="mb-5 text-xl font-bold text-[#0F2258]">Chạy thử ngay</h2>
      <SortDemo />
    </div>
    <div>
      <h2 className="mb-5 text-xl font-bold text-[#0F2258]">Thư viện giải thuật</h2>
      {failed ? <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-500">Chưa tải được thư viện giải thuật. Vui lòng thử lại sau.</p>
        : categories === null ? <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <li key={index} className="h-40 animate-pulse rounded-xl bg-white" />)}</ul>
        : <div className="flex flex-col gap-10">{categories.map((category) => <div key={category.key}>
          <p className="mb-4 text-sm font-semibold text-slate-500">{category.name} · {category.algorithms.length} giải thuật</p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{category.algorithms.map((algorithm) => <li key={algorithm.key}>
            <Link href={`/algorithms/${category.key}/${algorithm.key}`} className="group flex h-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 transition-colors hover:border-[#1E3F82]">
              <span><span className="block font-semibold text-[#0F2258]">{algorithm.name}</span>{algorithm.description && <span className="mt-1 line-clamp-2 block text-sm text-slate-500">{algorithm.description}</span>}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-[#1E3F82]" />
            </Link>
          </li>)}</ul>
        </div>)}</div>}
    </div>
  </div>;
}

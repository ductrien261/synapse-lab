'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { algoVizApi, AlgoCategory } from '@/lib/algo-api';
import { BoxFill, Search } from 'react-bootstrap-icons';

export default function AlgorithmsPage() {
  const [categories, setCategories] = useState<AlgoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    algoVizApi.getCategories()
      .then((data) => setCategories(data.categories))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = categories.map((cat) => ({
    ...cat,
    algorithms: cat.algorithms.filter((a) =>
      a.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.algorithms.length > 0);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#243355] via-[#2F4371] to-[#3D568F] text-white rounded-3xl p-7 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#9FBAF1]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[#EAF3B2] text-xs font-mono font-bold mb-3.5 border border-white/15">
            <BoxFill className="w-3 h-3" /> THUẬT TOÁN & CẤU TRÚC DỮ LIỆU
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-[family-name:var(--font-headline)]">
            Kho Thuật Toán
          </h1>
          <p className="text-sm text-white/80 mt-2">Khám phá và trực quan hóa các thuật toán theo từng paradigm</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm thuật toán..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#3D568F] focus:ring-2 focus:ring-[#3D568F]/10 transition-all"
        />
      </div>

      {/* Categories */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 font-mono text-sm">
          Không tìm thấy thuật toán phù hợp
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filtered.map((cat) => (
            <div key={cat.key} className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[#3D568F]/10 text-[#3D568F] border border-[#3D568F]/15">
                  {cat.name}
                </span>
                <span className="text-xs text-stone-400 font-mono">{cat.algorithms.length} thuật toán</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.algorithms.map((algo) => (
                  <Link
                    key={algo.key}
                    href={`/algorithms/${cat.key}/${algo.key}`}
                    className="group flex flex-col gap-1.5 p-3.5 rounded-xl border border-stone-100 hover:border-[#3D568F]/40 hover:bg-[#F4F6F9] transition-all"
                  >
                    <span className="font-semibold text-sm text-stone-800 group-hover:text-[#3D568F] transition-colors leading-snug">
                      {algo.name}
                    </span>
                    {algo.description && (
                      <span className="text-xs text-stone-400 line-clamp-2 leading-relaxed">{algo.description}</span>
                    )}
                    <span className="text-[11px] font-mono text-[#3D568F]/60 mt-auto">Xem mô phỏng →</span>
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

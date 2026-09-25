'use client';

import Link from 'next/link';
import { useBodySystems } from '@/lib/anatomy-catalog';

/** Hệ cơ quan đang có mô hình (dữ liệu thật). */
export function SystemsGrid() {
  const { systems, state } = useBodySystems();
  const items = systems.filter((s) => s.is_published && s.model_count > 0);
  if (state === 'loading') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((s) => (
        <li key={s.slug}>
          <Link href={`/anatomy/${s.slug}`} className="block rounded-xl border border-slate-200 bg-white px-4 py-4 transition-colors hover:border-[#1E3F82]">
            <span className="block h-1.5 w-8 rounded-full" style={{ background: s.color }} />
            <span className="mt-3 block font-semibold text-[#0F2258]">{s.name_vi}</span>
            <span className="text-sm text-slate-500">{s.model_count} mô hình</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

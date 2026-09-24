'use client';

import Link from 'next/link';
import { ArrowRight, HeartPulseFill } from 'react-bootstrap-icons';
import { useBodySystems } from '@/lib/anatomy-catalog';

export function ExploreAnatomy() {
  const { systems, state } = useBodySystems();
  // Hệ có mô hình lên trước
  const sorted = [...systems].sort((a, b) => Number(b.model_count > 0) - Number(a.model_count > 0));

  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <HeartPulseFill className="w-4 h-4 text-[#1E3F82]" />
          Khám phá theo hệ cơ quan
        </h2>
        <Link href="/anatomy" className="text-xs font-bold text-[#1E3F82] hover:underline">
          Xem tất cả
        </Link>
      </div>

      {state === 'loading' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      )}

      {state === 'error' && <p className="text-sm text-stone-500 py-6 text-center">Không tải được danh sách hệ cơ quan.</p>}

      {state === 'ready' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((s) => {
            const empty = s.model_count === 0;
            const body = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-900 group-hover:text-[#1E3F82] truncate">{s.name_vi}</div>
                      <div className="text-xs text-stone-400 truncate">{s.name_en}</div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      empty ? 'bg-stone-100 text-stone-400' : 'bg-[#E8F0FB] text-[#1E3F82]'
                    }`}
                  >
                    {empty ? 'Chưa có' : `${s.model_count} mô hình`}
                  </span>
                </div>
                {!empty && (
                  <div className="flex justify-end">
                    <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-[#1E3F82]" />
                  </div>
                )}
              </>
            );
            return empty ? (
              <div key={s.slug} className="p-4 rounded-2xl border border-stone-100 flex flex-col gap-2 opacity-60">
                {body}
              </div>
            ) : (
              <Link
                key={s.slug}
                href={`/anatomy?system=${s.slug}`}
                className="group p-4 rounded-2xl border border-stone-100 hover:border-[#1E3F82]/30 hover:bg-[#F4F7FC] transition-all flex flex-col gap-2"
              >
                {body}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

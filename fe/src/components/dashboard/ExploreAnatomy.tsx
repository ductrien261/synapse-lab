'use client';

import Link from 'next/link';
import { ArrowRight, HeartPulseFill } from 'react-bootstrap-icons';
import { searchHref } from '@/lib/tracks';
import { ANATOMY_SYSTEMS } from '@/lib/anatomy-catalog';

export function ExploreAnatomy() {
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

      <div className="grid gap-3 sm:grid-cols-2">
        {ANATOMY_SYSTEMS.map((s) => (
          <Link
            key={s.key}
            href={searchHref('med', s.name)}
            className="group p-4 rounded-2xl border border-stone-100 hover:border-[#1E3F82]/30 hover:bg-[#F4F7FC] transition-all flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                <div>
                  <div className="text-sm font-bold text-stone-900 group-hover:text-[#1E3F82]">{s.name}</div>
                  <div className="text-xs text-stone-400">{s.en}</div>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                Sắp ra mắt
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
              <span className="truncate">{s.parts}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-stone-300 group-hover:text-[#1E3F82]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

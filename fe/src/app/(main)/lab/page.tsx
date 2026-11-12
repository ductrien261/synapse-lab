'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LAB_FIELDS, type LabExperiment, type LabField } from '@/lib/lab-catalog';
import { LabArt } from '@/components/lab/LabArt';

const TONES: Record<LabField['tone'], { card: string; chip: string }> = {
  blue: { card: 'from-[#EEF3FC] to-[#D6E3F8] text-[#1E3F82]', chip: 'bg-[#1E3F82]' },
  green: { card: 'from-[#ECFAF3] to-[#CFEFDF] text-[#0F6E56]', chip: 'bg-[#0F6E56]' },
  amber: { card: 'from-[#FBF1E6] to-[#F5DDBD] text-[#854F0B]', chip: 'bg-[#854F0B]' },
  violet: { card: 'from-[#F1EFFC] to-[#DEDAF6] text-[#534AB7]', chip: 'bg-[#534AB7]' },
};

type ModeFilter = 'all' | 'guided' | 'free';
const FILTERS: { key: ModeFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'guided', label: 'Học theo bài' },
  { key: 'free', label: 'Tự do chỉnh thử' },
];

export default function LabHomePage() {
  const [mode, setMode] = useState<ModeFilter>('all');

  return (
    <div className="flex flex-col gap-10 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold tracking-tight text-[#0F2258]">Hôm nay bạn muốn thử điều gì?</h1>
          <p className="mt-2 text-stone-600">
            Chỉnh một con số, xem chuyện gì xảy ra, rồi hỏi trợ lý vì sao. Mọi thí nghiệm chạy ngay trên trình duyệt.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Lọc theo cách học">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={mode === f.key}
              onClick={() => setMode(f.key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                mode === f.key ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-[#1E3F82]/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-10">
        {LAB_FIELDS.map((field) => (
          <FieldRow key={field.key} field={field} mode={mode} />
        ))}
      </div>
    </div>
  );
}

function FieldRow({ field, mode }: { field: LabField; mode: ModeFilter }) {
  const items = field.experiments.filter((e) => mode === 'all' || e.modes.includes(mode));
  const tone = TONES[field.tone];
  return (
    <section aria-label={field.name}>
      <div className="flex items-baseline gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${tone.chip}`} aria-hidden />
        <h2 className="text-xl font-bold text-[#0F2258]">{field.name}</h2>
        <p className="hidden text-sm text-stone-500 md:block">{field.pitch}</p>
      </div>
      <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-3">
        {items.map((e) => (
          <ExperimentCard key={e.slug} exp={e} toneClass={tone.card} />
        ))}
        <ComingSoonCard empty={field.experiments.length === 0} />
      </div>
    </section>
  );
}

function ExperimentCard({ exp, toneClass }: { exp: LabExperiment; toneClass: string }) {
  const soon = exp.status === 'soon';
  const body = (
    <article className="w-72 shrink-0 snap-start overflow-hidden rounded-2xl border border-stone-200 bg-white transition-shadow hover:shadow-md">
      <div className={`relative h-40 bg-gradient-to-br p-4 ${toneClass}`}>
        <LabArt name={exp.art} />
        {soon && <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold">Sắp mở</span>}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-stone-900">{exp.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-stone-500">{exp.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          <span>{exp.minutes} phút</span>
          <span>{exp.level}</span>
          {exp.modes.includes('guided') && <span className="font-semibold text-[#1E3F82]">Có bài hướng dẫn</span>}
        </div>
      </div>
    </article>
  );
  return soon ? <div aria-disabled>{body}</div> : <Link href={`/lab/${exp.slug}`}>{body}</Link>;
}

function ComingSoonCard({ empty }: { empty: boolean }) {
  return (
    <div className="flex h-[272px] w-72 shrink-0 snap-start items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 text-center text-sm text-stone-400">
      {empty ? 'Lĩnh vực này đang được chuẩn bị.' : 'Thêm thí nghiệm mới đang trên đường tới.'}
    </div>
  );
}

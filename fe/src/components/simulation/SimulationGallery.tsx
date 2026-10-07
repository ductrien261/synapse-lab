'use client';

import { useMemo, useState } from 'react';
import type { SimulationStep, Tone } from '@/lib/simulation';
import { SimulationRenderer } from './SimulationRenderer';
const PAGE_SIZE = 6;
const MAX_MILESTONES = 12;

function milestoneIndices(steps: SimulationStep[]) {
  let previous = '';
  const changed = steps.flatMap((step, index) => {
    const matrices = step.panels?.filter(panel => panel.kind === 'matrix');
    const state = JSON.stringify(step.graph ?? (matrices?.length ? matrices : step.panels)?.map(panel => ({ id: panel.id, cells: panel.cells.map(row => row.map(cell => cell.value)) })));
    const keep = index === 0 || index === steps.length - 1 || state !== previous;
    previous = state;
    return keep ? [index] : [];
  });
  if (changed.length <= MAX_MILESTONES) return changed;
  return Array.from({ length: MAX_MILESTONES }, (_, index) => changed[Math.round(index * (changed.length - 1) / (MAX_MILESTONES - 1))]);
}
const colors: Record<Tone, string> = { idle: 'bg-slate-100 text-slate-600', active: 'bg-amber-50 text-amber-700', rejected: 'bg-rose-50 text-rose-700', selected: 'bg-blue-50 text-blue-700', complete: 'bg-emerald-50 text-emerald-700' };
export function SimulationGallery({ steps, selected, onSelect }: { steps: SimulationStep[]; selected: number; onSelect: (index: number) => void }) {
  const [showAll, setShowAll] = useState(false);
  const indices = useMemo(() => showAll ? steps.map((_, index) => index) : milestoneIndices(steps), [showAll, steps]);
  const [requestedPage, setPage] = useState(() => {
    const position = indices.findIndex(index => index >= selected);
    return Math.floor((position < 0 ? indices.length - 1 : position) / PAGE_SIZE);
  });
  const pages = Math.max(1, Math.ceil(indices.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pages - 1);
  return <div className="p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-stone-500">{showAll ? `Tất cả ${steps.length} bước.` : `${indices.length} mốc chính trong ${steps.length} bước.`} Chọn một mốc để xem mô phỏng và code.</p>
      <button type="button" aria-pressed={showAll} onClick={() => { setShowAll(value => !value); setPage(0); }} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-[#1E3F82]">{showAll ? 'Thu gọn mốc chính' : 'Xem tất cả bước'}</button>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {indices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(index => {
        const step = steps[index];
        return <button key={index} type="button" onClick={() => onSelect(index)} aria-label={`Mở bước ${index + 1}: ${step.message}`} className={`overflow-hidden rounded-2xl border bg-white p-4 text-left transition-colors hover:border-[#1E3F82] focus-visible:outline-2 focus-visible:outline-[#1E3F82] ${selected === index ? 'border-[#1E3F82] ring-1 ring-[#1E3F82]' : 'border-stone-200'}`}>
          <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-[#243355]">Bước {index + 1}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors[step.action.tone]}`}>{step.action.label}</span></div>
          <SimulationRenderer step={step} compact />
          <div className="border-t border-stone-100 pt-3"><span className="block min-h-10 text-xs leading-5 text-stone-600">{step.message}</span><span className="mt-2 block text-[11px] font-mono text-stone-400">{step.metrics.map(metric => `${metric.label}: ${metric.value}`).join(' · ')}</span></div>
        </button>;
      })}
    </div>
    {pages > 1 && <div className="mt-4 flex items-center justify-between gap-3 text-xs"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-stone-200 px-3 py-2 text-stone-600 disabled:opacity-40">Trang trước</button><span className="text-stone-500">Trang {page + 1}/{pages}</span><button type="button" disabled={page === pages - 1} onClick={() => setPage(page + 1)} className="rounded-lg border border-stone-200 px-3 py-2 text-stone-600 disabled:opacity-40">Trang sau</button></div>}
  </div>;
}

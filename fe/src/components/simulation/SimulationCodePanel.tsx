'use client';

import { useEffect, useRef } from 'react';
import { CppCodeLine } from './CppCodeLine';
import type { SimulationFrame } from '@/lib/simulation';

export function SimulationCodePanel({ frame, annotation }: { frame: SimulationFrame | null; annotation?: { target: number; label: string; note: string } }) {
  const container = useRef<HTMLDivElement>(null);
  const active = frame?.step.codeLine ?? 0;
  const lines = (frame?.code.source ?? '').split('\n');
  const visibleLines = lines.map((text, index) => ({ text, number: index + 1 })).filter(line => !frame?.code.visibleLines || frame.code.visibleLines.includes(line.number));
  useEffect(() => {
    const box = container.current;
    const line = box?.querySelector<HTMLElement>(`[data-line="${active}"]`);
    if (!box || !line) return;
    const offset = line.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    if (offset < box.scrollTop || offset + line.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: Math.max(0, offset - box.clientHeight / 3), behavior: 'smooth' });
    }
  }, [active]);
  return <div className="min-w-0 space-y-3">
    {annotation && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 xl:hidden"><strong>{annotation.label}</strong><p className="mt-1">{annotation.note}</p>{annotation.target !== active && <p className="mt-1">↪ Dòng {annotation.target}</p>}</div>}
    <div ref={container} className="max-h-[640px] min-h-[320px] overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] [overflow-anchor:none] rounded-2xl border border-slate-700 bg-[#1E1E2E] py-3 font-mono text-xs leading-5 text-slate-200">
      {visibleLines.map(({ text: line, number }) => <div key={number} data-line={number} aria-current={active === number ? 'step' : undefined} className={`flex min-w-0 gap-3 border-l-4 px-2 py-0.5 ${active === number ? 'border-amber-400 bg-[#33405C] ring-1 ring-inset ring-amber-300/20' : 'border-transparent'}`}><span aria-hidden="true" className="w-2 shrink-0 text-amber-300">{active === number ? '▶' : ''}</span><span className={`w-6 shrink-0 select-none text-right ${active === number ? 'font-bold text-amber-300' : 'text-slate-500'}`}>{number}</span><pre data-code-line={number} className="m-0 min-w-0 flex-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{frame?.code.language === 'cpp' ? <CppCodeLine code={line.replace(/\t/g, '  ').replace(/\s*\/\/ @[a-z]+/, '') || ' '} /> : line.replace(/\s*\/\/ @[a-z]+/, '') || ' '}</pre>{active === number && annotation && <div className="hidden w-[240px] shrink-0 rounded-lg border border-amber-300/30 bg-[#273145] p-3 font-sans text-xs leading-5 xl:block"><p className="font-bold text-amber-200">{annotation.label}</p><p className="mt-1 text-slate-200">{annotation.note}</p>{annotation.target !== active && <p className="mt-2 font-mono text-[11px] text-sky-300">↪ Dòng {annotation.target}</p>}</div>}</div>)}
    </div>
  </div>;
}

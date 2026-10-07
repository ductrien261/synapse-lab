'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowCounterclockwise, PauseFill, PlayFill, SkipBackwardFill, SkipForwardFill } from 'react-bootstrap-icons';
import type { AlgorithmCodeLesson } from '@/lib/algorithm-api';
import { CppCodeLine } from './CppCodeLine';

export function AlgorithmCodeWriting({ lesson, title, onRun }: { lesson: AlgorithmCodeLesson; title: string; onRun?: () => void }) {
  const lines = lesson.source.split('\n').map((text, index) => ({ text, number: index + 1 })).filter(line => line.text.trim() && !line.text.trim().startsWith('//'));
  const stages = lesson.steps;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const activeLine = useRef<HTMLDivElement>(null);
  const stage = stages[index];
  const previousEnd = index > 0 ? stages[index - 1].end_line : 0;
  const atEnd = index === stages.length - 1;
  const running = playing && !atEnd;
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex(value => value + 1), 4500 / speed);
    return () => clearTimeout(timer);
  }, [running, index, speed]);
  useEffect(() => { activeLine.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [index]);
  const navigate = (next: number) => { setPlaying(false); setIndex(next); };
  if (!stage) return <p className="p-5 text-sm text-stone-500">Chưa có mã nguồn để hướng dẫn.</p>;
  return <div className="p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-[#243355]">Cùng viết {title}</h3><p className="mt-1 text-xs text-stone-500">Theo dõi từng đoạn code và lý do cần viết đoạn đó.</p></div><span className="text-xs font-semibold text-[#1E3F82]">Bước {index + 1}/{stages.length}</span></div>
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="h-[420px] min-w-0 overflow-auto rounded-2xl border border-slate-700 bg-[#1E1E2E] py-4 font-mono text-xs leading-6 sm:h-[540px]">
        {lines.filter(line => line.number <= stage.end_line).map((line) => <div key={line.number} ref={line.number === stage.start_line ? activeLine : undefined} aria-current={line.number === stage.start_line ? 'step' : undefined} className={`flex gap-4 border-l-4 px-3 py-0.5 ${line.number > previousEnd ? 'border-amber-400 bg-[#33405C]' : 'border-transparent'}`}><span className="w-6 shrink-0 select-none text-right text-slate-500">{line.number}</span><pre className="m-0 min-w-0 whitespace-pre-wrap break-words text-slate-200"><CppCodeLine code={line.text} /></pre></div>)}
        {!atEnd && <div className="px-14 py-2 text-slate-500" aria-hidden="true">▍</div>}
      </div>
      <aside className="rounded-2xl border border-[#DDE6F5] bg-[#F4F7FC] p-5" aria-live="polite"><span className="text-xs font-bold text-[#1E3F82]">{index === 0 ? 'Đầu tiên' : 'Tiếp theo'} · Dòng {stage.start_line}{stage.end_line > stage.start_line ? `–${stage.end_line}` : ''}</span><h4 className="mt-3 text-base font-bold text-[#243355]">{stage.title}</h4><p className="mt-3 text-sm leading-7 text-stone-700">{stage.note}</p><p className="mt-5 border-t border-[#DDE6F5] pt-3 text-xs leading-5 text-stone-500">{atEnd ? 'Đã hoàn thành mã nguồn. Bạn có thể xem lại từng bước để củng cố cách triển khai thuật toán.' : 'Phần vừa thêm được tô sáng. Nhấn Đi từng bước để viết tiếp.'}</p>{atEnd && onRun && <button type="button" onClick={onRun} className="mt-4 rounded-xl bg-[#243355] px-4 py-3 text-xs font-bold text-white">Chạy thử trên đồ thị →</button>}</aside>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><button type="button" aria-label="Lùi một bước viết code" disabled={index === 0} onClick={() => navigate(index - 1)} className="rounded-xl border border-stone-200 p-3 text-stone-600 disabled:opacity-40"><SkipBackwardFill /></button><button type="button" onClick={() => { if (atEnd) setIndex(0); setPlaying(!running); }} className="inline-flex items-center gap-2 rounded-xl bg-[#243355] px-4 py-3 text-xs font-bold text-white">{running ? <PauseFill /> : <PlayFill />}{running ? 'Tạm dừng' : 'Tự động chạy'}</button><button type="button" disabled={atEnd} onClick={() => navigate(index + 1)} className="inline-flex items-center gap-2 rounded-xl bg-[#E8F0FB] px-4 py-3 text-xs font-bold text-[#243355] disabled:opacity-40"><SkipForwardFill /> Đi từng bước</button><button type="button" aria-label="Viết lại từ đầu" onClick={() => navigate(0)} className="rounded-xl border border-stone-200 p-3 text-stone-600"><ArrowCounterclockwise /></button></div><label className="text-xs text-stone-500">Tốc độ: <select value={speed} onChange={event => setSpeed(Number(event.target.value))} className="rounded-lg border border-stone-200 p-2"><option value={0.5}>0.5x</option><option value={1}>1x</option><option value={2}>2x</option></select></label></div>
  </div>;
}

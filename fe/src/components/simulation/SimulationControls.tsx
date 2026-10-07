'use client';

import { ArrowCounterclockwise, PauseFill, PlayFill, SkipBackwardFill, SkipForwardFill } from 'react-bootstrap-icons';
import type { useSimulationPlayback } from './useSimulationPlayback';
export function SimulationControls({ playback, summary }: { playback: ReturnType<typeof useSimulationPlayback>; summary: string }) {
  const { index, running, atEnd, speed, setSpeed, navigate, toggle } = playback;
  return <div className="border-t border-stone-100 p-4 sm:px-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2">
      <button type="button" aria-label="Lùi một bước" disabled={index === 0} onClick={() => navigate(index - 1)} className="rounded-xl border border-stone-200 p-3 text-stone-600 disabled:opacity-40"><SkipBackwardFill /></button>
      <button type="button" onClick={toggle} className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[#243355] px-4 py-3 text-xs font-bold text-white">{running ? <PauseFill /> : <PlayFill />}{running ? 'Tạm dừng' : atEnd ? 'Chạy lại' : index > 0 ? 'Tiếp tục' : 'Tự động chạy'}</button>
      <button type="button" disabled={atEnd} onClick={() => navigate(index + 1)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-[#DDE6F5] bg-[#E8F0FB] px-4 py-3 text-xs font-bold text-[#243355] disabled:opacity-40"><SkipForwardFill /> Đi từng bước</button>
      <button type="button" aria-label="Chạy lại từ đầu" onClick={() => navigate(0)} className="rounded-xl border border-stone-200 p-3 text-stone-600"><ArrowCounterclockwise /></button>
    </div><label className="flex items-center gap-2 whitespace-nowrap text-xs text-stone-500">Tốc độ:<select value={speed} onChange={event => setSpeed(Number(event.target.value))} className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2"><option value={0.5}>0.5x Chậm</option><option value={1}>1.0x Chuẩn</option><option value={2}>2.0x Nhanh</option></select></label></div>
    {atEnd && <p className="mt-2 text-xs leading-relaxed text-emerald-700">{summary}</p>}
  </div>;
}

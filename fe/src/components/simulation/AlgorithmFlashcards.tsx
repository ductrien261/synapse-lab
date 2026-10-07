'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowRepeat } from 'react-bootstrap-icons';
import type { AlgorithmFlashcard, AlgorithmTutorSource } from '@/lib/algorithm-api';

export function AlgorithmFlashcards({ cards, sources = [] }: { cards: AlgorithmFlashcard[]; sources?: AlgorithmTutorSource[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];
  if (!card) return null;

  const go = (next: number) => { setIndex(next); setFlipped(false); };
  return <div className="space-y-3">
    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500"><span>Thẻ {index + 1}/{cards.length}</span><span>{flipped ? 'Mặt sau · đáp án' : 'Mặt trước · câu hỏi'}</span></div>
    <div className="h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full bg-[#1E3F82]" style={{ width: `${((index + 1) / cards.length) * 100}%` }} /></div>
    <button
      type="button"
      onClick={() => setFlipped(value => !value)}
      aria-label={flipped ? 'Lật về câu hỏi' : 'Lật xem đáp án'}
      className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-[#C9D8EF] bg-[#F8FAFE] px-5 py-6 text-center text-sm leading-6 text-[#243355] shadow-sm hover:border-[#1E3F82]"
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#1E3F82]">{flipped ? 'Đáp án' : 'Câu hỏi'}</span>
      <span className="whitespace-pre-wrap font-semibold">{flipped ? card.back : card.front}</span>
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500"><ArrowRepeat /> Nhấn để lật thẻ</span>
    </button>
    {flipped && card.source_index && sources[card.source_index - 1] && <div className="rounded-lg border border-stone-200 bg-white p-2.5 text-[11px] text-stone-600">
      <span className="font-semibold text-[#1E3F82]">Nguồn: {sources[card.source_index - 1].title}</span>
      {card.source_quote && <p className="mt-1">“{card.source_quote}”</p>}
      {sources[card.source_index - 1].url && <a href={sources[card.source_index - 1].url} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-[#1E3F82] hover:underline">Mở tài liệu ↗</a>}
    </div>}
    <div className="flex items-center justify-between gap-2">
      <button type="button" disabled={index === 0} onClick={() => go(index - 1)} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 font-semibold text-[#243355] disabled:opacity-40"><ArrowLeft /> Trước</button>
      <button type="button" disabled={index === cards.length - 1} onClick={() => go(index + 1)} className="inline-flex items-center gap-1 rounded-lg bg-[#1E3F82] px-3 py-2 font-semibold text-white disabled:opacity-40">Tiếp <ArrowRight /></button>
    </div>
  </div>;
}

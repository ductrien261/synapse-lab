'use client';

import { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'react-bootstrap-icons';
import type { AlgorithmLessonBlock } from '@/lib/algorithm-api';
import { BlockContent } from './AlgorithmLessonBlocks';

const PAGE_SIZE = 8;

export function AlgorithmPracticePanel({ exercises }: { exercises: AlgorithmLessonBlock[] }) {
  const [selected, setSelected] = useState('');
  const [page, setPage] = useState(0);
  const current = exercises.find(block => block.id === selected);
  const pageCount = Math.ceil(exercises.length / PAGE_SIZE);
  const visible = exercises.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return <section className="overflow-hidden rounded-2xl border border-[#DDE6F5] bg-white">
    {current ? <div>
      <div className="px-5 pt-5"><button type="button" onClick={() => setSelected('')} className="inline-flex items-center gap-2 text-xs font-semibold text-[#1E3F82] hover:underline"><ArrowLeft />Danh sách bài tập</button></div>
      <BlockContent key={current.id} block={current} displayTitle={current.title} />
    </div> : <div className="p-5">
      <h3 className="text-sm font-bold text-[#243355]">Danh sách bài tập</h3>
      <p className="mb-5 mt-2 text-sm text-stone-500">Chọn một bài tập để bắt đầu.</p>
      <div className="grid gap-3 sm:grid-cols-2">{visible.map((item, index) => <button key={item.id} type="button" onClick={() => setSelected(item.id)} className="flex min-w-0 items-center gap-3 rounded-xl border border-stone-200 p-4 text-left transition-colors hover:border-[#1E3F82]/40 hover:bg-[#F4F7FC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3F82]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F0FB] text-xs font-bold text-[#1E3F82]">{page * PAGE_SIZE + index + 1}</span><span className="min-w-0 flex-1"><span className="block text-xs text-stone-500">{item.kind === 'example' ? 'Ví dụ' : 'Bài tập'}</span><span className="block text-sm font-semibold text-[#243355]">{item.title}</span></span><ChevronRight className="shrink-0 text-stone-400" /></button>)}</div>
      {pageCount > 1 && <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-100 pt-4 text-xs"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-stone-200 px-3 py-2 font-semibold text-[#1E3F82] disabled:opacity-40">Trang trước</button><span className="text-stone-500" aria-live="polite">Trang {page + 1}/{pageCount}</span><button type="button" disabled={page === pageCount - 1} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-stone-200 px-3 py-2 font-semibold text-[#1E3F82] disabled:opacity-40">Tiếp theo</button></div>}
    </div>}
  </section>;
}

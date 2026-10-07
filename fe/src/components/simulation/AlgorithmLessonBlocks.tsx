'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { AlgorithmLessonBlock } from '@/lib/algorithm-api';
import { lessonImageUrl } from './lesson-image';

export function AlgorithmLessonBlocks({ blocks }: { blocks: AlgorithmLessonBlock[] }) {
  const items = blocks.filter(block => block.kind === 'theory');
  if (!items.length) return null;
  return <section className="min-w-0 overflow-hidden rounded-3xl border border-stone-200 bg-white">
    <div className="border-b border-stone-100 p-4"><h2 className="inline-flex rounded-xl bg-[#1E3F82] px-4 py-2 text-xs font-bold text-white">Kiến thức cần học</h2></div>
    <div className="px-5 sm:px-6">
      {items.map((item, index) => <details id={`lesson-${item.id}`} key={item.id} className="group scroll-mt-24 border-b border-stone-100 last:border-b-0">
        <summary className="flex cursor-pointer list-none items-start gap-2 rounded-lg py-6 text-[#243355] transition-colors hover:text-[#1E3F82] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3F82] sm:items-center sm:py-8 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="mt-0.5 shrink-0 text-sm transition-transform group-open:rotate-90 sm:mt-0">▶</span>
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-sm font-bold leading-6 sm:text-base">{index + 1}. {item.title}</span><span className="text-xs font-normal text-stone-400 sm:text-sm">Lý thuyết{item.image && ' · Có hình'}</span></span>
        </summary>
        <BlockContent block={item} embedded />
      </details>)}
    </div>
  </section>;
}

export function BlockContent({ block, embedded = false, displayTitle }: { block: AlgorithmLessonBlock; embedded?: boolean; displayTitle?: string }) {
  const imageUrl = lessonImageUrl(block);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hint, setHint] = useState(false);
  return <article className={embedded ? 'pb-6 pl-5 sm:pb-8' : 'border-t border-stone-100 p-5'}>
    {!embedded && <h3 className="text-sm font-bold text-[#243355]">{displayTitle ?? block.title}</h3>}
    <p className={`${embedded ? '' : 'mt-3'} whitespace-pre-wrap text-sm leading-7 text-stone-600`}>{block.text}</p>
    {imageUrl && <figure className="my-5"><Image unoptimized width={800} height={500} src={imageUrl} alt={block.alt} className="h-auto max-h-96 w-full object-contain" /><figcaption className="mt-2 text-xs leading-6 text-stone-500">{block.caption}</figcaption></figure>}
    {block.kind === 'exercise' && <div className="mt-4 space-y-3">{block.answerType === 'choice' ? <fieldset className="space-y-2"><legend className="mb-2 text-xs font-bold text-stone-700">Chọn đáp án</legend>{block.options.split('\n').filter(Boolean).map((option, i) => <label key={i} className="flex items-center gap-2 rounded-xl border border-stone-200 p-3 text-sm text-stone-600"><input type="radio" name={`answer-${block.id}`} value={option} checked={answer === option} onChange={() => { setAnswer(option); setSubmitted(false); }} />{option}</label>)}</fieldset> : <label className="block text-xs font-semibold text-stone-700">{block.answerType === 'short' ? 'Đáp án của bạn' : 'Phần giải thích của bạn'}<textarea rows={block.answerType === 'short' ? 2 : 4} value={answer} onChange={event => { setAnswer(event.target.value); setSubmitted(false); }} className="mt-2 w-full rounded-xl border border-stone-200 p-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#1E3F82]/20" /></label>}<div className="flex gap-3"><button type="button" disabled={!answer.trim()} onClick={() => setSubmitted(true)} className="rounded-xl bg-[#1E3F82] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Đối chiếu lời giải</button>{block.hint && <button type="button" onClick={() => setHint(!hint)} className="text-xs font-semibold text-[#1E3F82]">{hint ? 'Ẩn gợi ý' : 'Xem gợi ý'}</button>}</div>{hint && <p className="text-sm text-stone-600">{block.hint}</p>}{submitted && <div className="rounded-xl bg-stone-50 p-4 text-sm leading-7 text-stone-600"><h4 className="mb-2 text-xs font-bold text-[#243355]">Đáp án tham khảo</h4><p className="whitespace-pre-wrap">{[block.answer, block.solution].filter(Boolean).join('\n\n') || 'Bài này chưa có lời giải tham khảo.'}</p></div>}</div>}
    {block.kind === 'example' && block.solution && <details className="mt-4 text-sm text-stone-600"><summary className="cursor-pointer font-semibold text-[#1E3F82]">Xem lời giải</summary><p className="mt-3 whitespace-pre-wrap leading-7">{block.solution}</p></details>}
    {block.source.startsWith('https://') && <a href={block.source} target="_blank" rel="noreferrer" className="mt-5 inline-block text-xs font-semibold text-[#1E3F82]">Tài liệu gốc ↗</a>}
  </article>;
}

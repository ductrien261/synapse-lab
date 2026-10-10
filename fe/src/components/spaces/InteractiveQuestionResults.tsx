'use client';

import { useState } from 'react';
import type { LiveQuestionDeck } from './InteractiveQuestionDemo';

export function QuestionResultsCard({ deck, counts }: { deck: LiveQuestionDeck; counts: number[][] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const index = Math.min(activeIndex, deck.questions.length - 1);
  const question = deck.questions[index];
  const answers = counts[index] ?? [];
  const total = answers.reduce((sum, count) => sum + count, 0);

  return <div className="space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="text-base font-bold text-[#0F2258]">Kết quả tương tác</h3><p className="mt-0.5 text-xs text-slate-500">{deck.questions.length} câu hỏi · Cập nhật theo lượt gửi</p></div>
      <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#243F88]">{total} trả lời</span>
    </div>
    {deck.questions.length > 1 && <div role="group" aria-label="Chọn câu hỏi xem kết quả" className="flex flex-wrap gap-1.5">
      {deck.questions.map((_, questionIndex) => <button key={questionIndex} type="button" onClick={() => setActiveIndex(questionIndex)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${index === questionIndex ? 'border-[#243F88] bg-[#243F88] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>Câu {questionIndex + 1}</button>)}
    </div>}
    <div><p className="mb-3 text-sm font-bold leading-6 text-slate-900">{question.question}</p>
      <div className="space-y-2.5">{question.options.map((option, optionIndex) => {
        const count = answers[optionIndex] ?? 0;
        const percent = total ? Math.round(count / total * 100) : 0;
        const correct = question.kind !== 'poll' && question.correctOption === optionIndex;
        return <div key={optionIndex} className={`rounded-xl border px-3 py-2.5 ${correct ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0 leading-5 text-slate-800"><strong className="mr-1.5 text-[#243F88]">{String.fromCharCode(65 + optionIndex)}.</strong>{option}{correct && <span className="ml-1.5 font-semibold text-emerald-700">· Đúng</span>}</span><span className="shrink-0 font-semibold tabular-nums text-slate-700">{count} · {percent}%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${correct ? 'bg-emerald-500' : 'bg-[#4A70C1]'}`} style={{ width: `${percent}%` }} /></div>
        </div>;
      })}</div>
    </div>
    {total === 0 && <p className="text-center text-xs text-slate-500">Chưa có người học gửi câu trả lời cho câu này.</p>}
  </div>;
}

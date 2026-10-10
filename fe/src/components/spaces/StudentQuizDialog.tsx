'use client';

import { useEffect, useState } from 'react';
import type { PresentationQuizRun } from './classroom-api';

interface Props {
  run: PresentationQuizRun;
  pending: boolean;
  error: string;
  onSubmit: (option: number) => void;
}

export function StudentQuizDialog({ run, pending, error, onSubmit }: Props) {
  const [choice, setChoice] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(run.remaining_seconds);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((new Date(run.closes_at).getTime() - Date.now()) / 1000)));
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [run.closes_at]);

  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4">
    <form role="dialog" aria-modal="true" aria-labelledby="student-quiz-question" onSubmit={(event) => { event.preventDefault(); if (choice !== null && remaining > 0) onSubmit(choice); }} className="my-auto w-full max-w-[500px] rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 shadow-[0_12px_40px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="mb-4 flex justify-end"><span className={`text-xs font-semibold ${remaining <= 10 ? 'text-rose-600' : 'text-stone-500'}`}>Còn {remaining} giây</span></div>
      <h2 id="student-quiz-question" className="mb-5 text-base font-bold leading-7 sm:text-lg">{run.quiz.question}</h2>
      <fieldset disabled={pending || run.status !== 'open' || remaining === 0} className="grid gap-2.5">
        <legend className="sr-only">Chọn đáp án</legend>
        {run.quiz.options.map((option, index) => <label key={index} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm leading-6 transition-colors ${choice === index ? 'border-[#243F88] bg-blue-50' : 'border-stone-200 hover:border-blue-200'}`}><input type="radio" name="quiz-answer" value={index} checked={choice === index} onChange={() => setChoice(index)} className="mt-1 accent-[#243F88]" /><span><strong className="mr-2 text-[#243F88]">{String.fromCharCode(65 + index)}.</strong>{option}</span></label>)}
      </fieldset>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <button type="submit" disabled={choice === null || pending || run.status !== 'open' || remaining === 0} className="mt-5 w-full rounded-xl bg-[#243F88] px-4 py-3 text-sm font-bold text-white hover:bg-[#1B326D] disabled:cursor-not-allowed disabled:opacity-50">{pending ? 'Đang gửi…' : 'Gửi câu trả lời'}</button>
    </form>
  </div>;
}

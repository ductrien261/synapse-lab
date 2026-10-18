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

export function StudentQuizResultDialog({ run, onClose }: { run: PresentationQuizRun; onClose: () => void }) {
  if (run.selected_option === null || run.correct_option === undefined) return null;
  const correct = run.is_correct ?? run.selected_option === run.correct_option;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="student-quiz-result" className="w-full max-w-[480px] rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-2xl">
      <div className={`rounded-2xl p-4 text-center ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
        <p className="text-3xl" aria-hidden="true">{correct ? '✓' : '!'}</p>
        <h2 id="student-quiz-result" className="mt-1 text-lg font-extrabold">{correct ? 'Chính xác!' : 'Chưa chính xác'}</h2>
        <p className="mt-1 text-xs">Kết quả đã được lưu vào báo cáo buổi học.</p>
      </div>
      <p className="mt-5 text-sm font-bold leading-6">{run.quiz.question}</p>
      <div className="mt-3 space-y-2 text-sm">
        <p className="rounded-xl border border-stone-200 p-3"><span className="text-stone-500">Bạn chọn:</span> <strong>{run.quiz.options[run.selected_option]}</strong></p>
        {!correct && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><span className="text-emerald-700">Đáp án đúng:</span> <strong>{run.quiz.options[run.correct_option]}</strong></p>}
      </div>
      <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-[#243F88] px-4 py-3 text-sm font-bold text-white hover:bg-[#1B326D]">Đã hiểu</button>
    </section>
  </div>;
}

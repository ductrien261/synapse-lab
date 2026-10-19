'use client';

import { useEffect, useState } from 'react';

export function QuizStartingCountdown({ title, remainingMs, compact = false }: { title: string; remainingMs: number; compact?: boolean }) {
  const [deadline] = useState(() => Date.now() + remainingMs);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil(remainingMs / 1000)));

  useEffect(() => {
    let timer: number;
    const update = () => {
      const milliseconds = Math.max(0, deadline - Date.now());
      setRemaining(Math.ceil(milliseconds / 1000));
      if (milliseconds > 0) timer = window.setTimeout(update, Math.min(250, (milliseconds % 1000) + 20));
    };
    update();
    return () => window.clearTimeout(timer);
  }, [deadline]);

  if (remaining <= 0) return null;
  if (compact) return <div className="synapse-quiz-corner absolute z-[90] flex max-w-[300px] items-center gap-3 rounded-2xl border border-violet-200 bg-white/95 p-3 text-slate-900 shadow-xl backdrop-blur" role="status" aria-live="polite">
    <div className="relative grid h-12 w-12 shrink-0 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="#EDE9FE" strokeWidth="4" /><circle className="synapse-countdown-ring" cx="24" cy="24" r="20" pathLength="100" fill="none" stroke="#7C3AED" strokeLinecap="round" strokeWidth="4" style={{ animationDuration: `${Math.max(1, remainingMs)}ms` }} /></svg>
      <strong key={remaining} className="synapse-countdown-number text-lg text-violet-700">{remaining}</strong>
    </div>
    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">Sắp phát quiz</p><p className="truncate text-xs font-bold text-[#0F2258]">{title}</p></div>
  </div>;
  return <div className="fixed inset-0 z-[99] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" role="status" aria-live="assertive">
    <section className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-white text-center text-slate-900 shadow-2xl">
      <div key={remaining} className="synapse-countdown-number mx-auto mt-8 grid h-24 w-24 place-items-center rounded-full bg-violet-600 text-5xl font-black text-white shadow-[0_14px_35px_rgba(124,58,237,0.35)]">{remaining}</div>
      <div className="px-6 pb-7 pt-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Quiz sắp bắt đầu</p><h2 className="mt-2 text-lg font-extrabold leading-7 text-[#0F2258]">{title}</h2><p className="mt-2 text-sm text-slate-500">Chuẩn bị chọn đáp án. Câu hỏi sẽ hiện ngay sau đếm ngược.</p></div>
      <div className="h-1.5 bg-violet-100"><div className="synapse-countdown-progress h-full origin-left bg-violet-600" style={{ animationDuration: `${Math.max(1, remainingMs)}ms` }} /></div>
    </section>
  </div>;
}

function ProgressRing({ progress, children, tone = '#2563EB' }: { progress: number; children: React.ReactNode; tone?: string }) {
  return <div className="relative grid h-14 w-14 shrink-0 place-items-center">
    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="23" fill="white" stroke="#E2E8F0" strokeWidth="5" /><circle cx="28" cy="28" r="23" pathLength="100" fill="none" stroke={tone} strokeDasharray="100" strokeDashoffset={100 - Math.min(100, Math.max(0, progress))} strokeLinecap="round" strokeWidth="5" className="transition-[stroke-dashoffset] duration-300" /></svg>
    <span className="relative text-center text-xs font-extrabold text-slate-800">{children}</span>
  </div>;
}

export function TeacherQuizStatus({ run }: { run: import('./classroom-api').PresentationQuizRun }) {
  const total = run.participant_count;
  const answered = run.response_count;
  const progress = total ? answered * 100 / total : 0;
  const responses = run.results?.responses || [];
  return <details className="synapse-quiz-corner absolute z-[89] text-slate-900">
    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-xl backdrop-blur marker:hidden">
      <ProgressRing progress={progress}>{answered}/{total}</ProgressRing>
      <span className="pr-1"><span className="block text-[10px] font-bold uppercase tracking-wide text-blue-600">Quiz đang diễn ra</span><span className="block max-w-44 truncate text-xs font-bold text-[#0F2258]">Đã trả lời</span></span>
    </summary>
    <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
      <p className="truncate text-sm font-bold text-[#0F2258]">{run.quiz.title}</p>
      <p className="mt-1 text-xs text-slate-500">{answered}/{total} học viên đã gửi đáp án</p>
      <div className="mt-3 max-h-44 space-y-1 overflow-y-auto">{responses.length ? responses.map((response) => <p key={response.user_id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs font-semibold"><span className="text-emerald-600">✓</span><span className="truncate">{response.name}</span></p>) : <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">Chưa có học viên trả lời.</p>}</div>
    </div>
  </details>;
}

export function StudentQuizWaiting({ run }: { run: import('./classroom-api').PresentationQuizRun }) {
  const [deadline] = useState(() => Date.now() + run.remaining_ms);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil(run.remaining_ms / 1000)));
  useEffect(() => {
    let timer: number;
    const update = () => {
      const milliseconds = Math.max(0, deadline - Date.now());
      setRemaining(Math.ceil(milliseconds / 1000));
      if (milliseconds > 0) timer = window.setTimeout(update, Math.min(250, (milliseconds % 1000) + 20));
    };
    update();
    return () => window.clearTimeout(timer);
  }, [deadline]);
  if (remaining <= 0) return null;
  const progress = run.quiz.duration_seconds ? remaining * 100 / run.quiz.duration_seconds : 0;
  return <div className="fixed right-4 top-20 z-[90] flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white/95 p-3 text-slate-900 shadow-xl backdrop-blur" role="status" aria-live="polite">
    <ProgressRing progress={progress} tone="#059669">{remaining}s</ProgressRing>
    <div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Đã gửi đáp án</p><p className="text-xs font-bold text-[#0F2258]">Đang chờ kết quả…</p></div>
  </div>;
}

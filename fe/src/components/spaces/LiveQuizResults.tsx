'use client';

import type { PresentationQuizRun } from './classroom-api';

export function LiveQuizResults({ run, pending, onCloseQuiz }: {
  run: PresentationQuizRun;
  pending: boolean;
  onCloseQuiz: () => void;
}) {
  const results = run.results;
  const responseRate = results?.response_rate_percent ?? 0;
  const accuracy = results?.accuracy_percent ?? 0;
  return <section className="rounded-xl bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Kết quả trực tiếp</p><h4 className="mt-1 text-base font-bold">{run.quiz.question}</h4></div>
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${run.status === 'open' ? 'bg-violet-50 text-violet-700' : 'bg-stone-100 text-stone-600'}`}>{run.status === 'open' ? `Còn ${run.remaining_seconds} giây` : 'Đã đóng'}</span>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric label="Phản hồi" value={`${run.response_count}/${run.participant_count}`} />
      <Metric label="Tham gia" value={`${responseRate}%`} />
      <Metric label="Đúng" value={`${results?.correct_count ?? 0}`} />
      <Metric label="Độ chính xác" value={`${accuracy}%`} tone={results?.meets_threshold ? 'text-emerald-700' : 'text-amber-700'} />
    </div>
    <div className="mt-4 grid gap-2">
      {run.quiz.options.map((option, index) => {
        const count = results?.option_counts[index] ?? 0;
        const percent = run.response_count ? Math.round(count * 100 / run.response_count) : 0;
        const correct = results?.correct_option === index;
        return <div key={index} className={`rounded-xl border p-3 ${correct ? 'border-emerald-300 bg-emerald-50/60' : 'border-stone-200'}`}>
          <div className="flex items-center gap-2 text-sm"><strong>{String.fromCharCode(65 + index)}.</strong><span className="min-w-0 flex-1 truncate">{option}</span><span className="text-xs font-bold">{count} · {percent}%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${correct ? 'bg-emerald-500' : 'bg-violet-400'}`} style={{ width: `${percent}%` }} /></div>
        </div>;
      })}
    </div>
    {results && results.responses.length > 0 && <details className="mt-4 rounded-xl border border-stone-200">
      <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold text-slate-700">Chi tiết {results.responses.length} học viên</summary>
      <div className="max-h-48 overflow-auto border-t border-stone-100">
        {results.responses.map((response) => <div key={response.user_id} className="flex items-center gap-3 border-b border-stone-100 px-3 py-2.5 text-xs last:border-0"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold ${response.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{response.is_correct ? '✓' : '×'}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{response.name}</span><span className="block truncate text-[10px] text-stone-400">{response.email}</span></span><span className="shrink-0 font-bold">{String.fromCharCode(65 + response.selected_option)}</span></div>)}
      </div>
    </details>}
    {run.status === 'open' && <button type="button" disabled={pending} onClick={onCloseQuiz} className="mt-4 w-full rounded-lg bg-violet-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Đóng quiz và công bố kết quả</button>}
  </section>;
}

function Metric({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase text-stone-400">{label}</p><p className={`mt-1 text-lg font-extrabold ${tone}`}>{value}</p></div>;
}

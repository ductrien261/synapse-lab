'use client';

import { useEffect, useState } from 'react';
import { BarChartFill, CheckCircleFill, X } from 'react-bootstrap-icons';
import { classroomApi, type QuizReport, type QuizReportRun } from './classroom-api';

const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Đang diễn ra';

export function QuizReportPanel({ roomCode, open, onClose }: { roomCode: string; open: boolean; onClose: () => void }) {
  const [report, setReport] = useState<QuizReport | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [runId, setRunId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    classroomApi.quizReport(roomCode).then((next) => {
      if (!active) return;
      setReport(next);
      setSessionId((current) => current && next.sessions.some((item) => item.id === current) ? current : next.sessions[0]?.id || '');
      setError('');
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải báo cáo quiz.');
    });
    return () => { active = false; };
  }, [open, roomCode]);

  const session = report?.sessions.find((item) => item.id === sessionId) || report?.sessions[0];
  const run = session?.runs.find((item) => item.id === runId) || session?.runs[0];

  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45" role="presentation">
    <button type="button" aria-label="Đóng báo cáo" onClick={onClose} className="absolute inset-0" />
    <aside role="dialog" aria-modal="true" aria-labelledby="quiz-report-title" className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden bg-[#F6F7FB] text-stone-900 shadow-2xl">
      <header className="flex items-start justify-between border-b border-stone-200 bg-white px-5 py-4">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Teacher Studio</p><h2 id="quiz-report-title" className="mt-1 text-lg font-extrabold">Báo cáo quiz</h2><p className="mt-1 text-xs text-stone-500">Kết quả được lưu theo từng buổi học và từng học viên.</p></div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg border border-stone-200 p-2 hover:bg-stone-50"><X size={18} /></button>
      </header>
      {error && <p role="alert" className="m-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!report && !error ? <div className="flex flex-1 items-center justify-center text-sm text-stone-500">Đang tổng hợp kết quả…</div> : !report || report.summary.quiz_run_count === 0 ? <EmptyReport /> : <>
        <div className="grid grid-cols-2 gap-2 border-b border-stone-200 p-4 sm:grid-cols-4">
          <Summary label="Buổi học" value={report.summary.session_count} />
          <Summary label="Quiz đã phát" value={report.summary.quiz_run_count} />
          <Summary label="Lượt trả lời" value={report.summary.response_count} />
          <Summary label="Độ chính xác" value={`${report.summary.accuracy_percent}%`} accent />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav className="overflow-y-auto border-b border-stone-200 bg-white p-3 lg:border-b-0 lg:border-r" aria-label="Các buổi học">
            {report.sessions.map((item) => <button key={item.id} type="button" onClick={() => setSessionId(item.id)} className={`mb-2 w-full rounded-xl border p-3 text-left ${session?.id === item.id ? 'border-blue-300 bg-blue-50' : 'border-stone-200 hover:bg-stone-50'}`}><span className="block truncate text-sm font-bold">{item.title}</span><span className="mt-1 block text-[10px] text-stone-500">{dateTime(item.started_at)} · {item.quiz_count} quiz</span><span className="mt-2 block text-xs font-semibold text-[#1E3F82]">{item.response_count} phản hồi · đúng {item.accuracy_percent}%</span></button>)}
          </nav>
          <main className="min-h-0 overflow-y-auto p-4 sm:p-5">
            {session && <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold">{session.title}</h3><p className="text-xs text-stone-500">{session.participant_count} học viên · {dateTime(session.started_at)} — {dateTime(session.ended_at)}</p></div><select aria-label="Chọn quiz" value={run?.id || ''} onChange={(event) => setRunId(event.target.value)} className="max-w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold">{session.runs.map((item) => <option key={item.id} value={item.id}>{item.quiz.title}</option>)}</select></div>}
            {run ? <RunReport run={run} /> : <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Buổi học này chưa phát quiz.</div>}
          </main>
        </div>
      </>}
    </aside>
  </div>;
}

function RunReport({ run }: { run: QuizReportRun }) {
  return <div className="space-y-4">
    <section className="rounded-2xl border border-stone-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-violet-600">{run.quiz.title}</p><h4 className="mt-1 text-base font-extrabold">{run.quiz.question}</h4></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${run.meets_threshold ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{run.meets_threshold ? 'Đạt mục tiêu' : `Dưới ngưỡng ${run.quiz.success_threshold}%`}</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Summary label="Tham gia" value={`${run.response_rate_percent}%`} /><Summary label="Đã trả lời" value={`${run.response_count}/${run.participant_count}`} /><Summary label="Trả lời đúng" value={run.correct_count} /><Summary label="Độ chính xác" value={`${run.accuracy_percent}%`} accent /></div>
      <div className="mt-4 space-y-2">{run.quiz.options.map((option, index) => { const count = run.option_counts[index] || 0; const percent = run.response_count ? Math.round(count * 100 / run.response_count) : 0; const correct = run.quiz.correct_option === index; return <div key={index} className={`rounded-xl border p-3 ${correct ? 'border-emerald-300 bg-emerald-50/60' : 'border-stone-200'}`}><div className="flex gap-2 text-sm"><strong>{String.fromCharCode(65 + index)}.</strong><span className="min-w-0 flex-1">{option}</span><span className="shrink-0 font-bold">{count} · {percent}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className={`h-full ${correct ? 'bg-emerald-500' : 'bg-violet-400'}`} style={{ width: `${percent}%` }} /></div></div>; })}</div>
    </section>
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="flex items-center justify-between border-b border-stone-100 px-4 py-3"><h4 className="text-sm font-extrabold">Kết quả học viên</h4><span className="text-xs text-stone-500">{run.unanswered_count} chưa trả lời</span></div>{run.responses.length === 0 ? <p className="p-6 text-center text-sm text-stone-500">Chưa có câu trả lời.</p> : <div className="divide-y divide-stone-100">{run.responses.map((response) => <div key={response.user_id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${response.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{response.is_correct ? <CheckCircleFill size={14} /> : '×'}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{response.name}</span><span className="block truncate text-[10px] text-stone-400">{response.email}</span></span><span className="text-xs font-bold">Chọn {String.fromCharCode(65 + response.selected_option)}</span></div>)}</div>}</section>
  </div>;
}

function Summary({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) { return <div className="rounded-xl border border-stone-200 bg-white p-3"><p className="text-[9px] font-bold uppercase text-stone-400">{label}</p><p className={`mt-1 text-xl font-extrabold ${accent ? 'text-violet-700' : 'text-slate-900'}`}>{value}</p></div>; }
function EmptyReport() { return <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><BarChartFill size={22} /></span><h3 className="mt-4 text-sm font-extrabold">Chưa có kết quả quiz</h3><p className="mt-2 max-w-sm text-xs leading-5 text-stone-500">Sau khi phát quiz trong phòng học, kết quả sẽ tự động xuất hiện tại đây.</p></div>; }

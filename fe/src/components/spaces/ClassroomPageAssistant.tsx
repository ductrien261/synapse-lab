'use client';

import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { ArrowClockwise, BarChartFill, Check2Circle, Lightbulb, Stars, X } from 'react-bootstrap-icons';
import { classroomApi, type ClassroomCopilotResult, type PresentationState } from './classroom-api';
import { POLL_UPDATE_TOPIC } from './RealtimePoll';

interface Props {
  roomCode: string;
  presentation: PresentationState;
}

export function ClassroomPageAssistant({ roomCode, presentation }: Props) {
  const room = useRoomContext();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ClassroomCopilotResult | null>(null);
  const [pending, setPending] = useState(false);
  const [pollPending, setPollPending] = useState(false);
  const [pollSent, setPollSent] = useState(false);
  const [error, setError] = useState('');
  const stage = presentation.stage;
  const page = presentation.stage_page;
  const contextMatches = Boolean(result && stage && result.context.resource_id === stage.id && result.context.page === page);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!stage || stage.kind !== 'pdf') return null;

  const analyze = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    setPollSent(false);
    try {
      setResult(await classroomApi.classroomCopilot(roomCode, { resourceId: stage.id, page }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể phân tích trang hiện tại.');
    } finally {
      setPending(false);
    }
  };

  const startSuggestedPoll = async () => {
    if (!result || pollPending || !contextMatches) return;
    setPollPending(true);
    setError('');
    try {
      await classroomApi.startPoll(roomCode, {
        question: result.poll.question,
        options: result.poll.options,
        duration_seconds: 60,
        is_anonymous: true,
      });
      await room.localParticipant.publishData(new TextEncoder().encode('updated'), {
        reliable: true,
        topic: POLL_UPDATE_TOPIC,
      }).catch(() => undefined);
      setPollSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể phát Poll.');
    } finally {
      setPollPending(false);
    }
  };

  return <>
    <button type="button" aria-expanded={open} aria-controls="classroom-page-assistant" onClick={() => setOpen((value) => !value)} className="synapse-ai-copilot-trigger">
      <span className="relative"><Stars size={18} aria-hidden="true" /><span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-violet-700" /></span>
      <span>Trợ giảng AI</span>
      <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-extrabold">Trang {page}</span>
    </button>

    {open && <aside id="classroom-page-assistant" role="dialog" aria-label="Trợ giảng AI theo trang" className="synapse-ai-copilot-panel flex flex-col overflow-hidden rounded-2xl border border-violet-200 bg-[#F8F7FF] text-slate-900 shadow-2xl">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-violet-100 bg-white px-4 py-3">
        <div className="min-w-0"><div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-violet-700"><Stars size={13} /> Trợ giảng theo trang</div><h2 className="mt-1 truncate text-sm font-extrabold text-[#0F2258]">{stage.title}</h2><p className="mt-0.5 text-[11px] text-slate-500">Trang {page}/{stage.preview_page_count || '?'}</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Đóng trợ giảng AI" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!contextMatches && <div className="rounded-xl border border-dashed border-violet-200 bg-white p-4 text-center">
          <Stars className="mx-auto text-violet-600" size={26} />
          <p className="mt-2 text-sm font-bold text-[#0F2258]">Phân tích trang {page}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">AI đọc nội dung đúng trang đang chiếu để chuẩn bị lời giải thích và câu hỏi kiểm tra.</p>
          <button type="button" disabled={pending} onClick={() => void analyze()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-50">{pending ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Đang phân tích…</> : <><Stars size={14} />Phân tích trang này</>}</button>
        </div>}

        {contextMatches && result && <div className="space-y-3">
          <section className="rounded-xl border border-violet-100 bg-white p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wide text-violet-600">Tóm tắt nhanh</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{result.summary}</p></section>
          <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5"><div className="flex items-center gap-2 text-xs font-extrabold text-blue-800"><Lightbulb size={15} />Cách giải thích</div><p className="mt-2 text-xs leading-5 text-slate-700">{result.explanation}</p><ul className="mt-2 space-y-1.5">{result.key_points.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{item}</li>)}</ul></section>
          {result.misconception && <section className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700">Điểm dễ nhầm</p><p className="mt-1 text-xs leading-5 text-amber-950">{result.misconception}</p></section>}
          {result.check_question && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">Hỏi cả lớp</p><p className="mt-1 text-sm font-bold leading-5 text-emerald-950">{result.check_question}</p></section>}
          <section className="rounded-xl border border-slate-200 bg-white p-3.5"><div className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><BarChartFill className="text-sky-600" />Poll gợi ý</div><p className="mt-2 text-xs font-bold leading-5 text-slate-800">{result.poll.question}</p><div className="mt-2 grid gap-1.5">{result.poll.options.map((option, index) => <div key={index} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] ${index === result.poll.correct_index ? 'bg-emerald-50 font-bold text-emerald-800' : 'bg-slate-50 text-slate-600'}`}><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white font-extrabold shadow-sm">{String.fromCharCode(65 + index)}</span>{option}</div>)}</div><button type="button" disabled={pollPending || pollSent} onClick={() => void startSuggestedPoll()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3F82] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{pollSent ? <><Check2Circle />Đã phát cho lớp</> : pollPending ? 'Đang phát…' : <><BarChartFill />Phát Poll 60 giây</>}</button></section>
          <button type="button" disabled={pending} onClick={() => void analyze()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50"><ArrowClockwise />Phân tích lại</button>
        </div>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">{error}</p>}
      </div>
    </aside>}
  </>;
}


'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { BarChartFill, Check2Circle, Plus, Trash, X } from 'react-bootstrap-icons';
import { classroomApi, type LivePollDto } from './classroom-api';

export const POLL_UPDATE_TOPIC = 'synapse.poll.update.v1';
const encoder = new TextEncoder();

export function RealtimePoll({ roomCode, isModerator }: { roomCode: string; isModerator: boolean }) {
  const room = useRoomContext();
  const [controlBar, setControlBar] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [poll, setPoll] = useState<LivePollDto | null>(null);
  const [hiddenPollId, setHiddenPollId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(60);
  const [anonymous, setAnonymous] = useState(true);
  const [choice, setChoice] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const refresh = useCallback(async () => {
    try {
      const next = await classroomApi.poll(roomCode);
      setPoll(next.poll);
      if (next.poll?.selected_option !== null && next.poll?.selected_option !== undefined) {
        setChoice(next.poll.selected_option);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải poll.');
    }
  }, [roomCode]);

  const announceUpdate = useCallback(async () => {
    await room.localParticipant.publishData(encoder.encode('updated'), {
      reliable: true,
      topic: POLL_UPDATE_TOPIC,
    });
  }, [room]);

  useEffect(() => {
    const findControlBar = () => {
      const target = document.querySelector<HTMLElement>('.lk-video-conference .lk-control-bar');
      if (target) {
        setControlBar(target);
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(findControlBar);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(findControlBar);
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => { void refresh(); }, 0);
    const receive = (_payload: Uint8Array, _participant?: unknown, _kind?: unknown, topic?: string) => {
      if (topic === POLL_UPDATE_TOPIC) void refresh();
    };
    room.on(RoomEvent.DataReceived, receive);
    return () => { window.clearTimeout(initial); room.off(RoomEvent.DataReceived, receive); };
  }, [refresh, room]);

  useEffect(() => {
    if (!poll || poll.status !== 'open') return;
    const clock = window.setInterval(() => setNow(Date.now()), 250);
    const sync = window.setInterval(() => { void refresh(); }, 3000);
    return () => { window.clearInterval(clock); window.clearInterval(sync); };
  }, [poll, refresh]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('keydown', escape); };
  }, [open]);

  const publish = async (action: () => Promise<{ poll: LivePollDto | null }>) => {
    setPending(true);
    setError('');
    try {
      const next = await action();
      setPoll(next.poll);
      await announceUpdate().catch(() => undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật poll.');
    } finally {
      setPending(false);
    }
  };

  const start = async (event: FormEvent) => {
    event.preventDefault();
    const cleanOptions = options.map((item) => item.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) return;
    await publish(() => classroomApi.startPoll(roomCode, {
      question: question.trim(),
      options: cleanOptions,
      duration_seconds: duration,
      is_anonymous: anonymous,
    }));
  };

  const answer = async () => {
    if (!poll || choice === null) return;
    await publish(() => classroomApi.answerPoll(roomCode, poll.id, choice));
  };

  const remaining = poll?.status === 'open'
    ? now
      ? Math.max(0, Math.ceil((new Date(poll.closes_at).getTime() - now) / 1000))
      : Math.max(0, Math.ceil(poll.remaining_ms / 1000))
    : 0;
  const responseRate = poll?.participant_count
    ? Math.round(poll.response_count * 100 / poll.participant_count)
    : 0;

  const toolbar = isModerator && controlBar ? createPortal(
    <div ref={panelRef} className="synapse-utility-actions relative shrink-0">
      <button type="button" aria-label="Poll realtime" title="Poll realtime" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className={`lk-button synapse-utility-button !px-3 ${poll ? '!bg-blue-700 !text-white' : ''}`}>
        <BarChartFill size={19} aria-hidden="true" />
        <span>Poll</span>
        {poll?.status === 'open' && <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700">{poll.response_count}/{poll.participant_count}</span>}
      </button>
      {open && <aside id={panelId} role="dialog" aria-label="Poll realtime" className="absolute bottom-[calc(100%+12px)] right-0 z-50 w-[min(390px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_24px_64px_-16px_rgba(15,34,88,0.45)]">
        <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#0F2258]">Poll realtime</p><p className="mt-0.5 text-[11px] text-slate-500">Khảo sát nhanh và xem kết quả trực tiếp</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
        {!poll ? <form onSubmit={start} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">Câu hỏi<textarea autoFocus rows={3} maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ví dụ: Phần nào cần được giải thích lại?" className="mt-1 w-full resize-none rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <fieldset className="space-y-2"><legend className="text-xs font-semibold text-slate-700">Các lựa chọn</legend>{options.map((option, index) => <div key={index} className="flex items-center gap-2"><span className="w-5 text-xs font-bold text-slate-400">{String.fromCharCode(65 + index)}</span><input value={option} maxLength={200} onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} aria-label={`Lựa chọn ${index + 1}`} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />{options.length > 2 && <button type="button" onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Xóa lựa chọn ${index + 1}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash size={14} /></button>}</div>)}</fieldset>
          {options.length < 6 && <button type="button" onClick={() => setOptions((current) => [...current, ''])} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"><Plus size={15} />Thêm lựa chọn</button>}
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-700">Thời gian<select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value={30}>30 giây</option><option value={60}>60 giây</option><option value={90}>90 giây</option><option value={120}>2 phút</option></select></label><label className="flex items-end gap-2 pb-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} className="accent-blue-700" />Ẩn danh</label></div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <button type="submit" disabled={pending || !question.trim() || options.filter((item) => item.trim()).length < 2} className="w-full rounded-xl bg-[#243F88] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1B326D] disabled:opacity-50">{pending ? 'Đang phát...' : 'Phát poll cho lớp'}</button>
        </form> : <PollResults poll={poll} remaining={remaining} responseRate={responseRate} />}
        {poll?.status === 'open' && <button type="button" disabled={pending} onClick={() => void publish(() => classroomApi.closePoll(roomCode, poll.id))} className="mt-4 w-full rounded-xl bg-[#243F88] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Kết thúc và công bố kết quả</button>}
        {poll?.status === 'closed' && <button type="button" disabled={pending} onClick={() => void publish(() => classroomApi.dismissPoll(roomCode, poll.id))} className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Đóng kết quả · Tạo poll mới</button>}
        {poll && error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      </aside>}
    </div>, controlBar,
  ) : null;

  const showLearnerPoll = !isModerator && poll && poll.id !== hiddenPollId;
  return <>
    {toolbar}
    {showLearnerPoll && <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/45 p-4 text-slate-900 backdrop-blur-[1px]">
      <section role="dialog" aria-modal="true" aria-labelledby={`poll-${poll.id}`} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">Poll realtime</span><span className={`text-xs font-bold tabular-nums ${remaining <= 10 && poll.status === 'open' ? 'text-rose-600' : 'text-slate-500'}`}>{poll.status === 'open' ? `${remaining}s` : `${poll.response_count} phản hồi`}</span></div>
        <h2 id={`poll-${poll.id}`} className="mt-4 text-lg font-extrabold leading-7 text-[#0F2258]">{poll.question}</h2>
        {poll.status === 'open' && poll.selected_option === null ? <>
          <div className="mt-5 grid gap-2.5">{poll.options.map((option, index) => <button key={index} type="button" disabled={pending || remaining === 0} onClick={() => setChoice(index)} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${choice === index ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${choice === index ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
          {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <button type="button" disabled={pending || choice === null || remaining === 0} onClick={() => void answer()} className="mt-5 w-full rounded-xl bg-[#243F88] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{pending ? 'Đang gửi...' : 'Gửi lựa chọn'}</button>
        </> : poll.status === 'open' ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center"><Check2Circle className="mx-auto text-emerald-600" size={34} /><p className="mt-3 text-sm font-bold text-emerald-900">Đã ghi nhận phản hồi</p><p className="mt-1 text-xs text-emerald-700">Kết quả sẽ hiện khi poll kết thúc · còn {remaining} giây</p></div> : <PollResults poll={poll} remaining={0} responseRate={responseRate} />}
        {poll.status === 'closed' && <button type="button" onClick={() => setHiddenPollId(poll.id)} className="mt-5 w-full rounded-xl bg-[#243F88] px-4 py-3 text-sm font-bold text-white">Về phòng học</button>}
      </section>
    </div>}
  </>;
}

function PollResults({ poll, remaining, responseRate }: { poll: LivePollDto; remaining: number; responseRate: number }) {
  const counts = poll.option_counts ?? poll.options.map(() => 0);
  const total = counts.reduce((sum, count) => sum + count, 0);
  return <div>
    <div className="rounded-xl bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold leading-5 text-[#0F2258]">{poll.question}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${poll.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{poll.status === 'open' ? `${remaining}s` : 'Đã kết thúc'}</span></div><p className="mt-2 text-[11px] text-slate-500">{poll.response_count}/{poll.participant_count} phản hồi · {responseRate}% tham gia{poll.is_anonymous ? ' · Ẩn danh' : ''}</p></div>
    <div className="mt-4 space-y-3">{poll.options.map((option, index) => { const count = counts[index] ?? 0; const percent = total ? Math.round(count * 100 / total) : 0; return <div key={index}><div className="mb-1.5 flex items-start justify-between gap-3 text-xs"><span className="font-semibold text-slate-700">{String.fromCharCode(65 + index)}. {option}</span><span className="shrink-0 font-bold tabular-nums text-slate-600">{count} · {percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500 transition-[width] duration-500" style={{ width: `${percent}%` }} /></div></div>; })}</div>
    {!poll.is_anonymous && poll.responses && poll.responses.length > 0 && <div className="mt-4 max-h-28 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2"><p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Người đã trả lời</p>{poll.responses.map((response) => <div key={response.user_id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs"><span className="truncate font-semibold text-slate-700">{response.name}</span><span className="shrink-0 font-bold text-blue-700">{String.fromCharCode(65 + response.selected_option)}</span></div>)}</div>}
  </div>;
}

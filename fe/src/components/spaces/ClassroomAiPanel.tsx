'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { ClockHistory, LightningChargeFill, PlayFill, X } from 'react-bootstrap-icons';
import { classroomApi, type PresentationResource, type PresentationState } from './classroom-api';
import { PRESENTATION_UPDATE_TOPIC } from './LocalPresentationPanel';

function triggerLabel(quiz: PresentationResource): string {
  if (quiz.trigger_mode === 'at_minute') return `Tự động ở phút ${quiz.trigger_minute ?? 0}`;
  if (quiz.trigger_mode === 'at_slide') return `Khi tới trang ${quiz.trigger_slide_number ?? 1} · ${quiz.trigger_resource_title || 'tài liệu đã chọn'}`;
  if (quiz.trigger_mode === 'after_resource') return `Sau ${quiz.trigger_resource_title || 'tài liệu đã chọn'}${quiz.delay_seconds ? ` · chờ ${quiz.delay_seconds} giây` : ''}`;
  return 'Giáo viên kích hoạt';
}

export function ClassroomAiPanel({ roomCode, open, onClose }: { roomCode: string; open: boolean; onClose: () => void }) {
  const room = useRoomContext();
  const [state, setState] = useState<PresentationState | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await classroomApi.presentation(roomCode));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải kịch bản bài dạy.');
    }
  }, [roomCode]);

  useEffect(() => {
    if (!open) return;
    const initial = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const startQuiz = async (quizId: string) => {
    if (pendingId) return;
    setPendingId(quizId);
    setError('');
    try {
      const next = await classroomApi.presentationAction(roomCode, { action: 'start_quiz', resource_id: quizId });
      setState(next);
      await room.localParticipant.publishData(new TextEncoder().encode('updated'), { reliable: true, topic: PRESENTATION_UPDATE_TOPIC });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể phát trắc nghiệm.');
    } finally {
      setPendingId(null);
    }
  };

  if (!open) return null;
  const quizzes = state?.resources.filter((item) => item.kind === 'quiz') || [];
  const automaticCount = quizzes.filter((item) => item.trigger_mode && item.trigger_mode !== 'manual').length;

  return <>
    <button type="button" aria-label="Đóng kịch bản bài dạy" onClick={onClose} className="absolute inset-0 z-20 bg-black/45" />
    <aside id="classroom-ai-panel" role="dialog" aria-modal="true" aria-labelledby="classroom-ai-title" className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[560px] flex-col overflow-y-auto bg-[#F6F7FB] text-stone-900 shadow-2xl sm:w-[min(560px,92vw)]">
      <div className="flex items-start justify-between gap-3 border-b border-violet-100 bg-white px-5 py-5">
        <div><div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700"><LightningChargeFill size={13} /> Điều phối trực tiếp</div><h2 id="classroom-ai-title" className="text-lg font-extrabold">Kịch bản bài dạy</h2><p className="mt-1 text-xs leading-5 text-stone-500">Theo dõi và kích hoạt nội dung đã soạn trước trong Xưởng thiết kế.</p></div>
        <button ref={closeRef} type="button" aria-label="Đóng bảng kịch bản" onClick={onClose} className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-violet-600"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-3 gap-2 p-4 sm:p-5">
        <Stat label="Nội dung" value={state?.resources.length} tone="text-[#1E3F82]" />
        <Stat label="Quiz" value={state ? quizzes.length : undefined} tone="text-violet-700" />
        <Stat label="Tự động" value={state ? automaticCount : undefined} tone="text-emerald-700" />
      </div>

      {error && <p role="alert" className="mx-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 sm:mx-5">{error}</p>}
      {state?.active_run && <div className="mx-4 mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4 sm:mx-5"><p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">{state.active_run.status === 'open' ? 'Đang diễn ra' : 'Kết quả vừa công bố'}</p><p className="mt-1 text-sm font-bold text-violet-950">{state.active_run.quiz.title}</p><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-white/70 p-2"><p className="text-[9px] text-violet-500">Phản hồi</p><p className="text-sm font-extrabold">{state.active_run.response_count}/{state.active_run.participant_count}</p></div><div className="rounded-lg bg-white/70 p-2"><p className="text-[9px] text-violet-500">Tham gia</p><p className="text-sm font-extrabold">{state.active_run.results?.response_rate_percent ?? 0}%</p></div><div className="rounded-lg bg-white/70 p-2"><p className="text-[9px] text-violet-500">Đúng</p><p className="text-sm font-extrabold">{state.active_run.results?.accuracy_percent ?? 0}%</p></div></div><p className="mt-2 text-[10px] text-violet-600">{state.active_run.status === 'open' ? `Còn ${state.active_run.remaining_seconds} giây` : 'Chi tiết được lưu trong Báo cáo Teacher Studio'}</p></div>}

      <section className="mx-4 mb-5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:mx-5">
        <div className="flex items-center justify-between gap-2"><div><p className="text-sm font-extrabold text-[#0F2258]">Các điểm tương tác đã soạn</p><p className="mt-1 text-xs text-stone-500">Quiz tự động sẽ bật khi điều kiện trong Teacher Studio được thỏa mãn.</p></div><ClockHistory className="shrink-0 text-violet-600" size={20} /></div>
        {!state ? <p role="status" className="mt-4 text-sm text-stone-500">Đang tải kịch bản…</p> : !state.is_moderator ? <p className="mt-4 text-sm text-stone-500">Chỉ giáo viên xem được kịch bản điều phối.</p> : quizzes.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-stone-200 p-4 text-sm text-stone-500">Chưa có quiz. Hãy tạo trong Xưởng thiết kế trước khi bắt đầu lớp.</p> : <div className="mt-4 grid gap-2">{quizzes.map((quiz) => {
          const automatic = Boolean(quiz.trigger_mode && quiz.trigger_mode !== 'manual');
          const alreadyStarted = state.active_run?.quiz.id === quiz.id;
          return <div key={quiz.id} className="rounded-xl border border-stone-200 p-3">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{quiz.title}</p><p className="mt-1 text-[11px] text-slate-500">{quiz.section_title}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${automatic ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{automatic ? 'Đã lên lịch' : 'Thủ công'}</span></div>
            <p className="mt-2 text-xs font-semibold text-slate-600">{triggerLabel(quiz)}</p>
            {!automatic && <button type="button" disabled={Boolean(pendingId) || alreadyStarted} onClick={() => void startQuiz(quiz.id)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3F82] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><PlayFill />{alreadyStarted ? 'Đang phát' : pendingId === quiz.id ? 'Đang phát…' : 'Phát ngay'}</button>}
          </div>;
        })}</div>}
      </section>
    </aside>
  </>;
}

function Stat({ label, value, tone }: { label: string; value: number | undefined; tone: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-3"><p className="text-[10px] font-bold uppercase text-stone-400">{label}</p><p className={`mt-1 text-xl font-extrabold ${tone}`}>{value ?? '—'}</p></div>;
}

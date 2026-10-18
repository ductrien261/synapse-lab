'use client';

/* Slide previews and PDF pages are supplied by the backend. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type RefObject, type UIEventHandler } from 'react';
import { requestBlob } from '@/lib/api';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { classroomApi, type PresentationResource, type PresentationState } from './classroom-api';
import { PresentationLinkPreview } from './PresentationLinkPreview';
import { LiveQuizResults } from './LiveQuizResults';
import { StudentQuizDialog, StudentQuizResultDialog } from './StudentQuizDialog';

export function mediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    const index = url.pathname.indexOf('/media/');
    return index >= 0 ? `/media-preview/${url.pathname.slice(index + 7)}${url.search}` : url.toString();
  } catch {
    return null;
  }
}

function quizTriggerLabel(resource: PresentationResource): string {
  if (resource.trigger_mode === 'at_minute') return `Tự bật phút ${resource.trigger_minute ?? 0}`;
  if (resource.trigger_mode === 'at_slide') return `Tự bật ở ${resource.trigger_resource_title || 'slide'} · trang ${resource.trigger_slide_number ?? 1}`;
  if (resource.trigger_mode === 'after_resource') return `Sau ${resource.trigger_resource_title || 'tài liệu'}${resource.delay_seconds ? ` · trễ ${resource.delay_seconds}s` : ''}`;
  return 'Giáo viên kích hoạt';
}

interface Props {
  roomCode: string;
  open: boolean;
  onClose: () => void;
  onStateChange: (state: PresentationState) => void;
}

export const PRESENTATION_UPDATE_TOPIC = 'synapse.presentation.updated.v1';

export function LocalPresentationPanel({ roomCode, open, onClose, onStateChange }: Props) {
  const room = useRoomContext();
  const [state, setState] = useState<PresentationState | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [submittedQuizId, setSubmittedQuizId] = useState<string | null>(null);
  const [dismissedResultId, setDismissedResultId] = useState<string | null>(null);
  const lastSelectedRef = useRef<string | null>(null);
  const lastOnStageRef = useRef(false);

  const applyState = useCallback((next: PresentationState) => {
    setState(next);
    onStateChange(next);
    const selectedId = next.selected?.id || null;
    if (!next.is_moderator && ((next.selected?.kind === 'quiz' && selectedId !== lastSelectedRef.current) || (next.on_stage && !lastOnStageRef.current))) onClose();
    lastSelectedRef.current = selectedId;
    lastOnStageRef.current = next.on_stage;
  }, [onClose, onStateChange]);

  const notifyRoom = useCallback(() => {
    void room.localParticipant.publishData(new TextEncoder().encode('updated'), { reliable: true, topic: PRESENTATION_UPDATE_TOPIC }).catch(() => {});
  }, [room]);

  const refresh = useCallback(async () => {
    try {
      const next = await classroomApi.presentation(roomCode);
      applyState(next);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải nội dung bài dạy.');
    }
  }, [roomCode, applyState]);

  useEffect(() => {
    const receiveUpdate = (_payload: Uint8Array, _participant?: unknown, _kind?: unknown, topic?: string) => {
      if (topic === PRESENTATION_UPDATE_TOPIC) void refresh();
    };
    room.on(RoomEvent.DataReceived, receiveUpdate);
    return () => { room.off(RoomEvent.DataReceived, receiveUpdate); };
  }, [room, refresh]);

  useEffect(() => {
    let cancelled = false;
    let timer: number;
    const poll = async () => {
      await refresh();
      if (!cancelled) timer = window.setTimeout(() => { void poll(); }, 5000);
    };
    timer = window.setTimeout(() => { void poll(); }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [refresh]);

  const selected = state?.selected;
  const selectedIsStaged = Boolean(selected && state?.on_stage && state.stage?.id === selected.id);
  const page = state?.page || 1;
  const run = state?.active_run;
  const showPreview = Boolean(selected && (!state?.is_moderator || (selected.kind === 'quiz' && run)));
  const expandedLibrary = Boolean(state?.is_moderator && !run);
  useEffect(() => {
    if (!open || !showPreview || selected?.kind !== 'pdf') return;
    let cancelled = false;
    let objectUrl: string | null = null;
    const path = `/classrooms/${encodeURIComponent(roomCode)}/sessions/presentation/pdf/${selected.id}/pages/${page}/`;
    requestBlob(path).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setPdfImage(objectUrl);
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không thể mở trang PDF.');
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPdfImage(null);
    };
  }, [open, showPreview, selected?.id, selected?.kind, page, roomCode]);

  const act = async (data: Record<string, unknown>) => {
    setPending(true);
    try {
      applyState(await classroomApi.presentationAction(roomCode, data));
      notifyRoom();
      setError('');
      if (data.action === 'present') onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật nội dung.');
    } finally {
      setPending(false);
    }
  };

  const submitQuiz = async (runId: string, option: number) => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const next = await classroomApi.presentationAction(roomCode, { action: 'answer', run_id: runId, selected_option: option });
      applyState(next);
      if (typeof next.active_run?.selected_option === 'number') setSubmittedQuizId(runId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể gửi câu trả lời.');
    } finally {
      setPending(false);
    }
  };

  const studentQuiz = !state?.is_moderator && selected?.kind === 'quiz' && run ? run : null;
  const slideUrl = selected?.kind === 'slide' ? mediaUrl(selected.preview_slide_urls[page - 1]) : null;

  return <>
    {open && <button type="button" aria-label="Đóng bảng tài liệu" onClick={onClose} className="absolute inset-0 z-20 bg-black/45" />}
    <aside aria-hidden={!open} className={`absolute inset-y-0 right-0 z-30 flex w-full max-w-[620px] flex-col bg-[#F5F7FB] text-stone-900 shadow-2xl transition-transform duration-200 sm:w-[min(620px,90vw)] ${open ? 'translate-x-0' : 'pointer-events-none translate-x-full'}`}>
      <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <div><h2 className="text-sm font-bold">Kịch bản bài dạy</h2><p className="text-xs text-stone-500">{state?.is_moderator ? 'Nội dung đã chuẩn bị trong Xưởng thiết kế' : 'Nội dung giáo viên đang chiếu'}</p></div>
        <button type="button" onClick={onClose} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold">Đóng</button>
      </header>
      {error && <p role="alert" className="bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
      {state?.is_moderator && <div className={`${expandedLibrary ? 'flex min-h-0 flex-1 flex-col' : 'shrink-0'} border-b border-stone-200 bg-white px-3 pb-3 pt-2.5`}>
        <div className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5"><span className="text-xs font-bold text-[#1E3F82]">Nội dung đã chuẩn bị</span><span className="text-[11px] font-semibold text-slate-500">{state.resources.length} mục</span></div>
        <div className={`mt-3 space-y-2 overflow-y-auto pr-1 ${expandedLibrary ? 'min-h-0 flex-1' : 'max-h-[min(230px,30dvh)]'}`}>
          {state.resources.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">Chưa có nội dung. Hãy chuẩn bị slide, tài liệu và quiz trong Xưởng thiết kế trước khi vào lớp.</div> : state.resources.map((item) => {
            const active = selected?.id === item.id;
            const kindLabel = item.kind === 'quiz' ? 'QUIZ' : item.kind === 'slide' ? 'SLIDE' : item.kind === 'doc' ? 'DOCX' : item.kind === 'model_3d' ? '3D' : item.kind === 'video' ? 'VIDEO' : item.kind === 'link' ? 'LINK' : 'PDF';
            const trigger = item.kind === 'quiz' ? quizTriggerLabel(item) : null;
            return <button key={item.id} type="button" disabled={pending} onClick={() => void act({ action: 'show', resource_id: item.id })} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left disabled:opacity-50 ${active ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}`}>
              <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold tracking-wide ${item.kind === 'quiz' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{kindLabel}</span>
              <span className="min-w-0 flex-1"><span className={`block truncate text-xs font-semibold ${active ? 'text-[#1E3F82]' : 'text-slate-800'}`}>{item.title}</span><span className="block truncate text-[11px] text-slate-500">{item.section_title}{trigger ? ` · ${trigger}` : ''}</span></span>
              <span className="shrink-0 text-[11px] font-semibold text-[#1E3F82]">{item.kind !== 'quiz' && state.stage?.id === item.id ? 'Đang chiếu' : active ? item.kind === 'quiz' && run ? 'Đang phát' : 'Đã chọn' : 'Chọn'}</span>
            </button>;
          })}
        </div>
        <a href={`/spaces/${encodeURIComponent(roomCode)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#1E3F82] hover:bg-slate-50">Mở Xưởng thiết kế để chỉnh sửa</a>
      </div>}
      {state?.is_moderator && selected && <div className="flex gap-2 border-b border-stone-200 bg-white px-3 py-2.5">
        {selected.kind === 'quiz' ? <button type="button" disabled={pending || Boolean(run)} onClick={() => void act({ action: 'start_quiz', resource_id: selected.id })} className="min-w-0 flex-1 rounded-lg bg-[#1E3F82] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#19356D] disabled:opacity-50">{run ? 'Quiz đã trình chiếu' : 'Trình chiếu quiz'}</button>
          : <button type="button" disabled={pending} onClick={() => void act({ action: selectedIsStaged ? 'stop_present' : 'present' })} className={`min-w-0 flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${selectedIsStaged ? 'bg-slate-700 hover:bg-slate-800' : 'bg-[#1E3F82] hover:bg-[#19356D]'}`}>{selectedIsStaged ? 'Dừng trình chiếu' : 'Trình chiếu trên màn hình'}</button>}
        <button type="button" disabled={pending} onClick={() => void act({ action: 'clear' })} className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Bỏ chọn</button>
      </div>}
      <div className={`flex min-h-0 flex-col overflow-y-auto p-3 sm:p-4 ${expandedLibrary ? 'shrink-0' : 'flex-1'}`}>
        {!selected && !expandedLibrary && <div className="flex min-h-56 flex-1 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">{!state ? 'Đang tải nội dung bài dạy…' : state.is_moderator ? 'Chọn nội dung đã chuẩn bị.' : 'Chưa có nội dung đang chiếu.'}</div>}
        {selected && state?.is_moderator && !showPreview && <div className="rounded-xl border border-blue-100 bg-white p-4"><p className="text-xs font-semibold text-blue-700">{selected.kind === 'quiz' ? 'Đã chọn quiz' : selected.kind === 'model_3d' ? 'Đã chọn mô hình 3D' : 'Đã chọn tài liệu'}</p><p className="mt-1 truncate text-sm font-bold text-slate-900">{selected.title}</p><p className="mt-2 text-xs leading-5 text-slate-600">{selected.kind === 'quiz' ? 'Bấm Trình chiếu quiz để gửi câu hỏi cho người học.' : selected.kind === 'model_3d' ? 'Bấm Trình chiếu trên màn hình để mở mô hình tương tác cho cả lớp.' : 'Tài liệu đã được chuẩn bị. Bấm Trình chiếu trên màn hình để hiển thị cho lớp.'}</p></div>}
        {selected && showPreview && <div className="mb-3"><h3 className="truncate text-sm font-bold">{selected.title}</h3>{(selected.kind === 'pdf' || selected.kind === 'slide') && <p className="text-xs text-stone-500">Trang {page}/{selected.preview_page_count || '?'}</p>}</div>}
        {showPreview && selected?.kind === 'pdf' && (pdfImage ? <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-lg bg-stone-200 p-2"><img src={pdfImage} alt={`${selected.title}, trang ${page}`} className="max-w-full bg-white shadow" /></div> : <div className="flex min-h-[300px] flex-1 items-center justify-center text-sm text-stone-500">Đang mở trang PDF…</div>)}
        {open && showPreview && selected?.kind === 'doc' && <DocxPreview key={selected.id} fileUrl={mediaUrl(selected.file)} />}
        {showPreview && selected?.kind === 'slide' && (slideUrl ? <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-lg bg-stone-200 p-2"><img src={slideUrl} alt={`${selected.title}, trang ${page}`} className="max-w-full bg-white shadow" /></div> : <p className="text-sm text-stone-500">Slide đang được xử lý hoặc chưa có bản xem trước.</p>)}
        {open && showPreview && (selected?.kind === 'video' || selected?.kind === 'link') && <PresentationLinkPreview title={selected.title} url={selected.external_url} />}
        {showPreview && state?.is_moderator && (selected?.kind === 'pdf' || selected?.kind === 'slide') && <div className="mt-3 flex items-center justify-center gap-3"><button type="button" disabled={pending || page <= 1} onClick={() => void act({ action: 'page', page: page - 1 })} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Trang trước</button><span className="text-xs font-semibold">{page}</span><button type="button" disabled={pending || page >= selected.preview_page_count} onClick={() => void act({ action: 'page', page: page + 1 })} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Trang sau</button></div>}
        {state?.is_moderator && selected?.kind === 'quiz' && run && <LiveQuizResults run={run} pending={pending} onCloseQuiz={() => void act({ action: 'close_quiz' })} />}
        {studentQuiz && <div className="rounded-lg bg-white p-4 text-sm text-stone-600">{studentQuiz.selected_option === null ? 'Trắc nghiệm đang được chiếu cho lớp.' : studentQuiz.status === 'closed' ? 'Kết quả đã được công bố.' : 'Bạn đã gửi câu trả lời. Kết quả sẽ hiện khi giáo viên đóng quiz.'}</div>}
      </div>
    </aside>
    {studentQuiz?.status === 'open' && studentQuiz.selected_option === null && submittedQuizId !== studentQuiz.id && <StudentQuizDialog key={studentQuiz.id} run={studentQuiz} pending={pending} error={error} onSubmit={(option) => void submitQuiz(studentQuiz.id, option)} />}
    {studentQuiz?.status === 'closed' && studentQuiz.selected_option !== null && dismissedResultId !== studentQuiz.id && <StudentQuizResultDialog run={studentQuiz} onClose={() => setDismissedResultId(studentQuiz.id)} />}
  </>;
}

export function DocxPreview({ fileUrl, scrollRef, onScroll, onReady }: {
  fileUrl: string | null;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onScroll?: UIEventHandler<HTMLDivElement>;
  onReady?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  useEffect(() => {
    if (!fileUrl || !containerRef.current) return;
    const controller = new AbortController();
    const container = containerRef.current;
    container.replaceChildren();
    Promise.all([
      fetch(fileUrl, { signal: controller.signal }).then((response) => {
        if (!response.ok) throw new Error(`Không tải được DOCX (${response.status})`);
        return response.arrayBuffer();
      }),
      import('docx-preview'),
    ]).then(([buffer, docx]) => docx.renderAsync(buffer, container, undefined, {
      className: 'synapse-docx',
      inWrapper: true,
      breakPages: true,
      useBase64URL: true,
    })).then(() => { setStatus('ready'); onReadyRef.current?.(); }).catch((reason: unknown) => {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setStatus('error');
    });
    return () => controller.abort();
  }, [fileUrl]);

  if (!fileUrl) return <p className="rounded-lg bg-white p-4 text-sm text-stone-600">Tài liệu DOCX chưa có tệp để xem.</p>;
  return <div ref={scrollRef} onScroll={onScroll} className="relative min-h-[360px] flex-1 overflow-auto rounded-lg bg-stone-200 p-2">
    {status === 'loading' && <p role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 text-sm text-stone-600">Đang mở DOCX…</p>}
    {status === 'error' && <p role="alert" className="absolute inset-0 z-10 flex items-center justify-center bg-white p-4 text-center text-sm text-rose-700">Không thể mở DOCX này. Hãy thử tải lại tài liệu.</p>}
    <div ref={containerRef} className="[&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper>section.docx]:!mb-4 [&_.docx-wrapper>section.docx]:!shadow-lg" />
    {status === 'ready' && <a href={fileUrl} target="_blank" rel="noreferrer" className="sticky bottom-2 float-right rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-800 shadow">Mở tệp gốc</a>}
  </div>;
}

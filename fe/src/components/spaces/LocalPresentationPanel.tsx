'use client';

/* Slide previews and PDF pages are supplied by the backend. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type RefObject, type UIEventHandler } from 'react';
import { requestBlob } from '@/lib/api';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { classroomApi, type PresentationState } from './classroom-api';
import { PresentationLinkPreview } from './PresentationLinkPreview';
import { safePresentationUrl } from './presentation-links';
import { StudentQuizDialog } from './StudentQuizDialog';

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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [submittedQuizId, setSubmittedQuizId] = useState<string | null>(null);
  const [libraryTab, setLibraryTab] = useState<'ready' | 'new'>('ready');
  const [newSource, setNewSource] = useState<'file' | 'link'>('file');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [recentUploadId, setRecentUploadId] = useState<string | null>(null);
  const lastSelectedRef = useRef<string | null>(null);
  const lastOnStageRef = useRef(false);
  const uploadRef = useRef(false);

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
  const showPreview = Boolean(selected && (!state?.is_moderator || (selected.kind === 'quiz' && run) || (libraryTab === 'new' && selected.id === recentUploadId)));
  const expandedLibrary = Boolean(state?.is_moderator && libraryTab === 'ready' && !run);
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

  const upload = async (file: File | undefined) => {
    if (!file || uploadRef.current) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setError('Hãy chọn tệp PDF hoặc DOCX.');
      return;
    }
    if (file.size > 250 * 1024 * 1024) {
      setError('Tệp vượt giới hạn 250 MB.');
      return;
    }
    uploadRef.current = true;
    setPending(true);
    setUploadProgress(0);
    setError('');
    try {
      const next = await classroomApi.uploadPresentation(roomCode, file, setUploadProgress);
      applyState(next);
      notifyRoom();
      setRecentUploadId(next.selected?.id || null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải tài liệu lên.');
    } finally {
      uploadRef.current = false;
      setPending(false);
      setUploadProgress(null);
    }
  };

  const importLink = async () => {
    if (pending) return;
    const input = linkUrl.trim();
    const externalUrl = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    if (!safePresentationUrl(externalUrl)) {
      setError('Hãy nhập một liên kết HTTPS hợp lệ.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const next = await classroomApi.presentationAction(roomCode, {
        action: 'import_link', external_url: externalUrl, title: linkTitle.trim(),
      });
      applyState(next);
      notifyRoom();
      setRecentUploadId(next.selected?.id || null);
      setLinkUrl('');
      setLinkTitle('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể nhập liên kết.');
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
        <div><h2 className="text-sm font-bold">Tài liệu và quiz</h2><p className="text-xs text-stone-500">{state?.is_moderator ? 'Chọn nội dung rồi bấm Trình chiếu' : 'Nội dung giáo viên đang chiếu'}</p></div>
        <button type="button" onClick={onClose} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold">Đóng</button>
      </header>
      {error && <p role="alert" className="bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
      {state?.is_moderator && <div className={`${expandedLibrary ? 'flex min-h-0 flex-1 flex-col' : 'shrink-0'} border-b border-stone-200 bg-white px-3 pb-3 pt-2.5`}>
        <div role="tablist" aria-label="Nguồn tài liệu" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button type="button" role="tab" aria-selected={libraryTab === 'ready'} onClick={() => setLibraryTab('ready')} className={`rounded-lg px-2 py-2.5 text-xs font-bold transition-colors ${libraryTab === 'ready' ? 'bg-white text-[#1E3F82] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Nội dung có sẵn <span className="ml-1 text-[11px] opacity-70">{state.resources.length}</span></button>
          <button type="button" role="tab" aria-selected={libraryTab === 'new'} onClick={() => setLibraryTab('new')} className={`rounded-lg px-2 py-2.5 text-xs font-bold transition-colors ${libraryTab === 'new' ? 'bg-white text-[#1E3F82] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Thêm tài liệu mới</button>
        </div>
        {libraryTab === 'ready' && <div role="tabpanel" className={`mt-3 space-y-2 overflow-y-auto pr-1 ${expandedLibrary ? 'min-h-0 flex-1' : 'max-h-[min(230px,30dvh)]'}`}>
          {state.resources.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">Chưa có nội dung. Chuyển sang tab Thêm tài liệu mới để nhập file hoặc liên kết.</div> : state.resources.map((item) => {
            const active = selected?.id === item.id;
            const kindLabel = item.kind === 'quiz' ? 'QUIZ' : item.kind === 'slide' ? 'SLIDE' : item.kind === 'doc' ? 'DOCX' : item.kind === 'video' ? 'VIDEO' : item.kind === 'link' ? 'LINK' : 'PDF';
            return <button key={item.id} type="button" disabled={pending} onClick={() => { setRecentUploadId(null); void act({ action: 'show', resource_id: item.id }); }} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left disabled:opacity-50 ${active ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}`}>
              <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold tracking-wide ${item.kind === 'quiz' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{kindLabel}</span>
              <span className="min-w-0 flex-1"><span className={`block truncate text-xs font-semibold ${active ? 'text-[#1E3F82]' : 'text-slate-800'}`}>{item.title}</span><span className="block truncate text-[11px] text-slate-500">{item.section_title}</span></span>
              <span className="shrink-0 text-[11px] font-semibold text-[#1E3F82]">{item.kind !== 'quiz' && state.stage?.id === item.id ? 'Đang chiếu' : active ? item.kind === 'quiz' && run ? 'Đang phát' : 'Đã chọn' : 'Chọn'}</span>
            </button>;
          })}
        </div>}
        {libraryTab === 'new' && <div role="tabpanel" className="mt-3 max-h-[min(440px,55dvh)] overflow-y-auto rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4">
          <div role="tablist" aria-label="Cách thêm tài liệu" className="grid grid-cols-2 gap-1 rounded-lg bg-white p-1">
            <button type="button" role="tab" aria-selected={newSource === 'file'} onClick={() => setNewSource('file')} className={`rounded-md px-3 py-2 text-xs font-bold ${newSource === 'file' ? 'bg-[#1E3F82] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Import tài liệu</button>
            <button type="button" role="tab" aria-selected={newSource === 'link'} onClick={() => setNewSource('link')} className={`rounded-md px-3 py-2 text-xs font-bold ${newSource === 'link' ? 'bg-[#1E3F82] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Import liên kết</button>
          </div>
          {newSource === 'file' ? <div className="pt-4">
            <p className="text-sm font-bold text-[#0F2258]">Thêm file từ máy</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Hỗ trợ PDF và DOCX. File vừa tải sẽ có trong Nội dung có sẵn.</p>
            <label className={`mt-3 inline-flex rounded-lg bg-[#1E3F82] px-4 py-2.5 text-xs font-bold text-white ${pending ? 'opacity-50' : 'cursor-pointer hover:bg-[#19356D]'}`}>{uploadProgress === null ? 'Chọn file PDF/DOCX' : uploadProgress < 100 ? `Đang tải ${uploadProgress}%` : 'Đang xử lý tài liệu…'}<input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={pending} className="sr-only" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} /></label>
            {uploadProgress !== null && <div role="status" aria-live="polite" className="mt-3"><p className="mb-1 text-xs text-blue-800">{uploadProgress < 100 ? `Đang gửi tài liệu: ${uploadProgress}%` : 'Đã gửi xong. Đang lưu tài liệu trên máy…'}</p><progress value={uploadProgress} max={100} className="h-2 w-full accent-blue-700" /></div>}
          </div> : <form onSubmit={(event) => { event.preventDefault(); void importLink(); }} className="space-y-3 pt-4">
            <div><label htmlFor="presentation-link-url" className="text-xs font-bold text-[#0F2258]">Liên kết HTTPS</label><input id="presentation-link-url" type="text" inputMode="url" required value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500" /></div>
            <div><label htmlFor="presentation-link-title" className="text-xs font-bold text-[#0F2258]">Tên hiển thị <span className="font-normal text-slate-500">(không bắt buộc)</span></label><input id="presentation-link-title" value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} maxLength={300} placeholder="Ví dụ: Video cấu tạo tim" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500" /></div>
            <p className="text-[11px] leading-4 text-slate-600">YouTube hiển thị trong khung; mỗi người tự bấm phát. Liên kết khác mở ở tab mới.</p>
            <button type="submit" disabled={pending || !linkUrl.trim()} className="rounded-lg bg-[#1E3F82] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{pending ? 'Đang nhập…' : 'Thêm liên kết'}</button>
          </form>}
          <div className="mt-4 border-t border-blue-100 pt-3"><p className="text-xs text-slate-600">Muốn chuẩn bị nội dung bài học hoặc tạo quiz?</p><a href={`/spaces/${encodeURIComponent(roomCode)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#1E3F82] hover:bg-slate-50">Mở Xưởng thiết kế</a></div>
        </div>}
      </div>}
      {state?.is_moderator && selected && <div className="flex gap-2 border-b border-stone-200 bg-white px-3 py-2.5">
        {selected.kind === 'quiz' ? <button type="button" disabled={pending || Boolean(run)} onClick={() => void act({ action: 'start_quiz', resource_id: selected.id })} className="min-w-0 flex-1 rounded-lg bg-[#1E3F82] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#19356D] disabled:opacity-50">{run ? 'Quiz đã trình chiếu' : 'Trình chiếu quiz'}</button>
          : <button type="button" disabled={pending} onClick={() => void act({ action: selectedIsStaged ? 'stop_present' : 'present' })} className={`min-w-0 flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${selectedIsStaged ? 'bg-slate-700 hover:bg-slate-800' : 'bg-[#1E3F82] hover:bg-[#19356D]'}`}>{selectedIsStaged ? 'Dừng trình chiếu' : 'Trình chiếu trên màn hình'}</button>}
        <button type="button" disabled={pending} onClick={() => void act({ action: 'clear' })} className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Bỏ chọn</button>
      </div>}
      <div className={`flex min-h-0 flex-col overflow-y-auto p-3 sm:p-4 ${expandedLibrary ? 'shrink-0' : 'flex-1'}`}>
        {!selected && !expandedLibrary && <div className="flex min-h-56 flex-1 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">{!state ? 'Đang tải nội dung bài dạy…' : state.is_moderator ? 'Chọn nội dung có sẵn hoặc thêm tài liệu mới.' : 'Chưa có nội dung đang chiếu.'}</div>}
        {selected && state?.is_moderator && !showPreview && <div className="rounded-xl border border-blue-100 bg-white p-4"><p className="text-xs font-semibold text-blue-700">{selected.kind === 'quiz' ? 'Đã chọn quiz' : 'Đã chọn tài liệu'}</p><p className="mt-1 truncate text-sm font-bold text-slate-900">{selected.title}</p><p className="mt-2 text-xs leading-5 text-slate-600">{selected.kind === 'quiz' ? 'Bấm Trình chiếu quiz để gửi câu hỏi cho người học.' : 'Tài liệu đã được chuẩn bị. Bấm Trình chiếu trên màn hình để hiển thị cho lớp.'}</p></div>}
        {selected && showPreview && <div className="mb-3"><h3 className="truncate text-sm font-bold">{selected.title}</h3>{(selected.kind === 'pdf' || selected.kind === 'slide') && <p className="text-xs text-stone-500">Trang {page}/{selected.preview_page_count || '?'}</p>}</div>}
        {showPreview && selected?.kind === 'pdf' && (pdfImage ? <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-lg bg-stone-200 p-2"><img src={pdfImage} alt={`${selected.title}, trang ${page}`} className="max-w-full bg-white shadow" /></div> : <div className="flex min-h-[300px] flex-1 items-center justify-center text-sm text-stone-500">Đang mở trang PDF…</div>)}
        {open && showPreview && selected?.kind === 'doc' && <DocxPreview key={selected.id} fileUrl={mediaUrl(selected.file)} />}
        {showPreview && selected?.kind === 'slide' && (slideUrl ? <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-lg bg-stone-200 p-2"><img src={slideUrl} alt={`${selected.title}, trang ${page}`} className="max-w-full bg-white shadow" /></div> : <p className="text-sm text-stone-500">Slide đang được xử lý hoặc chưa có bản xem trước.</p>)}
        {open && showPreview && (selected?.kind === 'video' || selected?.kind === 'link') && <PresentationLinkPreview title={selected.title} url={selected.external_url} />}
        {showPreview && state?.is_moderator && (selected?.kind === 'pdf' || selected?.kind === 'slide') && <div className="mt-3 flex items-center justify-center gap-3"><button type="button" disabled={pending || page <= 1} onClick={() => void act({ action: 'page', page: page - 1 })} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Trang trước</button><span className="text-xs font-semibold">{page}</span><button type="button" disabled={pending || page >= selected.preview_page_count} onClick={() => void act({ action: 'page', page: page + 1 })} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Trang sau</button></div>}
        {state?.is_moderator && selected?.kind === 'quiz' && run && <div className="rounded-xl bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between text-xs"><span className="font-bold text-violet-700">Quiz · {run.status === 'open' ? `Còn ${run.remaining_seconds} giây` : 'Đã đóng'}</span><span>{run.response_count} câu trả lời</span></div><h4 className="text-base font-bold">{run.quiz.question}</h4><div className="mt-4 grid gap-2">{run.quiz.options.map((option, index) => <div key={index} className={`rounded-lg border p-3 text-left text-sm ${run.results?.correct_option === index ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white'}`}><span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>{option}<span className="float-right text-xs text-stone-500">{run.results?.option_counts[index] || 0}</span></div>)}</div>{run.status === 'open' && <button type="button" disabled={pending} onClick={() => void act({ action: 'close_quiz' })} className="mt-4 rounded-lg bg-violet-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Đóng quiz</button>}</div>}
        {studentQuiz && <div className="rounded-lg bg-white p-4 text-sm text-stone-600">{studentQuiz.selected_option === null ? 'Trắc nghiệm đang được chiếu cho lớp.' : 'Bạn đã gửi câu trả lời.'}</div>}
      </div>
    </aside>
    {studentQuiz?.status === 'open' && studentQuiz.selected_option === null && submittedQuizId !== studentQuiz.id && <StudentQuizDialog key={studentQuiz.id} run={studentQuiz} pending={pending} error={error} onSubmit={(option) => void submitQuiz(studentQuiz.id, option)} />}
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

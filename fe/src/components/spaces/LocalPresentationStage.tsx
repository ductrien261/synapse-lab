'use client';

/* Presentation images and DOCX content are provided by the classroom backend. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { ChevronLeft, ChevronRight, X } from 'react-bootstrap-icons';
import { requestBlob } from '@/lib/api';
import { classroomApi, type AnnotationTool, type PresentationState } from './classroom-api';
import { DocxPreview, mediaUrl, PRESENTATION_UPDATE_TOPIC } from './LocalPresentationPanel';
import { PdfAnnotationLayer } from './PdfAnnotationLayer';
import { PresentationLinkPreview } from './PresentationLinkPreview';
import { AnatomyModelPresentation } from './AnatomyModelPresentation';

interface Props {
  roomCode: string;
  state: PresentationState;
  onStateChange: (state: PresentationState) => void;
  onOpenPanel: () => void;
  annotationTool: AnnotationTool;
}

export function LocalPresentationStage({ roomCode, state, onStateChange, onOpenPanel, annotationTool }: Props) {
  const room = useRoomContext();
  const selected = state.stage;
  const [pdfImage, setPdfImage] = useState<{ key: string; url: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const outerScrollRef = useRef<HTMLDivElement>(null);
  const docScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const scrollPositionRef = useRef(0);

  const applyScroll = useCallback(() => {
    const docContainer = docScrollRef.current;
    const container = docContainer && docContainer.scrollHeight > docContainer.clientHeight
      ? docContainer : outerScrollRef.current;
    if (container) container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, state.stage_scroll * container.scrollHeight);
  }, [state.stage_scroll]);

  useEffect(() => {
    if (!state.is_moderator) applyScroll();
  }, [applyScroll, pdfImage, selected?.id, state.stage_page, state.is_moderator]);

  useEffect(() => {
    if (state.is_moderator) {
      if (outerScrollRef.current) outerScrollRef.current.scrollTop = 0;
      if (docScrollRef.current) docScrollRef.current.scrollTop = 0;
    }
    return () => {
      if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    };
  }, [selected?.id, state.stage_page, state.is_moderator]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!state.is_moderator || !selected) return;
    const container = event.currentTarget;
    const docContainer = docScrollRef.current;
    if (docContainer && docContainer.scrollHeight > docContainer.clientHeight && container !== docContainer) return;
    scrollPositionRef.current = Math.min(1, container.scrollTop / container.scrollHeight);
    if (scrollTimerRef.current !== null) return;
    const resourceId = selected.id;
    const page = state.stage_page;
    scrollTimerRef.current = window.setTimeout(() => {
      scrollTimerRef.current = null;
      void classroomApi.presentationAction(roomCode, {
        action: 'scroll', resource_id: resourceId, page, position: scrollPositionRef.current,
      }).then(() => room.localParticipant.publishData(
        new TextEncoder().encode('updated'), { reliable: true, topic: PRESENTATION_UPDATE_TOPIC },
      )).catch(() => {});
    }, 200);
  };

  useEffect(() => {
    if (selected?.kind !== 'pdf') return;
    let cancelled = false;
    let objectUrl: string | null = null;
    const path = `/classrooms/${encodeURIComponent(roomCode)}/sessions/presentation/pdf/${selected.id}/pages/${state.stage_page}/`;
    requestBlob(path).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setPdfImage({ key: `${selected.id}:${state.stage_page}`, url: objectUrl });
      setError('');
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không thể mở trang PDF.');
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [roomCode, selected?.id, selected?.kind, state.stage_page]);

  if (!selected || !state.on_stage) return null;

  const act = async (action: 'stage_page' | 'stop_present', page?: number) => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const next = await classroomApi.presentationAction(roomCode, { action, ...(page === undefined ? {} : { page }) });
      onStateChange(next);
      void room.localParticipant.publishData(new TextEncoder().encode('updated'), { reliable: true, topic: PRESENTATION_UPDATE_TOPIC }).catch(() => {});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật trang trình chiếu.');
    } finally {
      setPending(false);
    }
  };

  const slideUrl = selected.kind === 'slide' ? mediaUrl(selected.preview_slide_urls[state.stage_page - 1]) : null;
  const hasPages = selected.kind === 'pdf' || selected.kind === 'slide';
  const currentPdfImage = pdfImage?.key === `${selected.id}:${state.stage_page}` ? pdfImage.url : null;

  const annotate = async (action: 'annotation_add' | 'annotation_remove', data: Record<string, unknown>) => {
    try {
      const next = await classroomApi.presentationAction(roomCode, {
        action, resource_id: selected.id, page: state.stage_page, ...data,
      });
      onStateChange(next);
      void room.localParticipant.publishData(new TextEncoder().encode('updated'), { reliable: true, topic: PRESENTATION_UPDATE_TOPIC }).catch(() => {});
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu ghi chú trên PDF.');
      throw reason;
    }
  };

  return <section aria-label={`Đang trình chiếu ${selected.title}`} className="synapse-presentation-stage flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
      <div className="min-w-0"><p className="truncate text-sm font-bold text-[#0F2258]">{selected.title}</p><p className="text-xs text-slate-500">Đang trình chiếu cho cả lớp{hasPages ? ` · Trang ${state.stage_page}/${selected.preview_page_count || '?'}` : ''}</p></div>
      {state.is_moderator && <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onOpenPanel} className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 sm:inline-flex">Chọn tài liệu khác</button>
        <button type="button" disabled={pending} onClick={() => void act('stop_present')} aria-label="Dừng trình chiếu" title="Dừng trình chiếu" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X size={18} /></button>
      </div>}
    </header>
    {error && <p role="alert" className="shrink-0 bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
    <div ref={outerScrollRef} onScroll={handleScroll} className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-[#E9EEF5] p-3">
      {selected.kind === 'pdf' && (currentPdfImage ? <div className="relative w-full max-w-[1400px] bg-white shadow-md"><img src={currentPdfImage} onLoad={applyScroll} alt={`${selected.title}, trang ${state.stage_page}`} className="block h-auto w-full" /><PdfAnnotationLayer key={`${selected.id}:${state.stage_page}`} annotations={state.stage_annotations} tool={annotationTool} isModerator={state.is_moderator} onAdd={(kind, points, text) => annotate('annotation_add', { kind, points, text })} onRemove={(annotationId) => annotate('annotation_remove', { annotation_id: annotationId })} /></div> : <p role="status" className="m-auto text-sm text-slate-500">Đang mở trang PDF…</p>)}
      {selected.kind === 'slide' && (slideUrl ? <img src={slideUrl} alt={`${selected.title}, trang ${state.stage_page}`} className="m-auto max-h-full max-w-full bg-white object-contain shadow-md" /> : <p className="m-auto text-sm text-slate-500">Slide đang được xử lý hoặc chưa có bản xem trước.</p>)}
      {selected.kind === 'doc' && <DocxPreview key={selected.id} fileUrl={mediaUrl(selected.file)} scrollRef={docScrollRef} onScroll={handleScroll} onReady={applyScroll} />}
      {selected.kind === 'model_3d' && <AnatomyModelPresentation key={selected.anatomy_model_detail?.sketchfab_uid} model={selected.anatomy_model_detail} fitStage />}
      {(selected.kind === 'video' || selected.kind === 'link') && <PresentationLinkPreview title={selected.title} url={selected.external_url} fitStage />}
    </div>
    {state.is_moderator && hasPages && <footer className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-200 bg-white px-4 py-2">
      <button type="button" disabled={pending || state.stage_page <= 1} onClick={() => void act('stage_page', state.stage_page - 1)} aria-label="Trang trước" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
      <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-slate-700">{state.stage_page} / {selected.preview_page_count || '?'}</span>
      <button type="button" disabled={pending || state.stage_page >= selected.preview_page_count} onClick={() => void act('stage_page', state.stage_page + 1)} aria-label="Trang sau" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={16} /></button>
    </footer>}
  </section>;
}

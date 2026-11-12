'use client';

/* Presentation images and DOCX content are provided by the classroom backend. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type UIEvent } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { ChevronLeft, ChevronRight, X } from 'react-bootstrap-icons';
import { requestBlob } from '@/lib/api';
import { classroomApi, type AnnotationTool, type PdfTextBlock, type PdfTextGeometry, type PresentationState } from './classroom-api';
import { DocxPreview, mediaUrl, PRESENTATION_UPDATE_TOPIC } from './LocalPresentationPanel';
import { PdfAnnotationLayer } from './PdfAnnotationLayer';
import { PresentationLinkPreview } from './PresentationLinkPreview';
import { AnatomyModelPresentation } from './AnatomyModelPresentation';
import { ClassroomStudentAssistant } from './ClassroomStudentAssistant';
import { PdfTextInteractionLayer } from './PdfTextInteractionLayer';

interface Props {
  roomCode: string;
  state: PresentationState;
  onStateChange: (state: PresentationState) => void;
  onOpenPanel: () => void;
  annotationTool: AnnotationTool;
}

const MIN_PDF_ZOOM = 0.5;
const MAX_PDF_ZOOM = 1.5;

function clampPdfZoom(value: number) {
  return Math.min(MAX_PDF_ZOOM, Math.max(MIN_PDF_ZOOM, value));
}

export function LocalPresentationStage({ roomCode, state, onStateChange, onOpenPanel, annotationTool }: Props) {
  const room = useRoomContext();
  const selected = state.stage;
  const [pdfImages, setPdfImages] = useState<{ resourceId: string | null; pages: Record<number, string> }>({ resourceId: null, pages: {} });
  const [pdfPageErrors, setPdfPageErrors] = useState<{ resourceId: string | null; pages: Record<number, boolean> }>({ resourceId: null, pages: {} });
  const [pdfTextGeometry, setPdfTextGeometry] = useState<{ resourceId: string | null; pages: Record<number, PdfTextGeometry> }>({ resourceId: null, pages: {} });
  const [pdfZoom, setPdfZoom] = useState(0.8);
  const [viewerPdfPage, setViewerPdfPage] = useState(state.stage_page);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const outerScrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const pdfPagesRef = useRef<HTMLDivElement>(null);
  const pdfZoomRef = useRef(pdfZoom);
  const zoomFocusRef = useRef<{ clientX: number; clientY: number; xRatio: number; yRatio: number } | null>(null);
  const docScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const studentScrollFrameRef = useRef<number | null>(null);
  const scrollPositionRef = useRef(0);
  const stagePageRef = useRef(state.stage_page);
  const initialPdfPositionRef = useRef<string | null>(null);
  const geometryRequestsRef = useRef(new Set<string>());
  const activePdfResourceRef = useRef(selected?.id);
  const lastAssistantBlockRef = useRef<{ page: number; block: PdfTextBlock } | null>(null);

  useEffect(() => { stagePageRef.current = state.stage_page; }, [state.stage_page]);
  useEffect(() => {
    activePdfResourceRef.current = selected?.id;
    lastAssistantBlockRef.current = null;
  }, [selected?.id]);

  useLayoutEffect(() => {
    pdfZoomRef.current = pdfZoom;
    const focus = zoomFocusRef.current;
    const container = outerScrollRef.current;
    const pages = pdfPagesRef.current;
    if (!focus || !container || !pages) return;

    const rect = pages.getBoundingClientRect();
    container.scrollBy({
      left: rect.left + rect.width * focus.xRatio - focus.clientX,
      top: rect.top + rect.height * focus.yRatio - focus.clientY,
    });
    zoomFocusRef.current = null;
  }, [pdfZoom]);

  const applyScroll = useCallback(() => {
    const docContainer = docScrollRef.current;
    const container = docContainer && docContainer.scrollHeight > docContainer.clientHeight
      ? docContainer : outerScrollRef.current;
    if (container) container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, state.stage_scroll * container.scrollHeight);
  }, [state.stage_scroll]);

  useEffect(() => {
    if (!state.is_moderator && selected?.kind !== 'pdf') applyScroll();
  }, [applyScroll, pdfImages.pages, selected?.id, selected?.kind, state.stage_page, state.is_moderator]);

  useEffect(() => {
    if (state.is_moderator && selected?.kind !== 'pdf') {
      if (outerScrollRef.current) outerScrollRef.current.scrollTop = 0;
      if (docScrollRef.current) docScrollRef.current.scrollTop = 0;
    }
    return () => {
      if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
      if (studentScrollFrameRef.current !== null) window.cancelAnimationFrame(studentScrollFrameRef.current);
      studentScrollFrameRef.current = null;
    };
  }, [selected?.id, selected?.kind, state.stage_page, state.is_moderator]);

  useEffect(() => {
    if (selected?.kind !== 'pdf' || initialPdfPositionRef.current === selected.id || pdfImages.resourceId !== selected.id || !pdfImages.pages[state.stage_page]) return;
    const container = outerScrollRef.current;
    const page = container?.querySelector<HTMLElement>(`[data-pdf-page="${state.stage_page}"]`);
    if (!container || !page) return;
    initialPdfPositionRef.current = selected.id;
    container.scrollTop = Math.max(0, page.offsetTop - 12);
    if (!state.is_moderator) window.requestAnimationFrame(() => setViewerPdfPage(state.stage_page));
  }, [pdfImages, selected?.id, selected?.kind, state.is_moderator, state.stage_page]);

  const pageAtViewportCenter = (container: HTMLDivElement) => {
    const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-pdf-page]'));
    if (!pages.length) return stagePageRef.current;
    const center = container.getBoundingClientRect().top + container.clientHeight / 2;
    let closest = pages[0];
    let distance = Number.POSITIVE_INFINITY;
    for (const page of pages) {
      const rect = page.getBoundingClientRect();
      if (rect.top <= center && rect.bottom >= center) return Number(page.dataset.pdfPage);
      const nextDistance = Math.abs(rect.top + rect.height / 2 - center);
      if (nextDistance < distance) { closest = page; distance = nextDistance; }
    }
    return Number(closest.dataset.pdfPage);
  };

  const positionAssistantTrigger = (top: number, left: number) => {
    stageRef.current?.style.setProperty('--assistant-trigger-top', `${top}px`);
    stageRef.current?.style.setProperty('--assistant-trigger-left', `${left}px`);
  };

  const updateStudentPdfFocus = (container: HTMLDivElement) => {
    const focusedPage = pageAtViewportCenter(container);
    if (focusedPage !== viewerPdfPage) setViewerPdfPage(focusedPage);
    const pageElement = container.querySelector<HTMLElement>(`[data-pdf-page="${focusedPage}"]`);
    const stageElement = stageRef.current;
    if (!pageElement || !stageElement) return;
    const pageRect = pageElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const stageRect = stageElement.getBoundingClientRect();
    const lastBlock = lastAssistantBlockRef.current;
    if (lastBlock?.page === focusedPage) {
      const blockRight = pageRect.left + lastBlock.block.bbox[2] * pageRect.width;
      const blockMiddle = pageRect.top + ((lastBlock.block.bbox[1] + lastBlock.block.bbox[3]) / 2) * pageRect.height;
      const left = Math.min(containerRect.right - 56, blockRight + 8) - stageRect.left;
      const top = Math.min(stageRect.height - 52, Math.max(64, blockMiddle - stageRect.top - 20));
      positionAssistantTrigger(top, Math.max(176, left));
      return;
    }
    if (lastBlock && lastBlock.page !== focusedPage) lastAssistantBlockRef.current = null;
    const visibleTop = Math.max(pageRect.top, containerRect.top);
    const visibleBottom = Math.min(pageRect.bottom, containerRect.bottom);
    const top = Math.min(stageRect.height - 52, Math.max(64, (visibleTop + visibleBottom) / 2 - stageRect.top - 20));
    const left = Math.min(containerRect.right, pageRect.right) - stageRect.left - 48;
    positionAssistantTrigger(top, Math.max(176, left));
  };

  const focusAssistantOnBlock = (page: number, block: PdfTextBlock | null) => {
    const container = outerScrollRef.current;
    const stageElement = stageRef.current;
    if (!container || !stageElement) return;
    if (!block) return;
    lastAssistantBlockRef.current = { page, block };
    const pageElement = container.querySelector<HTMLElement>(`[data-pdf-page="${page}"]`);
    if (!pageElement) return;
    if (page !== viewerPdfPage) setViewerPdfPage(page);
    const pageRect = pageElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const stageRect = stageElement.getBoundingClientRect();
    const blockRight = pageRect.left + block.bbox[2] * pageRect.width;
    const blockMiddle = pageRect.top + ((block.bbox[1] + block.bbox[3]) / 2) * pageRect.height;
    const left = Math.min(containerRect.right - 56, blockRight + 8) - stageRect.left;
    const top = Math.min(stageRect.height - 52, Math.max(64, blockMiddle - stageRect.top - 20));
    positionAssistantTrigger(top, Math.max(176, left));
  };

  const scrollToPdfPage = (page: number, behavior: ScrollBehavior = 'smooth') => {
    const container = outerScrollRef.current;
    const target = container?.querySelector<HTMLElement>(`[data-pdf-page="${page}"]`);
    if (!container || !target) return;
    container.scrollTo({ top: Math.max(0, target.offsetTop - 12), behavior });
  };

  const handlePdfWheel = useCallback((event: WheelEvent) => {
    if (!event.ctrlKey) return;
    event.preventDefault();

    const pages = pdfPagesRef.current;
    if (!pages) return;
    const rect = pages.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const currentZoom = pdfZoomRef.current;
    const limitedDelta = Math.min(20, Math.max(-20, event.deltaY));
    const nextZoom = clampPdfZoom(Number((currentZoom * Math.exp(-limitedDelta * 0.01)).toFixed(2)));
    if (nextZoom === currentZoom) return;

    zoomFocusRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      xRatio: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      yRatio: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
    pdfZoomRef.current = nextZoom;
    setPdfZoom(nextZoom);
  }, []);

  useEffect(() => {
    if (selected?.kind !== 'pdf') return;
    const container = outerScrollRef.current;
    if (!container) return;
    container.addEventListener('wheel', handlePdfWheel, { passive: false });
    return () => container.removeEventListener('wheel', handlePdfWheel);
  }, [handlePdfWheel, selected?.id, selected?.kind]);

  const publishPresentationUpdate = useCallback(() => room.localParticipant.publishData(
    new TextEncoder().encode('updated'), { reliable: true, topic: PRESENTATION_UPDATE_TOPIC },
  ), [room]);

  const syncPdfScroll = async (page: number, position: number) => {
    if (!selected || selected.kind !== 'pdf') return;
    try {
      if (page !== stagePageRef.current) {
        const pageState = await classroomApi.presentationAction(roomCode, { action: 'stage_page', page });
        stagePageRef.current = page;
        onStateChange(pageState);
      }
      const scrollState = await classroomApi.presentationAction(roomCode, {
        action: 'scroll', resource_id: selected.id, page, position,
      });
      onStateChange(scrollState);
      await publishPresentationUpdate();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đồng bộ vị trí PDF.');
    }
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!selected) return;
    const container = event.currentTarget;
    if (!state.is_moderator && selected.kind === 'pdf') {
      if (studentScrollFrameRef.current === null) {
        studentScrollFrameRef.current = window.requestAnimationFrame(() => {
          studentScrollFrameRef.current = null;
          updateStudentPdfFocus(container);
        });
      }
      return;
    }
    if (!state.is_moderator) return;
    const docContainer = docScrollRef.current;
    if (docContainer && docContainer.scrollHeight > docContainer.clientHeight && container !== docContainer) return;
    scrollPositionRef.current = Math.min(1, container.scrollTop / Math.max(1, container.scrollHeight - container.clientHeight));
    if (selected.kind === 'pdf') {
      const focusedPage = pageAtViewportCenter(container);
      if (focusedPage !== viewerPdfPage) setViewerPdfPage(focusedPage);
      if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = window.setTimeout(() => {
        scrollTimerRef.current = null;
        void syncPdfScroll(pageAtViewportCenter(container), scrollPositionRef.current);
      }, 180);
      return;
    }
    if (scrollTimerRef.current !== null) return;
    const resourceId = selected.id;
    const page = state.stage_page;
    scrollTimerRef.current = window.setTimeout(() => {
      scrollTimerRef.current = null;
      void classroomApi.presentationAction(roomCode, {
        action: 'scroll', resource_id: resourceId, page, position: scrollPositionRef.current,
      }).then(() => publishPresentationUpdate()).catch(() => {});
    }, 200);
  };

  useEffect(() => {
    if (selected?.kind !== 'pdf') return;
    let cancelled = false;
    const objectUrls: string[] = [];
    const pageCount = Math.max(1, selected.preview_page_count || 1);
    const firstPage = Math.min(pageCount, Math.max(1, stagePageRef.current));
    const pageQueue = [firstPage, ...Array.from({ length: pageCount }, (_, index) => index + 1).filter((page) => page !== firstPage)];
    let nextIndex = 0;
    initialPdfPositionRef.current = null;

    const loadPages = async () => {
      while (!cancelled && nextIndex < pageQueue.length) {
        const page = pageQueue[nextIndex++];
        const path = `/classrooms/${encodeURIComponent(roomCode)}/sessions/presentation/pdf/${selected.id}/pages/${page}/`;
        try {
          const blob = await requestBlob(path);
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);
          if (cancelled) { URL.revokeObjectURL(objectUrl); continue; }
          setPdfImages((current) => ({
            resourceId: selected.id,
            pages: current.resourceId === selected.id ? { ...current.pages, [page]: objectUrl } : { [page]: objectUrl },
          }));
        } catch {
          if (!cancelled) setPdfPageErrors((current) => ({
            resourceId: selected.id,
            pages: current.resourceId === selected.id ? { ...current.pages, [page]: true } : { [page]: true },
          }));
        }
      }
    };

    void Promise.all(Array.from({ length: Math.min(4, pageCount) }, () => loadPages()));
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [roomCode, selected?.id, selected?.kind, selected?.preview_page_count]);

  useEffect(() => {
    if (state.is_moderator || selected?.kind !== 'pdf') return;
    const pageCount = Math.max(1, selected.preview_page_count || 1);
    const pages = [viewerPdfPage, viewerPdfPage - 1, viewerPdfPage + 1]
      .filter((page) => page >= 1 && page <= pageCount);
    void Promise.all(pages.map(async (page) => {
      const requestKey = `${selected.id}:${page}`;
      if (geometryRequestsRef.current.has(requestKey)) return;
      geometryRequestsRef.current.add(requestKey);
      try {
        const geometry = await classroomApi.pdfTextGeometry(roomCode, selected.id, page);
        if (activePdfResourceRef.current === selected.id) setPdfTextGeometry((current) => ({
          resourceId: selected.id,
          pages: current.resourceId === selected.id ? { ...current.pages, [page]: geometry } : { [page]: geometry },
        }));
      } catch {
        geometryRequestsRef.current.delete(requestKey);
      }
    }));
  }, [roomCode, selected?.id, selected?.kind, selected?.preview_page_count, state.is_moderator, viewerPdfPage]);

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
  const pdfPages = selected.kind === 'pdf'
    ? Array.from({ length: Math.max(1, selected.preview_page_count || 1) }, (_, index) => index + 1)
    : [];
  const currentPdfImages = pdfImages.resourceId === selected.id ? pdfImages.pages : {};
  const currentPdfPageErrors = pdfPageErrors.resourceId === selected.id ? pdfPageErrors.pages : {};
  const currentPdfTextGeometry = pdfTextGeometry.resourceId === selected.id ? pdfTextGeometry.pages : {};

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

  return <section ref={stageRef} aria-label={`Đang trình chiếu ${selected.title}`} className="synapse-presentation-stage flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
      <div className="min-w-0"><p className="truncate text-sm font-bold text-[#0F2258]">{selected.title}</p><p className="text-xs text-slate-500">Đang trình chiếu cho cả lớp{hasPages ? ` · Trang ${selected.kind === 'pdf' ? viewerPdfPage : state.stage_page}/${selected.preview_page_count || '?'}` : ''}</p></div>
      <div className="flex shrink-0 items-center gap-2">
        {selected.kind === 'pdf' && <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5" aria-label="Điều chỉnh độ thu phóng PDF">
          <button type="button" disabled={pdfZoom <= MIN_PDF_ZOOM} onClick={() => setPdfZoom((value) => clampPdfZoom(Number((value - 0.1).toFixed(2))))} aria-label="Thu nhỏ PDF" title="Thu nhỏ" className="grid h-8 w-8 place-items-center rounded-md text-lg font-semibold text-slate-600 hover:bg-white disabled:opacity-35">−</button>
          <button type="button" onClick={() => setPdfZoom(0.8)} aria-label="Đặt lại độ thu phóng PDF" title="Đặt lại về 80%" className="min-w-12 rounded-md px-1.5 py-1 text-[11px] font-bold tabular-nums text-slate-700 hover:bg-white">{Math.round(pdfZoom * 100)}%</button>
          <button type="button" disabled={pdfZoom >= MAX_PDF_ZOOM} onClick={() => setPdfZoom((value) => clampPdfZoom(Number((value + 0.1).toFixed(2))))} aria-label="Phóng to PDF" title="Phóng to" className="grid h-8 w-8 place-items-center rounded-md text-lg font-semibold text-slate-600 hover:bg-white disabled:opacity-35">+</button>
        </div>}
        {state.is_moderator && <>
          <button type="button" onClick={onOpenPanel} className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 lg:inline-flex">Chọn tài liệu khác</button>
          <button type="button" disabled={pending} onClick={() => void act('stop_present')} aria-label="Dừng trình chiếu" title="Dừng trình chiếu" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X size={18} /></button>
        </>}
      </div>
    </header>
    {error && <p role="alert" className="shrink-0 bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
    {selected.kind === 'pdf' ? <div className="flex min-h-0 flex-1 bg-[#E9EEF5]">
      <aside aria-label="Danh sách trang PDF" className="hidden w-40 shrink-0 flex-col border-r border-slate-300 bg-slate-100 sm:flex">
        <div className="shrink-0 border-b border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600">Các trang · {pdfPages.length}</div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pdfPages.map((page) => <button key={page} type="button" aria-label={`Đi tới trang ${page}`} aria-current={page === viewerPdfPage ? 'page' : undefined} onClick={() => scrollToPdfPage(page)} className={`block w-full rounded-lg border bg-white p-1.5 text-left shadow-sm transition ${page === viewerPdfPage ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}>
            <span className="block overflow-hidden rounded bg-slate-200">
              {currentPdfImages[page] ? <img src={currentPdfImages[page]} alt="" className="block aspect-[210/297] w-full object-cover object-top" /> : <span className="flex aspect-[210/297] items-center justify-center text-[10px] text-slate-400">{currentPdfPageErrors[page] ? 'Lỗi' : 'Đang tải…'}</span>}
            </span>
            <span className="mt-1 block text-center text-[10px] font-bold text-slate-600">Trang {page}</span>
          </button>)}
        </div>
      </aside>
      <div ref={outerScrollRef} onScroll={handleScroll} className="min-w-0 flex-1 overflow-auto p-3">
        <div ref={pdfPagesRef} className="mx-auto flex min-w-[360px] max-w-none flex-col gap-3" style={{ width: `${Math.round(pdfZoom * 100)}%` }}>
          {pdfPages.map((page) => <article key={page} data-pdf-page={page} aria-label={`Trang ${page}`} className={`relative w-full overflow-hidden bg-white shadow-md ring-2 ${page === viewerPdfPage ? 'ring-blue-500/70' : 'ring-transparent'}`}>
            {currentPdfImages[page] ? <img src={currentPdfImages[page]} onLoad={state.is_moderator ? undefined : () => { if (page === viewerPdfPage && outerScrollRef.current) updateStudentPdfFocus(outerScrollRef.current); }} alt={`${selected.title}, trang ${page}`} className="block h-auto w-full" /> : <div role="status" className="flex aspect-[210/297] items-center justify-center bg-white text-sm text-slate-400">{currentPdfPageErrors[page] ? `Không thể mở trang ${page}` : `Đang mở trang ${page}…`}</div>}
            {!state.is_moderator && Math.abs(page - viewerPdfPage) <= 1 && currentPdfImages[page] && currentPdfTextGeometry[page] && <PdfTextInteractionLayer roomCode={roomCode} resourceId={selected.id} geometry={currentPdfTextGeometry[page]} page={page} onBlockFocus={(block) => focusAssistantOnBlock(page, block)} />}
            {page === state.stage_page && currentPdfImages[page] && <PdfAnnotationLayer key={`${selected.id}:${page}`} annotations={state.stage_annotations} tool={annotationTool} isModerator={state.is_moderator} onAdd={(kind, points, text) => annotate('annotation_add', { kind, points, text })} onRemove={(annotationId) => annotate('annotation_remove', { annotation_id: annotationId })} />}
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-slate-950/65 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">{page} / {pdfPages.length}</span>
          </article>)}
        </div>
      </div>
      {!state.is_moderator && <ClassroomStudentAssistant roomCode={roomCode} presentation={state} focusPage={viewerPdfPage} getActiveContext={() => {
        const context = lastAssistantBlockRef.current;
        return context ? { page: context.page, text: context.block.text } : null;
      }} />}
    </div> : <div ref={outerScrollRef} onScroll={handleScroll} className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-[#E9EEF5] p-3">
      {selected.kind === 'slide' && (slideUrl ? <img src={slideUrl} alt={`${selected.title}, trang ${state.stage_page}`} className="m-auto max-h-full max-w-full bg-white object-contain shadow-md" /> : <p className="m-auto text-sm text-slate-500">Slide đang được xử lý hoặc chưa có bản xem trước.</p>)}
      {selected.kind === 'doc' && <DocxPreview key={selected.id} fileUrl={mediaUrl(selected.file)} scrollRef={docScrollRef} onScroll={handleScroll} onReady={applyScroll} />}
      {selected.kind === 'model_3d' && <AnatomyModelPresentation key={selected.anatomy_model_detail?.sketchfab_uid} model={selected.anatomy_model_detail} fitStage />}
      {(selected.kind === 'video' || selected.kind === 'link') && <PresentationLinkPreview title={selected.title} url={selected.external_url} fitStage />}
    </div>}
    {state.is_moderator && selected.kind === 'slide' && <footer className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-200 bg-white px-4 py-2">
      <button type="button" disabled={pending || state.stage_page <= 1} onClick={() => void act('stage_page', state.stage_page - 1)} aria-label="Trang trước" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
      <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-slate-700">{state.stage_page} / {selected.preview_page_count || '?'}</span>
      <button type="button" disabled={pending || state.stage_page >= selected.preview_page_count} onClick={() => void act('stage_page', state.stage_page + 1)} aria-label="Trang sau" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={16} /></button>
    </footer>}
  </section>;
}

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRoomContext } from '@livekit/components-react';
import { ArrowCounterclockwise, Cursor, Eraser, Highlighter, Pencil, Sticky } from 'react-bootstrap-icons';
import { classroomApi, type AnnotationTool, type PresentationState } from './classroom-api';
import { PRESENTATION_UPDATE_TOPIC } from './LocalPresentationPanel';
import { CLASSROOM_UTILITY_EVENT, type ClassroomUtility } from './classroom-utility-events';

interface Props {
  isModerator: boolean;
  roomCode: string;
  presentation: PresentationState | null;
  onPresentationChange: (state: PresentationState) => void;
  annotationTool: AnnotationTool;
  onAnnotationToolChange: (tool: AnnotationTool) => void;
}

export function InteractionToolbar({ isModerator, roomCode, presentation, onPresentationChange, annotationTool, onAnnotationToolChange }: Props) {
  const room = useRoomContext();
  const [controlBar, setControlBar] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const canAnnotate = isModerator && presentation?.on_stage && presentation.stage?.kind === 'pdf';

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
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  useEffect(() => {
    const handleUtility = (event: Event) => {
      const utility = (event as CustomEvent<ClassroomUtility>).detail;
      setOpen(utility === 'annotations' && Boolean(canAnnotate));
    };
    window.addEventListener(CLASSROOM_UTILITY_EVENT, handleUtility);
    return () => window.removeEventListener(CLASSROOM_UTILITY_EVENT, handleUtility);
  }, [canAnnotate]);

  const undo = async () => {
    if (!presentation?.stage || pending) return;
    setPending(true);
    setError('');
    try {
      const next = await classroomApi.presentationAction(roomCode, {
        action: 'annotation_undo',
        resource_id: presentation.stage.id,
        page: presentation.stage_page,
      });
      onPresentationChange(next);
      await room.localParticipant.publishData(new TextEncoder().encode('updated'), { reliable: true, topic: PRESENTATION_UPDATE_TOPIC });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể hoàn tác ghi chú.');
    } finally {
      setPending(false);
    }
  };

  if (!controlBar || !canAnnotate || !open) return null;
  return createPortal(<div ref={panelRef} className="synapse-utility-actions relative shrink-0">
    <aside id={panelId} role="dialog" aria-label="Công cụ ghi chú PDF" className="absolute bottom-[calc(100%+12px)] right-0 z-50 w-[min(290px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-[0_24px_64px_-16px_rgba(15,34,88,0.35)]">
      <p className="mb-2 px-1 text-sm font-bold text-[#0F2258]">Ghi chú trên PDF</p>
      {([
        ['none', Cursor, 'Di chuyển'],
        ['pen', Pencil, 'Bút vẽ'],
        ['highlighter', Highlighter, 'Tô sáng'],
        ['text', Sticky, 'Ghi chú chữ'],
        ['eraser', Eraser, 'Tẩy ghi chú'],
      ] as const).map(([tool, Icon, label]) => <button key={tool} type="button" aria-pressed={annotationTool === tool} onClick={() => { onAnnotationToolChange(tool); setError(''); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold ${annotationTool === tool ? 'bg-blue-50 text-[#1E3F82]' : 'text-slate-700 hover:bg-slate-50'}`}><Icon size={17} aria-hidden="true" />{label}</button>)}
      <div className="mt-2 border-t border-slate-100 pt-2"><button type="button" disabled={pending || !presentation.stage_annotations.length} onClick={() => void undo()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ArrowCounterclockwise size={17} aria-hidden="true" />Hoàn tác ghi chú cuối</button></div>
      {error && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700">{error}</p>}
    </aside>
  </div>, controlBar);
}

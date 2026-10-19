'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRoomContext } from '@livekit/components-react';
import { RemoteParticipant, RoomEvent } from 'livekit-client';
import { ArrowCounterclockwise, Cursor, Easel2, Eraser, Highlighter, LockFill, Pencil, Trash3, UnlockFill, X } from 'react-bootstrap-icons';
import { classroomApi, type PresentationState } from './classroom-api';
import { isWhiteboardModerator, parseWhiteboardMessage, toWireStroke, WHITEBOARD_COLORS, WHITEBOARD_TOPIC, whiteboardPath, type WhiteboardCursor, type WhiteboardMessage, type WhiteboardPayload, type WhiteboardPoint, type WhiteboardStroke, type WhiteboardTool } from './whiteboard-realtime';

const encoder = new TextEncoder();

interface Props {
  roomCode: string;
  isModerator: boolean;
  presentation: PresentationState | null;
  onVisibilityChange: (visible: boolean) => void;
}

export function CollaborativeWhiteboard({ roomCode, isModerator, presentation, onVisibilityChange }: Props) {
  const room = useRoomContext();
  const stagedDocument = presentation?.on_stage && (presentation.stage?.kind === 'slide' || presentation.stage?.kind === 'pdf') ? presentation.stage : null;
  const resourceId = stagedDocument?.id || null;
  const page = resourceId ? presentation?.stage_page || 1 : 1;
  const contextKey = resourceId ? `resource:${resourceId}:page:${page}` : 'session';
  const contextLabel = stagedDocument ? `${stagedDocument.title} · Trang ${page}` : 'Bảng chung của buổi học';
  const [controlBar, setControlBar] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [locked, setLocked] = useState(true);
  const [tool, setTool] = useState<WhiteboardTool>('cursor');
  const [color, setColor] = useState<string>(WHITEBOARD_COLORS[0]);
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [draft, setDraft] = useState<WhiteboardPoint[] | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, WhiteboardCursor>>({});
  const [error, setError] = useState('');
  const [hydratedContext, setHydratedContext] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading');
  const drawingRef = useRef<WhiteboardPoint[] | null>(null);
  const strokesRef = useRef<WhiteboardStroke[]>([]);
  const lockedRef = useRef(locked);
  const visibleRef = useRef(visible);
  const cursorSentAtRef = useRef(0);
  const contextKeyRef = useRef(contextKey);
  const latestSnapshotRef = useRef({ contextKey, resourceId, page, strokes, locked });

  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { lockedRef.current = locked; }, [locked]);
  useEffect(() => { visibleRef.current = visible; onVisibilityChange(visible); }, [onVisibilityChange, visible]);

  const publish = useCallback(async (payload: WhiteboardPayload, destinationIdentities?: string[]) => {
    const message: WhiteboardMessage = { ...payload, contextKey: contextKeyRef.current, sentAt: Date.now() };
    await room.localParticipant.publishData(encoder.encode(JSON.stringify(message)), {
      reliable: payload.type !== 'cursor',
      topic: WHITEBOARD_TOPIC,
      destinationIdentities,
    });
  }, [room]);

  const addStroke = useCallback((stroke: WhiteboardStroke) => {
    setStrokes((current) => {
      const next = current.some((item) => item.id === stroke.id) ? current : [...current.slice(-299), stroke];
      strokesRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const findControlBar = () => {
      const target = document.querySelector<HTMLElement>('.lk-video-conference .lk-control-bar');
      if (target) { setControlBar(target); observer.disconnect(); }
    };
    const observer = new MutationObserver(findControlBar);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(findControlBar);
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const receive = (payload: Uint8Array, participant?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      if (topic !== WHITEBOARD_TOPIC || !participant) return;
      const message = parseWhiteboardMessage(payload);
      if (!message) return;
      const senderIsModerator = isWhiteboardModerator(participant);
      if (message.type === 'present' && senderIsModerator) {
        visibleRef.current = message.visible; setVisible(message.visible);
        return;
      }
      if (message.contextKey !== contextKeyRef.current) return;
      if (message.type === 'sync_request') {
        if (!isModerator) return;
        const destination = [participant.identity];
        void publish({ type: 'sync_reset', locked: lockedRef.current, visible: visibleRef.current }, destination).then(async () => {
          for (const stroke of strokesRef.current) await publish({ type: 'snapshot_stroke', stroke }, destination);
        }).catch(() => undefined);
        return;
      }
      if (message.type === 'sync_reset' && senderIsModerator) {
        strokesRef.current = []; lockedRef.current = message.locked; visibleRef.current = message.visible;
        setStrokes([]); setLocked(message.locked); setVisible(message.visible);
        return;
      }
      if (message.type === 'lock' && senderIsModerator) { lockedRef.current = message.locked; setLocked(message.locked); return; }
      if (message.type === 'clear' && senderIsModerator) { strokesRef.current = []; setStrokes([]); return; }
      if (message.type === 'snapshot_stroke') {
        if (senderIsModerator) addStroke(message.stroke);
        return;
      }
      if (message.type === 'stroke') {
        if (!senderIsModerator && lockedRef.current) return;
        addStroke({ ...message.stroke, authorId: participant.identity, authorName: participant.name || participant.identity });
        return;
      }
      if (message.type === 'remove') {
        if (!senderIsModerator && lockedRef.current) return;
        setStrokes((current) => {
          const next = current.filter((stroke) => stroke.id !== message.strokeId || (!senderIsModerator && stroke.authorId !== participant.identity));
          strokesRef.current = next;
          return next;
        });
        return;
      }
      if (message.type === 'cursor') {
        setRemoteCursors((current) => {
          if (!message.visible) { const next = { ...current }; delete next[participant.identity]; return next; }
          return { ...current, [participant.identity]: { identity: participant.identity, name: participant.name || participant.identity, x: message.x, y: message.y, color: message.color, updatedAt: message.sentAt } };
        });
      }
    };
    const disconnected = (participant: RemoteParticipant) => setRemoteCursors((current) => { const next = { ...current }; delete next[participant.identity]; return next; });
    room.on(RoomEvent.DataReceived, receive);
    room.on(RoomEvent.ParticipantDisconnected, disconnected);
    const cleanup = window.setInterval(() => setRemoteCursors((current) => Object.fromEntries(Object.entries(current).filter(([, cursor]) => Date.now() - cursor.updatedAt < 4000))), 2000);
    return () => { room.off(RoomEvent.DataReceived, receive); room.off(RoomEvent.ParticipantDisconnected, disconnected); window.clearInterval(cleanup); };
  }, [addStroke, isModerator, publish, room]);

  useEffect(() => {
    let cancelled = false;
    contextKeyRef.current = contextKey;
    strokesRef.current = [];
    classroomApi.whiteboardSnapshot(roomCode, { resourceId, page }).then((snapshot) => {
      if (cancelled || contextKeyRef.current !== contextKey) return;
      strokesRef.current = snapshot.strokes;
      lockedRef.current = snapshot.locked;
      setStrokes(snapshot.strokes);
      setLocked(snapshot.locked);
      setDraft(null);
      setRemoteCursors({});
      setHydratedContext(contextKey);
      setSaveStatus(snapshot.updated_at ? 'saved' : 'idle');
      if (isModerator) {
        void publish({ type: 'sync_reset', locked: snapshot.locked, visible: visibleRef.current }).then(async () => {
          for (const stroke of snapshot.strokes) await publish({ type: 'snapshot_stroke', stroke });
        }).catch(() => undefined);
      } else {
        void publish({ type: 'sync_request' }).catch(() => undefined);
      }
    }).catch((reason: unknown) => {
      if (cancelled) return;
      setSaveStatus('error');
      setError(reason instanceof Error ? reason.message : 'Không thể tải lại bảng cộng tác.');
    });
    return () => { cancelled = true; };
  }, [contextKey, isModerator, page, publish, resourceId, roomCode]);

  useEffect(() => {
    latestSnapshotRef.current = { contextKey, resourceId, page, strokes, locked };
    if (!isModerator || hydratedContext !== contextKey) return;
    const timer = window.setTimeout(() => {
      setSaveStatus('saving');
      void classroomApi.saveWhiteboardSnapshot(roomCode, { resourceId, page, strokes, locked }).then(() => {
        if (contextKeyRef.current === contextKey) { setSaveStatus('saved'); setError(''); }
      }).catch((reason: unknown) => {
        if (contextKeyRef.current === contextKey) {
          setSaveStatus('error');
          setError(reason instanceof Error ? reason.message : 'Không thể tự lưu bảng cộng tác.');
        }
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [contextKey, hydratedContext, isModerator, locked, page, resourceId, roomCode, strokes]);

  useEffect(() => () => {
    const latest = latestSnapshotRef.current;
    if (!isModerator || hydratedContext !== contextKey || latest.contextKey !== contextKey) return;
    void classroomApi.saveWhiteboardSnapshot(roomCode, {
      resourceId: latest.resourceId,
      page: latest.page,
      strokes: latest.strokes,
      locked: latest.locked,
    }).catch(() => undefined);
  }, [contextKey, hydratedContext, isModerator, roomCode]);

  const contextReady = hydratedContext === contextKey;
  const visibleStrokes = contextReady ? strokes : [];
  const canEdit = contextReady && (isModerator || !locked);
  const saveStatusLabel = !contextReady || saveStatus === 'loading' ? 'Đang tải…' : saveStatus === 'saving' ? 'Đang lưu…' : saveStatus === 'saved' ? 'Đã lưu' : saveStatus === 'error' ? 'Lỗi lưu' : 'Chưa có nét vẽ';
  const displayedStatus = isModerator ? saveStatusLabel : contextReady ? 'Đã đồng bộ' : 'Đang tải…';
  const pointAt = (event: PointerEvent<SVGSVGElement>): WhiteboardPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))];
  };
  const sendCursor = (point: WhiteboardPoint, show = true) => {
    const now = Date.now();
    if (show && now - cursorSentAtRef.current < 50) return;
    cursorSentAtRef.current = now;
    void publish({ type: 'cursor', x: point[0], y: point[1], visible: show, color }).catch(() => undefined);
  };
  const startDrawing = (event: PointerEvent<SVGSVGElement>) => {
    if (!canEdit || event.button !== 0 || (tool !== 'pen' && tool !== 'highlighter')) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = [pointAt(event)]; setDraft(drawingRef.current);
  };
  const moveDrawing = (event: PointerEvent<SVGSVGElement>) => {
    const point = pointAt(event); sendCursor(point);
    if (!drawingRef.current) return;
    const last = drawingRef.current.at(-1)!;
    if (Math.abs(point[0] - last[0]) + Math.abs(point[1] - last[1]) < 0.002) return;
    drawingRef.current = [...drawingRef.current, point].slice(0, 180); setDraft(drawingRef.current);
  };
  const finishDrawing = (event: PointerEvent<SVGSVGElement>) => {
    const points = drawingRef.current;
    if (!points || (tool !== 'pen' && tool !== 'highlighter')) return;
    drawingRef.current = null; setDraft(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const stroke: WhiteboardStroke = { id: crypto.randomUUID(), authorId: room.localParticipant.identity, authorName: room.localParticipant.name || 'Bạn', tool, color, points: points.length === 1 ? [points[0], points[0]] : points, createdAt: Date.now() };
    addStroke(stroke);
    void publish({ type: 'stroke', stroke: toWireStroke(stroke) }).catch(() => setError('Nét vẽ chưa được gửi tới lớp.'));
  };
  const removeStroke = (stroke: WhiteboardStroke, force = false) => {
    if (!canEdit || (!force && tool !== 'eraser') || (!isModerator && stroke.authorId !== room.localParticipant.identity)) return;
    setStrokes((current) => {
      const next = current.filter((item) => item.id !== stroke.id);
      strokesRef.current = next;
      return next;
    });
    void publish({ type: 'remove', strokeId: stroke.id }).catch(() => setError('Chưa xóa được nét vẽ.'));
  };
  const undo = () => {
    const stroke = [...visibleStrokes].reverse().find((item) => item.authorId === room.localParticipant.identity);
    if (stroke) removeStroke(stroke, true);
  };
  const setBoardVisible = (next: boolean) => {
    visibleRef.current = next; setVisible(next);
    if (isModerator) void publish({ type: 'present', visible: next }).catch(() => setError('Chưa đồng bộ được bảng với lớp.'));
  };
  const toggleLock = () => {
    const next = !locked; lockedRef.current = next; setLocked(next);
    void publish({ type: 'lock', locked: next }).catch(() => setError('Chưa cập nhật được quyền chỉnh sửa.'));
  };
  const clearBoard = () => {
    strokesRef.current = []; setStrokes([]);
    void publish({ type: 'clear' }).catch(() => setError('Chưa xóa được bảng.'));
  };

  const toolbarButton = controlBar ? createPortal(<div className="synapse-utility-actions relative shrink-0"><button type="button" title="Bảng cộng tác" aria-label="Bảng cộng tác" aria-pressed={visible} onClick={() => setBoardVisible(!visible)} className={`lk-button synapse-utility-button !px-3 ${visible ? '!bg-blue-700 !text-white' : ''}`}><Easel2 size={20} aria-hidden="true" /></button></div>, controlBar) : null;

  return <>
    {toolbarButton}
    {visible && <section aria-label="Bảng cộng tác" className="synapse-collaborative-whiteboard flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div className="min-w-0"><h2 className="text-sm font-bold text-[#0F2258]">Bảng cộng tác</h2><p className="max-w-[340px] truncate text-[11px] font-medium text-slate-600">{contextLabel}</p><p className="text-[10px] text-slate-400">{locked ? 'Học viên đang chỉ xem' : 'Mọi người có thể cùng vẽ'} · {displayedStatus}</p></div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {(['cursor', 'pen', 'highlighter', 'eraser'] as const).map((value) => { const Icon = value === 'cursor' ? Cursor : value === 'pen' ? Pencil : value === 'highlighter' ? Highlighter : Eraser; const label = value === 'cursor' ? 'Con trỏ' : value === 'pen' ? 'Bút vẽ' : value === 'highlighter' ? 'Tô sáng' : 'Tẩy'; return <button key={value} type="button" title={label} aria-label={label} aria-pressed={tool === value} disabled={!canEdit && value !== 'cursor'} onClick={() => setTool(value)} className={`grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-40 ${tool === value ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Icon size={16} /></button>; })}
          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
          {WHITEBOARD_COLORS.map((item) => <button key={item} type="button" title={`Màu ${item}`} aria-label={`Màu ${item}`} aria-pressed={color === item} onClick={() => setColor(item)} className={`h-6 w-6 rounded-full border-2 ${color === item ? 'border-slate-800 ring-2 ring-slate-200' : 'border-white'}`} style={{ backgroundColor: item }} />)}
          <button type="button" title="Hoàn tác nét của tôi" aria-label="Hoàn tác nét của tôi" disabled={!canEdit || !visibleStrokes.some((item) => item.authorId === room.localParticipant.identity)} onClick={undo} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ArrowCounterclockwise size={16} /></button>
          {isModerator && <><button type="button" title={locked ? 'Cho phép học viên chỉnh sửa' : 'Khóa chỉnh sửa của học viên'} aria-label={locked ? 'Cho phép học viên chỉnh sửa' : 'Khóa chỉnh sửa của học viên'} disabled={!contextReady} onClick={toggleLock} className={`grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-40 ${locked ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{locked ? <LockFill size={15} /> : <UnlockFill size={16} />}</button><button type="button" title="Xóa toàn bộ bảng" aria-label="Xóa toàn bộ bảng" disabled={!visibleStrokes.length} onClick={clearBoard} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash3 size={16} /></button></>}
          <button type="button" title="Đóng bảng" aria-label="Đóng bảng" onClick={() => setBoardVisible(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><X size={18} /></button>
        </div>
      </header>
      {error && <p role="alert" className="shrink-0 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{error}</p>}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[linear-gradient(#e8edf5_1px,transparent_1px),linear-gradient(90deg,#e8edf5_1px,transparent_1px)] bg-[size:24px_24px]">
        <svg viewBox="0 0 1000 700" preserveAspectRatio="none" onPointerDown={startDrawing} onPointerMove={moveDrawing} onPointerUp={finishDrawing} onPointerCancel={() => { drawingRef.current = null; setDraft(null); }} onPointerLeave={(event) => sendCursor(pointAt(event), false)} className={`h-full w-full touch-none ${canEdit && (tool === 'pen' || tool === 'highlighter') ? 'cursor-crosshair' : ''}`}>
          {visibleStrokes.map((stroke) => <path key={stroke.id} d={whiteboardPath(stroke.points)} fill="none" stroke={stroke.color} strokeOpacity={stroke.tool === 'highlighter' ? 0.3 : 0.95} strokeWidth={stroke.tool === 'highlighter' ? 24 : 4} strokeLinecap="round" strokeLinejoin="round" pointerEvents={canEdit && tool === 'eraser' ? 'stroke' : 'none'} onPointerDown={(event) => { event.stopPropagation(); removeStroke(stroke); }} />)}
          {contextReady && draft && <path d={whiteboardPath(draft)} fill="none" stroke={color} strokeOpacity={tool === 'highlighter' ? 0.3 : 0.95} strokeWidth={tool === 'highlighter' ? 24 : 4} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
        </svg>
        {contextReady && Object.values(remoteCursors).map((cursor) => <div key={cursor.identity} className="pointer-events-none absolute z-10 -translate-y-1" style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}><span className="block h-3 w-3 rotate-45 rounded-sm border border-white shadow" style={{ backgroundColor: cursor.color }} /><span className="ml-2 mt-0.5 block max-w-32 truncate rounded bg-slate-900/85 px-1.5 py-0.5 text-[9px] font-semibold text-white">{cursor.name}</span></div>)}
        {!canEdit && <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white shadow">Giáo viên đang khóa chỉnh sửa</div>}
      </div>
    </section>}
  </>;
}

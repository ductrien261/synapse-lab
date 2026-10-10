'use client';

import { useRef, useState, type PointerEvent } from 'react';
import type { AnnotationTool, PresentationAnnotation } from './classroom-api';

type Point = [number, number];

interface Props {
  annotations: PresentationAnnotation[];
  tool: AnnotationTool;
  isModerator: boolean;
  onAdd: (kind: 'pen' | 'highlighter' | 'text', points: Point[], text: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

function pathFor(points: Point[]): string {
  return points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x * 1000} ${y * 1000}`).join(' ');
}

export function PdfAnnotationLayer({ annotations, tool, isModerator, onAdd, onRemove }: Props) {
  const drawingRef = useRef<Point[] | null>(null);
  const [draft, setDraft] = useState<Point[] | null>(null);
  const [note, setNote] = useState<{ point: Point; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const active = isModerator && tool !== 'none';

  const pointAt = (event: PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    ];
  };

  const start = (event: PointerEvent<SVGSVGElement>) => {
    if (!active || pending || event.button !== 0) return;
    if (tool === 'text') {
      setNote({ point: pointAt(event), text: '' });
      return;
    }
    if (tool !== 'pen' && tool !== 'highlighter') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = [pointAt(event)];
    setDraft(drawingRef.current);
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return;
    const point = pointAt(event);
    const last = drawingRef.current[drawingRef.current.length - 1];
    if (Math.abs(point[0] - last[0]) + Math.abs(point[1] - last[1]) < 0.001) return;
    drawingRef.current = [...drawingRef.current, point].slice(0, 500);
    setDraft(drawingRef.current);
  };

  const finish = (event: PointerEvent<SVGSVGElement>) => {
    const points = drawingRef.current;
    if (!points || (tool !== 'pen' && tool !== 'highlighter')) return;
    drawingRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const stroke = points.length === 1 ? [points[0], points[0]] : points;
    setPending(true);
    void onAdd(tool, stroke, '').catch(() => {}).finally(() => {
      setDraft(null);
      setPending(false);
    });
  };

  const saveNote = () => {
    if (!note?.text.trim() || pending) return;
    setPending(true);
    void onAdd('text', [note.point], note.text.trim()).then(() => setNote(null)).catch(() => {}).finally(() => setPending(false));
  };

  return <>
    <svg
      aria-label={active ? 'Ghi chú trên PDF' : undefined}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={() => { drawingRef.current = null; setDraft(null); }}
      className={`absolute inset-0 h-full w-full ${active ? 'pointer-events-auto' : 'pointer-events-none'} ${tool === 'pen' || tool === 'highlighter' ? 'cursor-crosshair touch-none' : ''}`}
    >
      {annotations.filter((item) => item.kind !== 'text').map((item) => <path
        key={item.id}
        d={pathFor(item.points)}
        fill="none"
        stroke={item.kind === 'highlighter' ? '#FACC15' : '#E11D48'}
        strokeOpacity={item.kind === 'highlighter' ? 0.42 : 0.9}
        strokeWidth={item.kind === 'highlighter' ? 22 : 3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents={isModerator && tool === 'eraser' ? 'stroke' : 'none'}
        onPointerDown={(event) => {
          if (tool !== 'eraser' || pending) return;
          event.stopPropagation();
          setPending(true);
          void onRemove(item.id).catch(() => {}).finally(() => setPending(false));
        }}
      />)}
      {draft && <path d={pathFor(draft)} fill="none" stroke={tool === 'highlighter' ? '#FACC15' : '#E11D48'} strokeOpacity={tool === 'highlighter' ? 0.42 : 0.9} strokeWidth={tool === 'highlighter' ? 22 : 3.5} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
    </svg>
    {annotations.filter((item) => item.kind === 'text').map((item) => <div
      key={item.id}
      style={{ left: `${item.points[0][0] * 100}%`, top: `${item.points[0][1] * 100}%` }}
      className={`absolute max-w-[220px] -translate-x-1/2 rounded-md border border-amber-400 bg-amber-100/95 px-2 py-1 text-xs font-semibold text-amber-950 shadow-md ${tool === 'eraser' && isModerator ? 'cursor-pointer' : 'pointer-events-none'}`}
      onClick={() => { if (tool === 'eraser' && !pending) void onRemove(item.id); }}
    >{item.text}</div>)}
    {note && isModerator && <form
      onSubmit={(event) => { event.preventDefault(); saveNote(); }}
      style={{ left: `${Math.min(note.point[0] * 100, 70)}%`, top: `${note.point[1] * 100}%` }}
      className="absolute z-10 w-[min(260px,80%)] rounded-xl border border-amber-300 bg-white p-2 text-slate-900 shadow-xl"
    >
      <textarea autoFocus aria-label="Nội dung ghi chú" value={note.text} maxLength={300} rows={3} onChange={(event) => setNote({ ...note, text: event.target.value })} className="w-full resize-none rounded border border-slate-200 p-2 text-xs outline-none focus:border-amber-500" placeholder="Nhập ghi chú…" />
      <div className="mt-1 flex justify-end gap-2"><button type="button" onClick={() => setNote(null)} className="rounded px-2 py-1 text-xs text-slate-600">Hủy</button><button type="submit" disabled={!note.text.trim() || pending} className="rounded bg-[#1E3F82] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">Lưu</button></div>
    </form>}
  </>;
}

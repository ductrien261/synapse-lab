'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from 'react';
import { Check2, ChevronRight, Lightbulb, ThreeDotsVertical, Trash3, X } from 'react-bootstrap-icons';
import { classroomApi, type PdfTextBlock, type PdfTextGeometry, type PdfTextWord } from './classroom-api';
import { openClassroomAssistant } from './classroom-assistant-events';

interface Props {
  roomCode: string;
  resourceId: string;
  geometry: PdfTextGeometry;
  page: number;
  onBlockFocus: (block: PdfTextBlock | null) => void;
}

type HighlightColor = 'yellow' | 'blue' | 'green' | 'violet' | 'orange' | 'red';
type Mark = { id: number; wordIds: number[]; comment?: string; color: HighlightColor };
type InlineExplanation = { status: 'loading' | 'done' | 'error'; answer?: string; expanded?: boolean; error?: string };
const PDF_SELECTION_EVENT = 'synapse.pdf-text-selection';
const HIGHLIGHT_COLORS: Array<{ value: HighlightColor; label: string; dot: string; word: string; annotation: string }> = [
  { value: 'yellow', label: 'Vàng', dot: 'bg-amber-400', word: 'bg-amber-300/40', annotation: 'border-amber-500 bg-amber-100/20' },
  { value: 'blue', label: 'Xanh dương', dot: 'bg-blue-500', word: 'bg-blue-300/40', annotation: 'border-blue-500 bg-blue-100/20' },
  { value: 'green', label: 'Xanh lá', dot: 'bg-emerald-500', word: 'bg-emerald-300/40', annotation: 'border-emerald-500 bg-emerald-100/20' },
  { value: 'violet', label: 'Tím', dot: 'bg-violet-500', word: 'bg-violet-300/40', annotation: 'border-violet-500 bg-violet-100/20' },
  { value: 'orange', label: 'Cam', dot: 'bg-orange-500', word: 'bg-orange-300/40', annotation: 'border-orange-500 bg-orange-100/20' },
  { value: 'red', label: 'Đỏ', dot: 'bg-red-500', word: 'bg-red-300/40', annotation: 'border-red-500 bg-red-100/20' },
];

function boxStyle([x0, y0, x1, y1]: [number, number, number, number]): CSSProperties {
  return { left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%` };
}

function unionBox(words: PdfTextWord[]) {
  return [
    Math.min(...words.map((word) => word.bbox[0])),
    Math.min(...words.map((word) => word.bbox[1])),
    Math.max(...words.map((word) => word.bbox[2])),
    Math.max(...words.map((word) => word.bbox[3])),
  ] as [number, number, number, number];
}

export function PdfTextInteractionLayer({ roomCode, resourceId, geometry, page, onBlockFocus }: Props) {
  const [hoveredBlockId, setHoveredBlockId] = useState<number | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [commentMode, setCommentMode] = useState(false);
  const [comment, setComment] = useState('');
  const [explanation, setExplanation] = useState<InlineExplanation | null>(null);
  const [copied, setCopied] = useState(false);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<number | null>(null);
  const [annotationMenuId, setAnnotationMenuId] = useState<number | null>(null);
  const explanationRequestRef = useRef(0);
  const markIdRef = useRef(0);
  const annotationCloseTimerRef = useRef<number | null>(null);
  const layerId = `${resourceId}:${page}`;

  useEffect(() => {
    const clearOtherSelection = (event: Event) => {
      if ((event as CustomEvent<string>).detail === layerId) return;
      explanationRequestRef.current += 1;
      setSelectionStart(null);
      setSelectionEnd(null);
      setCommentMode(false);
      setComment('');
      setExplanation(null);
      setCopied(false);
    };
    window.addEventListener(PDF_SELECTION_EVENT, clearOtherSelection);
    return () => window.removeEventListener(PDF_SELECTION_EVENT, clearOtherSelection);
  }, [layerId]);

  useEffect(() => {
    if (!dragging) return;
    const finish = () => setDragging(false);
    window.addEventListener('pointerup', finish, { once: true });
    return () => window.removeEventListener('pointerup', finish);
  }, [dragging]);

  useEffect(() => () => {
    if (annotationCloseTimerRef.current) window.clearTimeout(annotationCloseTimerRef.current);
  }, []);

  const selectedWords = useMemo(() => {
    if (selectionStart === null || selectionEnd === null) return [];
    const from = Math.min(selectionStart, selectionEnd);
    const to = Math.max(selectionStart, selectionEnd);
    return geometry.words.slice(from, to + 1);
  }, [geometry.words, selectionEnd, selectionStart]);
  const selectedIds = useMemo(() => new Set(selectedWords.map((word) => word.id)), [selectedWords]);
  const commentedIds = useMemo(() => new Set(marks.filter((mark) => mark.comment).flatMap((mark) => mark.wordIds)), [marks]);
  const selectedText = selectedWords.map((word) => word.text).join(' ');
  const selectedBox = selectedWords.length ? unionBox(selectedWords) : null;
  const hoveredAnnotation = marks.find((mark) => mark.id === hoveredAnnotationId && mark.comment) || null;
  const hoveredAnnotationWords = hoveredAnnotation ? geometry.words.filter((word) => hoveredAnnotation.wordIds.includes(word.id)) : [];
  const hoveredAnnotationBox = hoveredAnnotationWords.length ? unionBox(hoveredAnnotationWords) : null;

  const cancelAnnotationClose = () => {
    if (annotationCloseTimerRef.current) window.clearTimeout(annotationCloseTimerRef.current);
    annotationCloseTimerRef.current = null;
  };

  const scheduleAnnotationClose = () => {
    cancelAnnotationClose();
    annotationCloseTimerRef.current = window.setTimeout(() => {
      setHoveredAnnotationId(null);
      setAnnotationMenuId(null);
    }, 180);
  };

  const clearSelection = () => {
    explanationRequestRef.current += 1;
    setSelectionStart(null);
    setSelectionEnd(null);
    setCommentMode(false);
    setComment('');
    setExplanation(null);
    setCopied(false);
  };

  const beginSelection = (event: PointerEvent<HTMLSpanElement>, index: number) => {
    if (event.button !== 0) return;
    event.preventDefault();
    window.dispatchEvent(new CustomEvent<string>(PDF_SELECTION_EVENT, { detail: layerId }));
    explanationRequestRef.current += 1;
    setSelectionStart(index);
    setSelectionEnd(index);
    setDragging(true);
    setCommentMode(false);
    setExplanation(null);
    setCopied(false);
  };

  const focusWord = (word: PdfTextWord, index: number) => {
    const block = geometry.blocks.find((item) => item.id === word.block_id) || null;
    if ((block?.id ?? null) !== hoveredBlockId) {
      setHoveredBlockId(block?.id ?? null);
      onBlockFocus(block);
    }
    if (dragging) setSelectionEnd(index);
  };

  const sendToAssistant = (kind: 'chat' | 'explain') => {
    if (!selectedText) return;
    openClassroomAssistant({ kind, page, text: selectedText });
    clearSelection();
  };

  const explainInline = async () => {
    if (!selectedText) return;
    const requestId = explanationRequestRef.current + 1;
    explanationRequestRef.current = requestId;
    setExplanation({ status: 'loading' });
    try {
      const result = await classroomApi.classroomAssistant(roomCode, {
        resourceId,
        page,
        question: `Hãy giải thích chi tiết đoạn sau: “${selectedText.slice(0, 7900)}”`,
        history: [],
      });
      if (explanationRequestRef.current === requestId) setExplanation({
        status: 'done',
        answer: result.answer,
        expanded: result.used_external_knowledge,
      });
    } catch (reason) {
      if (explanationRequestRef.current === requestId) setExplanation({
        status: 'error',
        error: reason instanceof Error ? reason.message : 'Chưa thể giải thích đoạn này.',
      });
    }
  };

  const highlight = (color: HighlightColor) => {
    if (!selectedWords.length) return;
    markIdRef.current += 1;
    setMarks((current) => [...current, { id: markIdRef.current, wordIds: selectedWords.map((word) => word.id), color }]);
    clearSelection();
  };

  const copyWithCitation = async () => {
    if (!selectedText) return;
    await navigator.clipboard.writeText(`“${selectedText}” (trang ${page})`);
    setCopied(true);
  };

  const saveComment = (event: FormEvent) => {
    event.preventDefault();
    const cleanComment = comment.trim();
    if (!cleanComment || !selectedWords.length) return;
    markIdRef.current += 1;
    setMarks((current) => [...current, { id: markIdRef.current, wordIds: selectedWords.map((word) => word.id), comment: cleanComment, color: 'yellow' }]);
    clearSelection();
  };

  const updateAnnotationColor = (id: number, color: HighlightColor) => {
    setMarks((current) => current.map((mark) => mark.id === id ? { ...mark, color } : mark));
    setAnnotationMenuId(null);
  };

  const deleteAnnotation = (id: number) => {
    setMarks((current) => current.filter((mark) => mark.id !== id));
    setHoveredAnnotationId(null);
    setAnnotationMenuId(null);
  };

  const sendAnnotationToAssistant = (mark: Mark, kind: 'chat' | 'explain') => {
    const text = geometry.words.filter((word) => mark.wordIds.includes(word.id)).map((word) => word.text).join(' ');
    if (text) openClassroomAssistant({ kind, page, text });
  };

  return <div className="absolute inset-0 z-20" onPointerLeave={() => { if (!dragging) setHoveredBlockId(null); }}>
    {geometry.words.map((word, index) => {
      const selected = selectedIds.has(word.id);
      const commented = commentedIds.has(word.id);
      const commentMark = [...marks].reverse().find((mark) => mark.comment && mark.wordIds.includes(word.id));
      const highlightColor = [...marks].reverse().find((mark) => !mark.comment && mark.wordIds.includes(word.id))?.color;
      const hovered = word.block_id === hoveredBlockId;
      const wordComment = marks.find((mark) => mark.comment && mark.wordIds.includes(word.id))?.comment;
      return <span
        key={word.id}
        aria-hidden="true"
        title={wordComment}
        onPointerDown={(event) => beginSelection(event, index)}
        onPointerEnter={() => {
          focusWord(word, index);
          if (commentMark) {
            cancelAnnotationClose();
            setHoveredAnnotationId(commentMark.id);
          }
        }}
        onPointerLeave={() => { if (commentMark) scheduleAnnotationClose(); }}
        className={`absolute cursor-text rounded-[1px] ${selected ? 'bg-blue-400/45' : commented && commentMark ? `border-b-2 ${HIGHLIGHT_COLORS.find((color) => color.value === commentMark.color)?.annotation}` : highlightColor ? HIGHLIGHT_COLORS.find((color) => color.value === highlightColor)?.word : hovered ? 'bg-sky-300/30' : 'bg-transparent'}`}
        style={{ ...boxStyle(word.bbox), touchAction: 'none' }}
      />;
    })}

    {!selectedBox && hoveredAnnotation && hoveredAnnotationBox && <div
      className="absolute z-50"
      style={{ left: `${Math.min(0.7, hoveredAnnotationBox[0]) * 100}%`, top: `${(hoveredAnnotationBox[3] > 0.78 ? hoveredAnnotationBox[1] : hoveredAnnotationBox[3]) * 100}%`, transform: hoveredAnnotationBox[3] > 0.78 ? 'translateY(calc(-100% - 8px))' : 'translateY(8px)' }}
      onPointerEnter={cancelAnnotationClose}
      onPointerLeave={scheduleAnnotationClose}
    >
      <div className="relative w-72 rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl">
        <p className="pr-7 text-[13px] font-medium leading-5">{hoveredAnnotation.comment}</p>
        <button type="button" aria-label="Tùy chọn annotation" onClick={() => setAnnotationMenuId((current) => current === hoveredAnnotation.id ? null : hoveredAnnotation.id)} className="absolute right-2 top-2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><ThreeDotsVertical size={15} /></button>
        <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold text-slate-600">
          <button type="button" onClick={() => sendAnnotationToAssistant(hoveredAnnotation, 'explain')} className="hover:text-violet-700">Explain</button>
          <button type="button" onClick={() => sendAnnotationToAssistant(hoveredAnnotation, 'chat')} className="hover:text-violet-700">Add to chat</button>
        </div>
        {annotationMenuId === hoveredAnnotation.id && <div className="absolute right-2 top-9 z-10 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Màu gạch chân</p>
          <div className="flex items-center justify-between px-1 pb-2">
            {HIGHLIGHT_COLORS.map((color) => <button key={color.value} type="button" title={color.label} aria-label={`Đổi sang màu ${color.label.toLowerCase()}`} onClick={() => updateAnnotationColor(hoveredAnnotation.id, color.value)} className={`h-4 w-4 rounded-full transition-transform hover:scale-125 ${color.dot}`} />)}
          </div>
          <button type="button" onClick={() => deleteAnnotation(hoveredAnnotation.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash3 size={13} />Xóa annotation</button>
        </div>}
      </div>
    </div>}

    {selectedBox && !dragging && <div className="absolute z-40" style={{ left: `${Math.min(0.72, selectedBox[0]) * 100}%`, top: `${(selectedBox[3] > 0.82 ? selectedBox[1] : selectedBox[3]) * 100}%`, transform: selectedBox[3] > 0.82 ? 'translateY(calc(-100% - 8px))' : 'translateY(8px)' }}>
      {explanation ? <InlineExplanationCard explanation={explanation} onClose={clearSelection} onRetry={() => void explainInline()} /> : !commentMode ? <div className="w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 text-[13px] text-slate-800 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5" aria-label="Chọn màu tô sáng">
          {HIGHLIGHT_COLORS.map((color) => <button
            key={color.value}
            type="button"
            title={`Tô sáng màu ${color.label.toLowerCase()}`}
            aria-label={`Tô sáng màu ${color.label.toLowerCase()}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => highlight(color.value)}
            className={`h-4 w-4 rounded-full ring-offset-2 transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${color.dot}`}
          />)}
        </div>
        <MenuAction label="Annotate" onClick={() => setCommentMode(true)} />
        <MenuAction label="Explain" onClick={() => void explainInline()} />
        <MenuAction label="Add to chat" onClick={() => sendToAssistant('chat')} />
        <MenuAction label={copied ? 'Copied with citation' : 'Copy with citation'} onClick={() => void copyWithCitation()} trailing={copied ? <Check2 size={15} className="text-emerald-600" /> : <ChevronRight size={14} />} />
      </div> : <form onSubmit={saveComment} className="flex w-72 items-center gap-2 rounded-xl border border-violet-200 bg-white p-2 shadow-xl">
        <input autoFocus value={comment} maxLength={300} onChange={(event) => setComment(event.target.value)} placeholder="Viết ghi chú cho đoạn này…" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-violet-400" />
        <button type="submit" disabled={!comment.trim()} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Lưu</button>
      </form>}
    </div>}
  </div>;
}

function InlineExplanationCard({ explanation, onClose, onRetry }: { explanation: InlineExplanation; onClose: () => void; onRetry: () => void }) {
  return <div className="w-[min(360px,72vw)] overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-2xl">
    <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50/80 px-3 py-2.5"><span className="flex items-center gap-2 text-xs font-extrabold text-violet-800"><Lightbulb size={14} />Giải thích đoạn đã chọn</span><button type="button" onClick={onClose} aria-label="Đóng giải thích" className="rounded-md p-1 text-slate-400 hover:bg-white"><X size={14} /></button></div>
    {explanation.status === 'loading' ? <div role="status" aria-label="AI đang giải thích" className="space-y-2.5 p-4"><div className="h-3 w-11/12 animate-pulse rounded bg-violet-100" /><div className="h-3 w-full animate-pulse rounded bg-slate-100" /><div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" /><div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-slate-100" /></div> : explanation.status === 'error' ? <div className="p-4"><p className="text-xs leading-5 text-rose-700">{explanation.error}</p><button type="button" onClick={onRetry} className="mt-2 text-xs font-bold text-violet-700 hover:underline">Thử lại</button></div> : <div className="max-h-64 overflow-y-auto p-4"><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{explanation.answer}</p>{explanation.expanded && <span className="mt-3 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">Có kiến thức mở rộng</span>}</div>}
  </div>;
}

function MenuAction({ label, onClick, trailing }: { label: string; onClick: () => void; trailing?: React.ReactNode }) {
  return <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={onClick} className="flex w-full items-center justify-between px-3 py-2 text-left font-medium transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"><span>{label}</span>{trailing}</button>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Stars } from 'react-bootstrap-icons';
import { algorithmTutorApi } from '@/lib/algorithm-api';
import type { AlgorithmTutorResult } from '@/lib/algorithm-api';
import type { SimulationFrame } from '@/lib/simulation';
import { CppCodeLine } from './CppCodeLine';
import { SimulationCodePanel } from './SimulationCodePanel';

interface SelectionRange { start: number; end: number; top: number }

export function SelectableCodeLesson({ source, algorithmPath, enabled, frame }: {
  source: string; algorithmPath: string; enabled: boolean; frame?: SimulationFrame | null;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [explainedRange, setExplainedRange] = useState<{ start: number; end: number } | null>(null);
  const [result, setResult] = useState<AlgorithmTutorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (result) answerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [result]);

  const captureSelection = () => {
    const box = boxRef.current;
    const selected = window.getSelection();
    if (!enabled || !box || !selected || selected.isCollapsed || !selected.toString().trim() ||
        !selected.anchorNode || !selected.focusNode ||
        !box.contains(selected.anchorNode) || !box.contains(selected.focusNode)) {
      setSelection(null);
      return;
    }
    const lineOf = (node: Node) => {
      const element = node instanceof Element ? node : node.parentElement;
      const code = element?.closest('[data-code-line]');
      const row = element?.closest('[data-line]');
      return Number(code?.getAttribute('data-code-line') ?? row?.getAttribute('data-line'));
    };
    const first = lineOf(selected.anchorNode);
    const last = lineOf(selected.focusNode);
    if (!first || !last) { setSelection(null); return; }
    const start = Math.min(first, last);
    const end = Math.max(first, last);
    if (end - start >= 30) {
      setError('Hãy chọn tối đa 30 dòng để AI giải thích rõ hơn.');
      setSelection(null);
      return;
    }
    const bottom = selected.getRangeAt(0).getBoundingClientRect().bottom - box.getBoundingClientRect().top + 6;
    setSelection({ start, end, top: Math.max(8, Math.min(bottom, box.clientHeight - 44)) });
    setError('');
    setResult(null);
  };

  const explain = async () => {
    if (!selection || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await algorithmTutorApi.generate(algorithmPath, {
        action: 'explain_code', code_selection: { start_line: selection.start, end_line: selection.end, source },
      });
      setExplainedRange({ start: selection.start, end: selection.end });
      setResult(response);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa giải thích được đoạn mã. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="space-y-3">
    {enabled && <p className="text-[11px] text-stone-500">Chọn một đoạn code để giải thích chi tiết.</p>}
    <div ref={boxRef} onMouseUp={captureSelection} onKeyUp={captureSelection} onScrollCapture={() => setSelection(null)} className="relative">
      {frame ? <SimulationCodePanel frame={frame} /> : <div className="max-h-[640px] overflow-auto rounded-2xl bg-[#1E1E2E] p-4 font-mono text-xs leading-6">
        {source.split('\n').map((line, index) => <div key={index} data-line={index + 1} className="flex gap-3"><span className="w-6 shrink-0 select-none text-right text-slate-500">{index + 1}</span><pre data-code-line={index + 1} className="m-0 min-w-0 whitespace-pre-wrap break-words"><CppCodeLine code={line} /></pre></div>)}
      </div>}
      {selection && <button
        type="button"
        onMouseDown={event => event.preventDefault()}
        onClick={() => { void explain(); }}
        disabled={loading}
        style={{ top: selection.top }}
        className="absolute right-3 z-10 inline-flex items-center gap-1 rounded-full border border-[#B9CEF1] bg-white px-3 py-2 font-sans text-xs font-semibold text-[#1E3F82] shadow-lg disabled:opacity-50"
        aria-label={`Giải thích đoạn mã dòng ${selection.start} đến ${selection.end}`}
      ><Stars aria-hidden="true" /> Giải thích đoạn này</button>}
    </div>
    {loading && <p role="status" className="rounded-xl bg-[#F4F7FC] p-3 text-xs text-stone-600">AI đang giải thích đoạn mã…</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    {result && <div ref={answerRef} className="rounded-xl border border-[#DDE6F5] bg-[#F4F7FC] p-4 text-xs leading-6" aria-live="polite">
      {explainedRange && <span className="text-[11px] font-semibold text-[#1E3F82]">Dòng {explainedRange.start}{explainedRange.end > explainedRange.start ? `–${explainedRange.end}` : ''}</span>}
      <h3 className="font-bold text-[#243355]">{result.title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-stone-700">{result.content}</p>
    </div>}
  </div>;
}

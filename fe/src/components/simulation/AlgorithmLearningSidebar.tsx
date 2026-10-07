'use client';

import { useId, useState } from 'react';
import { ChatDotsFill, CodeSlash } from 'react-bootstrap-icons';
import type { AlgorithmCodeLesson, AlgorithmLessonBlock } from '@/lib/algorithm-api';
import type { SimulationFrame } from '@/lib/simulation';
import { SimulationCodePanel } from './SimulationCodePanel';
import { AlgorithmTutorPanel } from './AlgorithmTutorPanel';
import { SelectableCodeLesson } from './SelectableCodeLesson';

interface Props {
  algorithmPath: string;
  algorithmTitle: string;
  tutorEnabled?: boolean;
  frame: SimulationFrame | null;
  codeLesson?: AlgorithmCodeLesson | Record<string, never>;
  pseudocode?: string;
  blocks?: AlgorithmLessonBlock[];
}

export function AlgorithmLearningSidebar({ algorithmPath, algorithmTitle, tutorEnabled = true, frame, codeLesson, pseudocode, blocks = [] }: Props) {
  const [tab, setTab] = useState<'ai-tutor' | 'code'>('code');
  const panelId = useId();
  return <section className="flex min-h-[580px] min-w-0 flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm">
    <nav aria-label="Trợ giảng và mã nguồn" className="flex items-center gap-2 border-b border-stone-200/70 bg-stone-50 p-3">
      {([{ key: 'ai-tutor', label: 'AI Tutor Trợ Giảng', icon: ChatDotsFill }, { key: 'code', label: 'Code & Mã Giả', icon: CodeSlash }] as const).map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-pressed={tab === key} aria-controls={panelId} onClick={() => setTab(key)} className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors ${tab === key ? 'border-stone-200/80 bg-white text-[#243355] shadow-sm' : 'border-transparent text-stone-500 hover:text-stone-900'}`}><Icon className="h-3.5 w-3.5 shrink-0 text-[#1E3F82]" /><span>{label}</span></button>)}
    </nav>
    <div id={panelId} className="flex min-w-0 flex-1 flex-col">
      {tab === 'code' ? <div className="min-w-0 space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xs font-bold text-[#243355]">Mã nguồn · bước đang chạy</h2>{frame && <span className="text-[11px] text-stone-500">{frame.code.language === 'cpp' ? 'C++' : frame.code.language === 'javascript' ? 'JavaScript' : 'TypeScript'} · Dòng {frame.step.codeLine}</span>}</div>
        {frame?.code.description && <p className="text-[11px] text-stone-500">{frame.code.description}</p>}
        {frame ? frame.code.language === 'cpp' ? <SelectableCodeLesson source={frame.code.source} frame={frame} algorithmPath={algorithmPath} enabled={tutorEnabled} /> : <SimulationCodePanel frame={frame} /> : codeLesson?.source ? <SelectableCodeLesson source={codeLesson.source} algorithmPath={algorithmPath} enabled={tutorEnabled} /> : <p className="py-8 text-center text-sm text-stone-500">Chưa có mã nguồn để hiển thị.</p>}
        {pseudocode && <details className="border-t border-stone-100 pt-4"><summary className="cursor-pointer text-xs font-bold text-[#243355]">Mã giả</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-stone-50 p-3 text-xs leading-6 text-stone-600">{pseudocode}</pre></details>}
      </div> : <AlgorithmTutorPanel algorithmPath={algorithmPath} algorithmTitle={algorithmTitle} enabled={tutorEnabled} frame={frame} codeLesson={codeLesson} blocks={blocks} />}
    </div>
  </section>;
}

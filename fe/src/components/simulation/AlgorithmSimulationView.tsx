'use client';

import { useState } from 'react';
import { ArrowLeft, CodeSlash, Diagram3Fill, Download, GridFill, PlayCircleFill } from 'react-bootstrap-icons';
import type { AlgorithmCodeLesson, AlgorithmContentDto, AlgorithmViewDetail } from '@/lib/algorithm-api';
import { AlgorithmCodeWriting } from './AlgorithmCodeWriting';
import { AlgorithmLessonOverview } from './AlgorithmLessonOverview';
import { AlgorithmLessonContent } from './AlgorithmLessonContent';
import { AlgorithmLessonBlocks } from './AlgorithmLessonBlocks';
import { AlgorithmLearningSidebar } from './AlgorithmLearningSidebar';
import { AlgorithmVisualization } from './AlgorithmVisualization';
import type { SimulationFrame } from '@/lib/simulation';

interface Props {
  algorithmDetail?: AlgorithmViewDetail | null;
  lessonContent?: AlgorithmContentDto | null;
  onBack: () => void;
  preview?: boolean;
}

export function AlgorithmSimulationView({ algorithmDetail, lessonContent, onBack, preview = false }: Props) {
  const content = preview || lessonContent?.status === 'published' ? lessonContent : null;
  const fields = content?.lesson_fields ?? {};
  const title = fields.title || algorithmDetail?.algorithmName || 'Thuật toán';
  const codeLesson = content?.code_lesson;
  const hasCodeLesson = Boolean(codeLesson?.steps?.length);
  const hasTheory = content?.lesson_blocks?.some(block => block.kind === 'theory');
  const visualization = content?.simulation?.config ?? algorithmDetail?.visualization;
  const algorithmPath = algorithmDetail ? `${algorithmDetail.categoryKey}/${algorithmDetail.algorithmKey}` : content?.simulation?.algorithm_path ?? '';
  const hasRunner = Boolean(visualization);
  const [mode, setMode] = useState<'interactive' | 'gallery' | 'code'>('interactive');
  const [frame, setFrame] = useState<SimulationFrame | null>(null);
  const [exportRequest, setExportRequest] = useState(0);
  const run = () => { setFrame(null); setMode('interactive'); };
  const onGraphMode = (next: 'interactive' | 'gallery') => setMode(next);

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" aria-label="Quay lại danh sách bài học" onClick={onBack} className="shrink-0 rounded-2xl border border-stone-200 p-3 text-stone-700"><ArrowLeft /></button>
        <Diagram3Fill className="h-6 w-6 shrink-0 text-[#1E3F82]" />
        <div><p className="text-[11px] font-bold uppercase text-[#1E3F82]">{algorithmDetail?.categoryName}</p><h1 className="text-base font-bold text-stone-900 sm:text-lg">{title}</h1></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <nav aria-label="Chế độ học thuật toán" className="flex flex-wrap gap-1 rounded-2xl border border-stone-200 bg-stone-100 p-1">
          {([{ key: 'interactive', label: 'Mô phỏng trực quan', icon: PlayCircleFill }, { key: 'gallery', label: 'Sơ đồ từng bước', icon: GridFill }, { key: 'code', label: 'Giải thích code', icon: CodeSlash }] as const).map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${mode === key ? 'bg-[#243355] text-white' : 'text-stone-600'}`}><Icon />{label}</button>)}
        </nav>
        {hasRunner && mode !== 'code' && <button type="button" disabled={!frame} onClick={() => setExportRequest(value => value + 1)} className="inline-flex items-center gap-2 rounded-xl bg-[#243355] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Download />Xuất SVG</button>}
      </div>
    </header>

    {!content && <p className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500">Nội dung bài học sẽ được cập nhật sau.</p>}
    {mode === 'code' ? <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
      {hasCodeLesson ? <AlgorithmCodeWriting key={codeLesson?.source} title={title} lesson={codeLesson as AlgorithmCodeLesson} onRun={hasRunner ? run : undefined} /> : <p className="p-8 text-center text-sm text-stone-500">Chưa có bài hướng dẫn code được xuất bản cho thuật toán này.</p>}
    </section> : <div className={`grid min-w-0 items-stretch gap-5 ${mode === 'interactive' ? 'lg:grid-cols-2' : ''}`}>
      {visualization ? <AlgorithmVisualization key={`${algorithmPath}-${content?.updated_at ?? ''}`} algorithmPath={algorithmPath} config={visualization} storedSamples={content?.simulation?.samples} mode={mode} onMode={onGraphMode} onStep={setFrame} exportRequest={exportRequest} /> : <p className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Chưa có mô phỏng cho thuật toán này.</p>}
      {mode === 'interactive' && <AlgorithmLearningSidebar key={algorithmPath} algorithmPath={algorithmPath} algorithmTitle={title} tutorEnabled={!preview && Boolean(content)} frame={frame} codeLesson={codeLesson} pseudocode={fields.pseudocode} blocks={content?.lesson_blocks} />}
    </div>}

    {content && mode === 'interactive' && <>
      {!hasTheory && <AlgorithmLessonOverview content={content} />}
      {!hasTheory && (fields.theory || content.theory) ? <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-sm font-bold text-[#243355]">Ý tưởng & cách giải</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-600">{fields.theory || content.theory}</p></section> : null}
      <AlgorithmLessonContent key={algorithmPath} content={content} />
    </>}

    {content && <AlgorithmLessonBlocks blocks={content.lesson_blocks ?? []} />}

  </div>;
}

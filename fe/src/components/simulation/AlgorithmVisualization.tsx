'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSimulationTrace } from '@/lib/algo-api';
import type { SimulationConfig, SimulationFrame, SimulationTrace } from '@/lib/simulation';
import { GraphInputEditor } from './GraphInputEditor';
import { SimulationRenderer } from './SimulationRenderer';
import { SimulationGallery } from './SimulationGallery';
import { SimulationExplanation } from './SimulationExplanation';
import { SimulationControls } from './SimulationControls';
import { useSimulationPlayback } from './useSimulationPlayback';
import { downloadSimulationSvg } from './simulation-svg';

interface Props {
  algorithmPath: string;
  config: SimulationConfig;
  storedSamples?: Record<string, SimulationTrace>;
  onStep: (frame: SimulationFrame | null) => void;
  mode: 'interactive' | 'gallery';
  onMode: (mode: 'interactive' | 'gallery') => void;
  exportRequest: number;
}
export function AlgorithmVisualization(props: Props) {
  const { config, onStep } = props;
  const [sample, setSample] = useState(config.samples[0]?.key ?? 'custom');
  const [custom, setCustom] = useState<number[][]>();
  const [revision, setRevision] = useState(0);
  return <section className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4"><h2 className="text-sm font-bold text-[#243355]">{config.title}</h2><select aria-label="Chọn đầu vào mô phỏng" value={sample} onChange={event => { onStep(null); setSample(event.target.value); }} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700">{config.samples.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}{config.customInput && <option value="custom">Tùy chỉnh đồ thị</option>}</select></div>
    {sample === 'custom' && config.customInput && <GraphInputEditor minVertices={config.customInput.minVertices} maxVertices={config.customInput.maxVertices} onApply={matrix => { onStep(null); setCustom(matrix); setRevision(value => value + 1); }} />}
    {sample === 'custom' && !custom ? <p className="p-8 text-center text-sm text-stone-500">Chọn số đỉnh và các cạnh, rồi nhấn Áp dụng để mô phỏng.</p> : <TraceLoader key={`${props.algorithmPath}-${sample}-${revision}`} {...props} sample={sample} adjacency={sample === 'custom' ? custom : undefined} />}
  </section>;
}
function TraceLoader({ sample, adjacency, ...props }: Props & { sample: string; adjacency?: number[][] }) {
  const [trace, setTrace] = useState<SimulationTrace | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const { algorithmPath, onStep, storedSamples } = props;
  useEffect(() => {
    let cancelled = false;
    onStep(null);
    const request = sample !== 'custom' && storedSamples ? Promise.resolve(storedSamples[sample]) : getSimulationTrace(algorithmPath, sample, adjacency);
    request.then(data => {
      if (!data?.steps.length || data.renderer !== props.config.renderer) throw new Error('Invalid simulation trace.');
      if (!cancelled) { setTrace(data); setError(''); }
    }).catch((error: unknown) => { if (!cancelled) setError(error instanceof Error ? error.message : 'Không tải được dữ liệu mô phỏng.'); });
    return () => { cancelled = true; };
  }, [algorithmPath, sample, adjacency, retry, onStep, props.config.renderer, storedSamples]);
  if (error) return <div role="alert" className="p-8 text-center text-sm text-rose-700">{error}<button type="button" onClick={() => setRetry(value => value + 1)} className="ml-3 font-semibold text-[#1E3F82]">Thử lại</button></div>;
  if (!trace) return <p role="status" className="p-8 text-center text-sm text-stone-500">Đang tạo các bước mô phỏng...</p>;
  return <Playback trace={trace} {...props} />;
}
function Playback({ trace, onStep, mode, onMode, exportRequest, config }: Props & { trace: SimulationTrace }) {
  const checkpoints = useMemo(() => trace.steps.flatMap((step, index) => step.narration?.pause ? [index] : []), [trace.steps]);
  const playback = useSimulationPlayback(trace.steps.length, mode === 'interactive', checkpoints);
  const step = trace.steps[playback.index];
  const svgRef = useRef<SVGSVGElement>(null);
  const lastExport = useRef(exportRequest);
  useEffect(() => {
    if (lastExport.current === exportRequest) return;
    lastExport.current = exportRequest;
    if (svgRef.current) downloadSimulationSvg(svgRef.current, step, playback.index, config.title);
  }, [exportRequest, step, playback.index, config.title]);
  useEffect(() => { onStep({ step, code: trace.code }); }, [step, trace.code, onStep]);
  if (mode === 'gallery') return <SimulationGallery steps={trace.steps} selected={playback.index} onSelect={index => { playback.navigate(index); onMode('interactive'); }} />;
  return <>
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 px-5 pt-4 text-xs">{step.metrics.map((metric, index) => <span key={metric.label} className={index === 0 ? 'rounded-lg bg-[#E8F0FB] px-3 py-2 font-semibold text-[#1E3F82]' : 'text-stone-500'}>{metric.label}: {metric.value}</span>)}</div>
      <div className="flex flex-1 flex-col justify-center gap-3 px-4 py-3"><SimulationRenderer step={step} svgRef={svgRef} /><div className="mx-auto w-full max-w-[540px] rounded-xl border border-[#DDE6F5] bg-[#F4F7FC]/95 px-3 py-2.5 text-xs leading-relaxed" role="status">{step.narration ? <><SimulationExplanation narration={step.narration} />{step.narration.pause && !playback.running && !playback.atEnd && <p className="mt-3 text-[11px] text-[#1E3F82]">Đang dừng để đọc. Bấm Tiếp tục khi đã hiểu nhánh này.</p>}</> : <span className="text-stone-700">{step.message}</span>}</div></div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-5 pb-4 text-[11px] text-stone-500"><span>🔵 Đã chọn</span><span>🟠 Đang xét</span><span>🔴 Bỏ qua / không hợp lệ</span><span>🟢 Hoàn thành</span></div>
    </div>
    <SimulationControls playback={playback} summary={trace.summary} />
  </>;
}

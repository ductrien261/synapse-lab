'use client';

import { useId, useState } from 'react';
import { ArrowRight, Diagram3 } from 'react-bootstrap-icons';
import type { AlgorithmApplicationScenario } from '@/lib/algorithm-api';
import { ApplicationScene } from './ApplicationScene';
import { SimulationControls } from './SimulationControls';
import { useSimulationPlayback } from './useSimulationPlayback';

export function AlgorithmApplications({ scenarios }: { scenarios: AlgorithmApplicationScenario[] }) {
  const [selected, setSelected] = useState('');
  const panelId = useId();
  const current = scenarios.find(item => item.id === selected);
  return <div>
    <h3 className="text-lg font-bold text-[#243355]">Khám phá ứng dụng thực tế</h3>
    <p className="mt-2 text-sm leading-7 text-stone-500">Chọn một tình huống để xem bài toán được mô hình hóa và giải quyết từng bước.</p>
    <div className="mt-5 divide-y divide-stone-100 border-y border-stone-100">
      {scenarios.map(item => <button key={item.id} type="button" aria-expanded={current?.id === item.id} aria-controls={panelId} onClick={() => setSelected(item.id)} className={`flex w-full items-center gap-4 rounded-xl px-3 py-5 text-left transition-colors hover:bg-stone-50 ${current?.id === item.id ? 'bg-[#E8F0FB]' : ''}`}>
        <Diagram3 aria-hidden className="h-6 w-6 shrink-0 text-[#1E3F82]" />
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#243355]">{item.title}</span><span className="mt-2 block text-sm leading-6 text-stone-500">{item.summary}</span><span className="mt-2 block text-xs font-semibold text-[#1E3F82]">{item.tag}</span></span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-[#1E3F82]"><span className="hidden sm:inline">Khám phá</span><ArrowRight aria-hidden /></span>
      </button>)}
    </div>
    <div id={panelId}>{current ? <ApplicationDetail key={current.id} scenario={current} /> : <p className="py-10 text-center text-sm text-stone-500">Chọn một ứng dụng trong danh sách phía trên để bắt đầu.</p>}</div>
  </div>;
}

function ApplicationDetail({ scenario }: { scenario: AlgorithmApplicationScenario }) {
  const [variant, setVariant] = useState('initial');
  const alternative = scenario.scene?.alternatives?.find(item => item.id === variant);
  const resolved = alternative ? { ...scenario, steps: alternative.steps } : scenario;
  return <article className="mt-6 space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-wide text-[#1E3F82]">{scenario.tag}</p><h4 className="mt-2 text-lg font-bold text-[#243355]">{scenario.title}</h4><p className="mt-3 text-sm leading-7 text-stone-600">{scenario.problem}</p></div>
    {!!scenario.scene?.alternatives?.length && <div><p className="mb-2 text-xs font-semibold text-stone-500">So sánh thứ tự ghé các điểm</p><div className="flex flex-wrap gap-2">{[{id:'initial',label:'Thứ tự ban đầu · tuyến Hamilton'},...scenario.scene.alternatives].map(option=><button key={option.id} type="button" aria-pressed={variant===option.id} onClick={()=>setVariant(option.id)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${variant===option.id?'border-[#8fa9d3] bg-[#e8f0fb] text-[#1E3F82]':'border-stone-200 text-stone-600'}`}>{option.label}</button>)}</div></div>}
    <ApplicationPlayback key={variant} scenario={resolved}/>
  </article>;
}

function distanceOf(scenario: AlgorithmApplicationScenario, route: number[]) {
  const distance = scenario.scene?.distance;
  if (!distance) return 0;
  return route.slice(1).reduce((sum, current, i) => {
    const a = scenario.nodes[route[i]], b = scenario.nodes[current];
    const dx = Math.abs(a.x-b.x), dy = Math.abs(a.y-b.y);
    return sum + (distance.metric==='euclidean'?Math.hypot(dx,dy):dx+dy)*distance.scale;
  },0);
}

function ApplicationMetrics({scenario,index}:{scenario:AlgorithmApplicationScenario;index:number}) {
  const scene=scenario.scene,step=scenario.steps[index];
  if (!scene) return null;
  const route=step.phase==='move'?step.route.slice(0,-1):step.route;
  const count=scene.kind==='route'?new Set(route.filter(n=>n!==0)).size:step.route.length;
  const target=scene.kind==='route'?scenario.nodes.length-1:scene.kind==='placement'?Math.sqrt(scenario.nodes.length):scenario.nodes.length;
  const total=step.route.reduce((sum,i)=>sum+(scene.values?.[i]??0),0);
  return <div className="my-6 grid grid-cols-2 gap-4">
    <div><p className="text-xs text-stone-500">{scene.metricLabel??'Đã chọn'}</p><p className="mt-2 text-lg font-bold text-[#243355]">{scene.kind==='subset'?`${total} / ${scene.target} ${scene.unit}`:`${count} / ${target}`}</p></div>
    {scene.distance&&<div><p className="text-xs text-stone-500">Đã di chuyển</p><p className="mt-2 text-lg font-bold text-[#243355]">{distanceOf(scenario,step.route).toFixed(1)} {scene.distance.unit}</p></div>}
    {scene.distance&&<p className="col-span-2 text-xs leading-6 text-stone-500">Tổng tuyến đang chọn: {distanceOf(scenario,scenario.steps.at(-1)!.route).toFixed(1)} {scene.distance.unit}. {scenario.result}</p>}
  </div>;
}

function ApplicationPlayback({ scenario }: { scenario: AlgorithmApplicationScenario }) {
  const playback = useSimulationPlayback(scenario.steps.length, true);
  const step = scenario.steps[playback.index];
  const rangeId = useId();
  const color = step.state === 'success' ? '#059669' : step.state === 'backtrack' ? '#d97706' : '#1E3F82';
  const selected = new Set(step.route);
  const isGraph = scenario.edges.length > 0;
  const isBoard = scenario.nodes.length >= 16;
  const routePoints = step.route.map(index => `${scenario.nodes[index].x * 6},${scenario.nodes[index].y * 4}`).join(' ');
  return <div className="space-y-5">
    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <>{scenario.scene ? <ApplicationScene scenario={scenario} index={playback.index} speed={playback.speed} running={playback.running} /> : <figure className="rounded-2xl border border-[#DDE6F5] bg-[#F3F7FD] p-3">
        <svg viewBox="0 0 600 400" role="img" aria-label={`${scenario.title}: ${step.title}`} className="h-auto w-full">
          {scenario.edges.map(([a, b], i) => <line key={i} x1={scenario.nodes[a].x * 6} y1={scenario.nodes[a].y * 4} x2={scenario.nodes[b].x * 6} y2={scenario.nodes[b].y * 4} stroke="#b5c5dc" strokeWidth="3" strokeDasharray="6 5" />)}
          {isGraph && <polyline points={routePoints} fill="none" stroke={color} strokeWidth="5" strokeLinejoin="round" />}
          {scenario.nodes.map((node, index) => <g key={index} transform={`translate(${node.x * 6},${node.y * 4})`}>
            {isBoard ? <rect x="-25" y="-24" width="50" height="48" rx="5" fill={selected.has(index) ? color : 'white'} stroke={selected.has(index) ? color : '#b5c5dc'} strokeWidth="2" className="transition-colors duration-300" /> : <circle r={25} fill={selected.has(index) ? color : 'white'} stroke={selected.has(index) ? color : '#b5c5dc'} strokeWidth="2" className="transition-colors duration-300" />}
            <text textAnchor="middle" dy={isGraph ? 45 : 5} fontSize={scenario.nodes.length > 16 ? 12 : 13} fill={!isGraph && selected.has(index) ? 'white' : '#243355'}>{node.label}</text>
          </g>)}
        </svg>
        <figcaption className="flex flex-wrap gap-3 text-xs leading-6 text-stone-600"><span>🔵 Đang thử</span><span>🟠 Nhánh bị loại / quay lui</span><span>🟢 Kết quả hợp lệ</span></figcaption>
      </figure>}</>
      <div className="flex min-w-0 flex-col">
        <div className="flex-1 p-5" aria-live="polite"><p className="text-xs text-stone-400">BƯỚC {playback.index + 1} / {scenario.steps.length}</p><h5 className="mt-2 text-base font-bold text-[#243355]">{step.title}</h5><p className="mt-3 text-sm leading-7 text-stone-600">{step.description}</p><ApplicationMetrics scenario={scenario} index={playback.index}/><p className="mt-5 text-xs font-semibold text-stone-500">{scenario.scene?.kind==='route'?'Tuyến đang xét':'Các lựa chọn đang xét'}</p><p className="mt-2 max-h-28 overflow-y-auto break-words text-sm leading-7 font-semibold text-[#1E3F82]">{step.route.map(index => scenario.nodes[index].label).join(' → ') || 'Chưa chọn'}</p></div>
        <label htmlFor={rangeId} className="px-5 text-xs text-stone-500">Chọn bước</label><input id={rangeId} type="range" min={0} max={scenario.steps.length - 1} value={playback.index} onChange={event => playback.navigate(Number(event.target.value))} className="mx-5 my-3 accent-[#1E3F82]" />
        <SimulationControls playback={playback} summary={scenario.result} />
      </div>
    </div>
    <div className="grid gap-5 border-t border-stone-100 pt-5 md:grid-cols-3">{[['Từ thực tế đến mô hình', scenario.model], ['Thuật toán giải quyết như thế nào?', scenario.solution], ['Giới hạn của mô hình', scenario.limitations]].map(([title, text]) => <section key={title}><h5 className="text-sm font-bold text-[#243355]">{title}</h5><p className="mt-2 text-sm leading-7 text-stone-600">{text}</p></section>)}</div>
    <p className="rounded-xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-800"><strong>Kết quả thực tế trong mô hình: </strong>{scenario.result}</p>
  </div>;
}

'use client';

import { useState } from 'react';
import { ArrowRight, CursorFill, Eraser, Pencil, PlayFill, Plus, Share } from 'react-bootstrap-icons';

const nodes = [
  { label: 'A', x: 13, y: 54, state: 'visited' },
  { label: 'B', x: 33, y: 29, state: 'visited' },
  { label: 'C', x: 35, y: 58, state: 'queue' },
  { label: 'D', x: 35, y: 78, state: 'queue' },
  { label: 'E', x: 58, y: 28, state: 'active' },
  { label: 'F', x: 59, y: 49, state: 'idle' },
  { label: 'G', x: 59, y: 72, state: 'idle' },
  { label: 'H', x: 82, y: 52, state: 'target' },
];

const edges = [[0,1], [0,2], [0,3], [1,4], [1,5], [2,4], [2,6], [3,6], [4,7], [5,7], [6,7]];

export function StudioCanvas({ activeTool, activeStep }: { activeTool: string; activeStep: number }) {
  const [playing, setPlaying] = useState(true);
  const [tool, setTool] = useState('cursor');
  return (
    <main className="flex min-h-[420px] min-w-0 flex-col bg-[#F8F8F1] sm:min-h-[520px] xl:min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs"><span className="shrink-0 rounded-lg bg-[#E8F0FB] px-2 py-1 font-extrabold text-[#1E3F82]">Trạng thái</span><span className="truncate font-bold text-stone-700">Bước {activeStep + 2}/8 — Duyệt các đỉnh trong hàng đợi</span></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">Queue: B · C · D</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{activeTool}</span></div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'radial-gradient(#9DA9A0 0.7px, transparent 0.7px)', backgroundSize: '18px 18px' }} />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map(([from, to]) => <line key={`${from}-${to}`} x1={nodes[from].x} y1={nodes[from].y} x2={nodes[to].x} y2={nodes[to].y} stroke={from === 0 || (from === 1 && to === 4) ? '#34599B' : '#BCC5C4'} strokeWidth={from === 0 || (from === 1 && to === 4) ? 0.55 : 0.3} strokeDasharray={from > 1 ? '1.2 1.2' : undefined} />)}
        </svg>
        {nodes.map((node) => (
          <div key={node.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${node.x}%`, top: `${node.y}%` }}>
            {node.state === 'active' && <span className="absolute -inset-3 animate-pulse rounded-full border border-amber-400/70" />}
            <span className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-extrabold shadow-sm sm:h-11 sm:w-11 sm:text-sm ${node.state === 'visited' ? 'border-[#1E3F82] bg-[#31599E] text-white' : node.state === 'queue' ? 'border-[#31599E] bg-[#AFC7EE] text-[#0F2258]' : node.state === 'active' ? 'border-amber-400 bg-amber-100 text-amber-800' : node.state === 'target' ? 'border-dashed border-stone-400 bg-white/50 text-stone-400' : 'border-stone-300 bg-white text-stone-600'}`}>{node.label}</span>
            {node.state === 'active' && <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-[#1E3F82] px-1.5 py-0.5 text-[8px] font-bold text-white">Đang xét</span>}
          </div>
        ))}

        <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg shadow-stone-300/40">
          {[{ id: 'cursor', icon: CursorFill, label: 'Chọn' }, { id: 'pencil', icon: Pencil, label: 'Vẽ' }, { id: 'eraser', icon: Eraser, label: 'Xóa' }, { id: 'share', icon: Share, label: 'Chia sẻ' }].map((item) => {
            const Icon = item.icon;
            return <button type="button" key={item.id} title={item.label} onClick={() => setTool(item.id)} className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${tool === item.id ? 'bg-[#1E3F82] text-white' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700'}`}><Icon className="h-3.5 w-3.5" /></button>;
          })}
          <span className="mx-0.5 h-5 border-l border-stone-200" />
          <button type="button" title="Thêm" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"><Plus className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-stone-200 bg-white px-4 py-3">
        <button type="button" onClick={() => setPlaying((value) => !value)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1E3F82] text-white hover:bg-[#163070]"><PlayFill className={`h-4 w-4 ${playing ? 'opacity-60' : ''}`} /></button>
        <span className="text-[10px] font-bold text-stone-400">18:24</span>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100"><div className="h-full w-[58%] rounded-full bg-[#34599B]" /><span className="absolute left-[58%] top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-rose-500 shadow" /></div>
        <span className="text-[10px] text-stone-400">45:00</span>
        <button type="button" className="hidden items-center gap-1.5 rounded-lg bg-[#E8F0FB] px-3 py-2 text-[10px] font-bold text-[#1E3F82] hover:bg-[#D5E4F7] sm:flex">Bước tiếp <ArrowRight className="h-3 w-3" /></button>
      </div>
    </main>
  );
}

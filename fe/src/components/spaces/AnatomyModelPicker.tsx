'use client';

import { useState } from 'react';
import { Badge3dFill, PlusCircleFill, Search, X } from 'react-bootstrap-icons';
import { modelTitle, useAnatomyModels, type AnatomyModelSummary } from '@/lib/anatomy-catalog';

export function AnatomyModelPicker({ sectionTitle, onClose, onChoose }: { sectionTitle: string; onClose: () => void; onChoose: (model: AnatomyModelSummary) => void }) {
  const { models, state } = useAnatomyModels();
  const [search, setSearch] = useState('');
  const normalized = search.trim().toLowerCase();
  const filtered = normalized ? models.filter((item) => `${item.title} ${item.title_vi}`.toLowerCase().includes(normalized)) : models;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Chọn mô hình Giải phẫu 3D">
    <div className="flex max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#397BF6]">Kho Giải phẫu 3D</p><h2 className="mt-1 text-lg font-extrabold text-stone-900">Thêm mô hình vào “{sectionTitle}”</h2></div><button type="button" aria-label="Đóng" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100"><X /></button></div>
      <div className="border-b border-stone-100 p-4"><div className="flex items-center gap-3"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-[#FBFCFF] px-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100"><Search className="h-3.5 w-3.5 shrink-0 text-stone-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tim, não, hệ xương..." className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none" /></label>{state === 'ready' && <span className="hidden shrink-0 text-[11px] font-semibold text-stone-400 sm:block">{filtered.length} mô hình</span>}</div></div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-5">
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {state === 'loading' && <p className="col-span-full py-12 text-center text-xs text-stone-400">Đang tải thư viện mô hình...</p>}
          {state === 'error' && <p className="col-span-full py-12 text-center text-xs text-rose-500">Không thể tải thư viện Giải phẫu.</p>}
          {state === 'ready' && filtered.map((model) => <button type="button" key={model.sketchfab_uid} onClick={() => onChoose(model)} title={`Thêm ${modelTitle(model)}`} className="group flex min-h-[210px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#5B8FD8] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
            <div className="aspect-[4/3] w-full shrink-0 bg-[#E8F0FB] bg-contain bg-center bg-no-repeat transition group-hover:bg-[#DFEAFB]" style={model.thumbnail_url ? { backgroundImage: `url(${model.thumbnail_url})` } : undefined}>{!model.thumbnail_url && <div className="flex h-full items-center justify-center"><Badge3dFill className="h-10 w-10 text-[#5B8FD8]" /></div>}</div>
            <div className="flex min-h-[72px] flex-1 items-center gap-3 border-t border-stone-100 px-3 py-2.5"><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-extrabold leading-4 text-stone-800">{modelTitle(model)}</p><p className="mt-1 truncate text-[10px] text-stone-400">{model.system || 'Chưa phân hệ'} · {model.annotation_count} bộ phận</p></div><PlusCircleFill className="h-5 w-5 shrink-0 text-blue-500 opacity-70 transition group-hover:scale-110 group-hover:opacity-100" aria-hidden="true" /></div>
          </button>)}
          {state === 'ready' && filtered.length === 0 && <p className="col-span-full py-12 text-center text-xs text-stone-400">Không tìm thấy mô hình phù hợp.</p>}
        </div>
      </div>
    </div>
  </div>;
}

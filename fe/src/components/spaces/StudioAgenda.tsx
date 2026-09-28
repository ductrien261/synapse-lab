'use client';

import { Check2, FileEarmarkText, GripVertical, PlusLg } from 'react-bootstrap-icons';

const steps = [
  { title: 'Khởi động & mục tiêu', meta: '08:12 · Hoàn tất', done: true },
  { title: 'Breadth-First Search', meta: '11:45 · Hoàn tất', done: true },
  { title: 'Mô phỏng thuật toán', meta: 'Đang hoạt động', live: true },
  { title: 'Bài tập trực tiếp', meta: 'Kế tiếp · 10 phút' },
  { title: 'Tổng kết & Q&A', meta: 'Cuối buổi · 8 phút' },
];

export function StudioAgenda({ activeStep, onSelect }: { activeStep: number; onSelect: (index: number) => void }) {
  return (
    <aside className="hidden min-h-0 flex-col border-r border-stone-200 bg-[#FBFCFF] xl:flex">
      <div className="border-b border-stone-200 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-stone-400">Tiến trình phiên</p>
        <div className="mt-2 flex items-end justify-between"><span className="text-sm font-extrabold text-stone-900">Buổi ôn tập #04</span><span className="text-[10px] font-bold text-[#1E3F82]">58%</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200"><div className="h-full w-[58%] rounded-full bg-[#1E3F82]" /></div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {steps.map((step, index) => {
          const active = index === activeStep;
          return (
            <button type="button" key={step.title} onClick={() => onSelect(index)} className={`group flex w-full items-start gap-2 rounded-xl border p-2.5 text-left transition-all ${active ? 'border-[#5B8FD8] bg-[#E8F0FB] shadow-sm' : 'border-transparent bg-white hover:border-stone-200'}`}>
              <GripVertical className="mt-1 h-3 w-3 shrink-0 text-stone-300 opacity-0 transition-opacity group-hover:opacity-100" />
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold ${step.done ? 'bg-emerald-50 text-emerald-600' : active ? 'bg-[#1E3F82] text-white' : 'bg-stone-100 text-stone-400'}`}>{step.done ? <Check2 className="h-3 w-3" /> : index + 1}</span>
              <span className="min-w-0">
                <span className={`block text-xs font-bold leading-snug ${active ? 'text-[#1E3F82]' : 'text-stone-700'}`}>{step.title}</span>
                <span className={`mt-0.5 block text-[10px] ${step.live ? 'font-bold text-rose-500' : 'text-stone-400'}`}>{step.meta}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="space-y-2 border-t border-stone-200 p-3">
        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#5B8FD8]/50 bg-white py-2.5 text-[11px] font-bold text-[#1E3F82] hover:bg-[#F4F7FC]"><PlusLg className="h-3 w-3" /> Thêm hoạt động</button>
        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F4F7FC] py-2.5 text-[11px] font-bold text-stone-600 hover:bg-[#E8F0FB]"><FileEarmarkText className="h-3 w-3" /> Tài liệu phòng (4)</button>
      </div>
    </aside>
  );
}

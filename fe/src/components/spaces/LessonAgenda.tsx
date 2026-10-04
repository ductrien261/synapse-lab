'use client';

import { ArrowDown, ArrowUp, Clock, FileEarmarkText, LightningChargeFill, PlusLg } from 'react-bootstrap-icons';
import { activityTypeLabels, type LessonStep } from './lesson-plan';

interface LessonAgendaProps {
  steps: LessonStep[];
  activeStepId: string;
  onSelect: (stepId: string) => void;
  onAdd: () => void;
  onMove: (stepId: string, direction: -1 | 1) => void;
}

export function LessonAgenda({ steps, activeStepId, onSelect, onAdd, onMove }: LessonAgendaProps) {
  const totalMinutes = steps.reduce((total, item) => total + item.durationMinutes, 0);
  return (
    <aside className="flex min-h-0 flex-col border-b border-stone-200 bg-[#FBFCFF] xl:border-b-0 xl:border-r">
      <div className="border-b border-stone-200 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-stone-400">Kịch bản bài dạy</p>
        <div className="mt-2 flex items-center justify-between gap-3"><span className="text-sm font-extrabold text-stone-900">{steps.length} hoạt động</span><span className="flex items-center gap-1 text-[10px] font-bold text-[#1E3F82]"><Clock className="h-3 w-3" />{totalMinutes} phút</span></div>
        <p className="mt-1 text-[10px] leading-relaxed text-stone-400">Thứ tự này sẽ được dùng để điều phối khi buổi học bắt đầu.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto p-3 xl:flex-1 xl:flex-col xl:overflow-y-auto">
        {steps.map((item, index) => {
          const active = item.id === activeStepId;
          return (
            <div key={item.id} className={`group flex min-w-[245px] items-start gap-2 rounded-xl border p-2.5 transition-all xl:min-w-0 ${active ? 'border-[#5B8FD8] bg-[#E8F0FB] shadow-sm' : 'border-stone-100 bg-white hover:border-stone-200'}`}>
              <button type="button" onClick={() => onSelect(item.id)} className="flex min-w-0 flex-1 items-start gap-2 text-left">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold ${active ? 'bg-[#1E3F82] text-white' : 'bg-stone-100 text-stone-500'}`}>{index + 1}</span>
                <span className="min-w-0"><span className={`block truncate text-xs font-bold ${active ? 'text-[#1E3F82]' : 'text-stone-700'}`}>{item.title || 'Hoạt động chưa đặt tên'}</span><span className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold text-stone-400"><span>{activityTypeLabels[item.type]}</span><span>•</span><span>{item.durationMinutes} phút</span>{item.materials.length > 0 && <span className="rounded bg-white px-1 text-[#5B8FD8]">{item.materials.length} file</span>}{item.quiz.enabled && <span className="flex items-center gap-0.5 rounded bg-lime-100 px-1 text-lime-700"><LightningChargeFill className="h-2 w-2" />Quiz</span>}</span></span>
              </button>
              <span className="hidden shrink-0 flex-col gap-0.5 group-hover:flex xl:flex">
                <button type="button" disabled={index === 0} aria-label="Đưa hoạt động lên" onClick={() => onMove(item.id, -1)} className="rounded p-1 text-stone-400 hover:bg-white hover:text-[#1E3F82] disabled:opacity-20"><ArrowUp className="h-2.5 w-2.5" /></button>
                <button type="button" disabled={index === steps.length - 1} aria-label="Đưa hoạt động xuống" onClick={() => onMove(item.id, 1)} className="rounded p-1 text-stone-400 hover:bg-white hover:text-[#1E3F82] disabled:opacity-20"><ArrowDown className="h-2.5 w-2.5" /></button>
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-stone-200 p-3 xl:grid-cols-1">
        <button type="button" onClick={onAdd} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#5B8FD8]/50 bg-white py-2.5 text-[11px] font-bold text-[#1E3F82] hover:bg-[#F4F7FC]"><PlusLg className="h-3 w-3" /> Thêm hoạt động</button>
        <button type="button" className="flex items-center justify-center gap-2 rounded-xl bg-[#F4F7FC] py-2.5 text-[11px] font-bold text-stone-600 hover:bg-[#E8F0FB]"><FileEarmarkText className="h-3 w-3" /> Kho tài liệu</button>
      </div>
    </aside>
  );
}

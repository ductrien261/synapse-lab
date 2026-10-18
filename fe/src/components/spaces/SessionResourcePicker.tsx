'use client';

import { useMemo, useState } from 'react';
import { BoxSeam, Check2, FileEarmarkText, LightningChargeFill, PlayFill, X } from 'react-bootstrap-icons';
import type { LessonPlanDto, LessonResourceDto } from './lesson-plan-api';

const kindMeta: Record<LessonResourceDto['kind'], { label: string; tone: string }> = {
  slide: { label: 'SLIDE', tone: 'bg-blue-100 text-blue-700' },
  pdf: { label: 'PDF', tone: 'bg-rose-100 text-rose-700' },
  doc: { label: 'DOC', tone: 'bg-sky-100 text-sky-700' },
  model_3d: { label: '3D', tone: 'bg-violet-100 text-violet-700' },
  quiz: { label: 'QUIZ', tone: 'bg-fuchsia-100 text-fuchsia-700' },
  video: { label: 'VIDEO', tone: 'bg-red-100 text-red-700' },
  link: { label: 'LINK', tone: 'bg-amber-100 text-amber-700' },
};

export function SessionResourcePicker({ plan, pending, onClose, onStart }: {
  plan: LessonPlanDto | null;
  pending: boolean;
  onClose: () => void;
  onStart: (resourceIds?: string[]) => void;
}) {
  const resources = useMemo(() => plan?.sections.flatMap((section) => section.resources) || [], [plan]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(resources.map((resource) => resource.id)));
  const allSelected = resources.length > 0 && selected.size === resources.length;
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSection = (sectionResources: LessonResourceDto[]) => setSelected((current) => {
    const next = new Set(current);
    const shouldSelect = sectionResources.some((resource) => !next.has(resource.id));
    sectionResources.forEach((resource) => shouldSelect ? next.add(resource.id) : next.delete(resource.id));
    return next;
  });

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="session-resource-title" className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
        <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-emerald-600">Chuẩn bị buổi học</p><h2 id="session-resource-title" className="mt-1 text-lg font-extrabold text-stone-900">Chọn nội dung sẽ dạy</h2><p className="mt-1 text-xs leading-5 text-stone-500">Chỉ những nội dung được chọn mới xuất hiện trong phòng học và được kích hoạt tự động.</p></div>
        <button type="button" onClick={onClose} disabled={pending} aria-label="Đóng" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-40"><X /></button>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-[#FBFCFE] px-5 py-3">
        <span className="text-xs font-bold text-stone-600">Đã chọn <strong className="text-[#1E3F82]">{selected.size}/{resources.length}</strong> nội dung</span>
        {resources.length > 0 && <button type="button" onClick={() => setSelected(allSelected ? new Set() : new Set(resources.map((resource) => resource.id)))} className="text-[10px] font-bold text-[#397BF6] hover:underline">{allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {!plan ? <div className="py-12 text-center text-sm text-stone-500">Đang tải kế hoạch bài dạy…</div> : resources.length === 0 ? <div className="flex flex-col items-center py-12 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400"><FileEarmarkText /></span><h3 className="mt-3 text-sm font-extrabold text-stone-800">Chưa có nội dung</h3><p className="mt-1 text-xs text-stone-500">Bạn vẫn có thể bắt đầu và tải tài liệu trực tiếp trong phòng học.</p></div> : <div className="space-y-4">
          {plan.sections.map((section) => {
            if (section.resources.length === 0) return null;
            const sectionSelected = section.resources.filter((resource) => selected.has(resource.id)).length;
            return <section key={section.id} className="overflow-hidden rounded-2xl border border-stone-200">
              <button type="button" onClick={() => toggleSection(section.resources)} className="flex w-full items-center gap-3 bg-stone-50 px-4 py-3 text-left hover:bg-stone-100"><span className={`flex h-5 w-5 items-center justify-center rounded-md border ${sectionSelected === section.resources.length ? 'border-[#397BF6] bg-[#397BF6] text-white' : sectionSelected > 0 ? 'border-blue-300 bg-blue-50 text-[#397BF6]' : 'border-stone-300 bg-white text-transparent'}`}><Check2 size={13} /></span><span className="min-w-0 flex-1 truncate text-xs font-extrabold text-stone-800">{section.title}</span><span className="text-[9px] font-bold text-stone-400">{sectionSelected}/{section.resources.length}</span></button>
              <div className="divide-y divide-stone-100">
                {section.resources.map((resource) => {
                  const checked = selected.has(resource.id);
                  const meta = kindMeta[resource.kind];
                  return <label key={resource.id} className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${checked ? 'bg-blue-50/45' : 'bg-white hover:bg-stone-50'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(resource.id)} className="h-4 w-4 shrink-0 accent-[#397BF6]" />
                    <span className={`flex h-8 w-10 shrink-0 items-center justify-center rounded-lg text-[8px] font-extrabold ${meta.tone}`}>{resource.kind === 'quiz' ? <LightningChargeFill size={12} /> : resource.kind === 'model_3d' ? <BoxSeam size={13} /> : meta.label}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-stone-800">{resource.title}</span><span className="mt-0.5 block text-[9px] font-semibold text-stone-400">{meta.label}{resource.kind === 'quiz' && resource.quiz ? ` · ${resource.quiz.duration_seconds} giây` : ''}</span></span>
                  </label>;
                })}
              </div>
            </section>;
          })}
        </div>}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-white px-5 py-4">
        <p className="text-[9px] leading-4 text-stone-400">Bạn có thể tải thêm tài liệu sau khi vào phòng.</p>
        <div className="flex gap-2"><button type="button" onClick={onClose} disabled={pending} className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-40">Hủy</button><button type="button" disabled={pending || !plan || (resources.length > 0 && selected.size === 0)} onClick={() => onStart(resources.length > 0 ? Array.from(selected) : undefined)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><PlayFill />{pending ? 'Đang bắt đầu…' : `Bắt đầu với ${selected.size} nội dung`}</button></div>
      </footer>
    </section>
  </div>;
}

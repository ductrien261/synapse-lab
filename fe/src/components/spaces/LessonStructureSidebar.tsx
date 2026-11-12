'use client';

import { ChevronDown, Folder2Open, LightningChargeFill, PlusLg, Search } from 'react-bootstrap-icons';
import type { LessonStep } from './lesson-plan';
import { getResourceTitle, type StudioResource } from './studio-resource';

const labels = { slide: 'SL', pdf: 'PDF', doc: 'DOC', model_3d: '3D', video: 'VID', link: 'URL', quiz: '?' };

export function LessonStructureSidebar({ steps, resources, selectedKey, onSelect, onAddFiles, onAddActivity }: { steps: LessonStep[]; resources: StudioResource[]; selectedKey: string; onSelect: (key: string) => void; onAddFiles: (files: FileList | null) => void; onAddActivity: () => void }) {
  return <aside className="flex min-h-0 flex-col border-b border-stone-200 bg-white text-stone-800 xl:border-b-0 xl:border-r">
    <div className="flex items-center justify-between border-b border-stone-200 px-4 py-4"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#397BF6]">Nội dung bài học</p><p className="mt-1 text-[10px] text-stone-400">{resources.length} tài liệu & hoạt động</p></div><div className="flex gap-1"><button type="button" aria-label="Tìm kiếm" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-[#31599E]"><Search className="h-3.5 w-3.5" /></button><label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-[#4C86F7] text-white hover:bg-[#3D73DF]"><PlusLg className="h-3.5 w-3.5" /><input type="file" multiple accept=".pptx,.pdf,.docx" onChange={(event) => { onAddFiles(event.target.files); event.target.value = ''; }} className="sr-only" /></label></div></div>
    <div className="flex gap-3 overflow-x-auto p-3 xl:flex-1 xl:flex-col xl:gap-1 xl:overflow-y-auto">
      <div className="hidden items-center gap-2 px-1 py-2 text-[11px] font-extrabold xl:flex"><ChevronDown className="h-3 w-3 text-stone-400" /><Folder2Open className="h-4 w-4 text-stone-500" />Bài học<span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[8px] text-stone-500">{resources.length}</span></div>
      {steps.map((step, stepIndex) => {
        const children = resources.filter((item) => item.stepId === step.id);
        return <section key={step.id} className="min-w-[250px] xl:min-w-0">
          <div className="flex items-center gap-2 px-1 py-2 text-[10px] font-extrabold text-stone-700"><ChevronDown className="h-3 w-3 text-stone-400" /><Folder2Open className="h-3.5 w-3.5 text-[#397BF6]" /><span className="min-w-0 flex-1 truncate">Phần {stepIndex + 1}: {step.title}</span><span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[8px] text-stone-500">{children.length}</span></div>
          <div className="ml-2 space-y-1 border-l border-stone-200 pl-3">
            {children.map((resource, index) => {
              const active = resource.key === selectedKey;
              return <button type="button" key={resource.key} onClick={() => onSelect(resource.key)} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${active ? 'bg-[#E8F0FB] text-[#1E3F82] shadow-sm' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[7px] font-extrabold text-white ${resource.kind === 'quiz' ? 'bg-violet-400' : resource.kind === 'pdf' ? 'bg-rose-400' : resource.kind === 'doc' ? 'bg-sky-500' : 'bg-blue-500'}`}>{resource.kind === 'quiz' ? <LightningChargeFill className="h-3 w-3" /> : labels[resource.kind]}</span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold">{index + 1}. {getResourceTitle(resource)}</span>{resource.kind === 'quiz' && <span className="text-[8px] text-violet-500">Quiz có trigger</span>}</span></button>;
            })}
            {children.length === 0 && <p className="px-2 py-2 text-[9px] italic text-stone-400">Chưa có tài liệu</p>}
          </div>
        </section>;
      })}
    </div>
    <div className="border-t border-stone-200 p-3"><button type="button" onClick={onAddActivity} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#397BF6] py-3 text-[10px] font-extrabold text-white hover:bg-[#2E6DE0]"><PlusLg className="h-3 w-3" />Thêm hoạt động</button></div>
  </aside>;
}

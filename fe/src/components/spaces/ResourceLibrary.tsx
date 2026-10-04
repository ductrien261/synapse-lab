'use client';

import { FileEarmarkText, LightningChargeFill, PlusLg } from 'react-bootstrap-icons';
import { getResourceTitle, type StudioResource } from './studio-resource';

const kindLabel = { slide: 'SLIDE', pdf: 'PDF', doc: 'DOC', model_3d: '3D', video: 'VIDEO', link: 'LINK', quiz: 'QUIZ' };

export function ResourceLibrary({ resources, selectedKey, onSelect, onAddFiles }: { resources: StudioResource[]; selectedKey: string; onSelect: (key: string) => void; onAddFiles: (files: FileList | null) => void }) {
  return <aside className="flex min-h-0 flex-col border-b border-stone-200 bg-[#111827] text-white xl:border-b-0 xl:border-r xl:border-stone-800">
    <div className="border-b border-white/10 p-4"><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-blue-300">Thư viện lớp học</p><div className="mt-2 flex items-center justify-between"><h2 className="text-sm font-extrabold">Tài liệu đã có</h2><span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold text-stone-300">{resources.length} mục</span></div></div>
    <div className="flex gap-2 overflow-x-auto p-3 xl:flex-1 xl:flex-col xl:overflow-y-auto">
      {resources.map((resource, index) => {
        const active = resource.key === selectedKey;
        return <button type="button" key={resource.key} onClick={() => onSelect(resource.key)} className={`flex min-w-[230px] items-start gap-3 rounded-xl p-3 text-left transition xl:min-w-0 ${active ? 'bg-[#31599E] shadow-lg shadow-black/10' : 'bg-white/5 hover:bg-white/10'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[8px] font-extrabold ${resource.kind === 'quiz' ? 'bg-lime-300 text-lime-950' : resource.kind === 'pdf' ? 'bg-rose-200 text-rose-800' : 'bg-blue-100 text-blue-800'}`}>{kindLabel[resource.kind]}</span><span className="min-w-0 flex-1"><span className="block text-[9px] font-bold text-white/45">{String(index + 1).padStart(2, '0')} · {resource.stepTitle}</span><span className="mt-1 block truncate text-[11px] font-bold text-white">{getResourceTitle(resource)}</span>{resource.kind === 'quiz' && <span className="mt-1 flex items-center gap-1 text-[8px] font-bold text-lime-200"><LightningChargeFill className="h-2.5 w-2.5" /> Có lịch kích hoạt</span>}</span></button>;
      })}
      {resources.length === 0 && <div className="rounded-xl border border-dashed border-white/20 p-5 text-center text-[10px] leading-relaxed text-stone-400"><FileEarmarkText className="mx-auto mb-2 h-5 w-5" />Lớp học chưa có tài liệu.</div>}
    </div>
    <div className="border-t border-white/10 p-3"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#4C86F7] py-3 text-[10px] font-extrabold text-white hover:bg-[#3D73DF]"><PlusLg className="h-3 w-3" />Thêm tài liệu<input type="file" multiple accept=".ppt,.pptx,.pdf,.doc,.docx" onChange={(event) => { onAddFiles(event.target.files); event.target.value = ''; }} className="sr-only" /></label></div>
  </aside>;
}

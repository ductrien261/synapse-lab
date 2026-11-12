'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Badge3dFill, ChevronDown, ChevronRight, Folder2Open, GripVertical, LightningChargeFill, PlusLg, Search, Trash } from 'react-bootstrap-icons';
import type { LessonStep } from './lesson-plan';
import { getResourceTitle, type StudioResource } from './studio-resource';

interface EditableLessonTreeProps {
  steps: LessonStep[];
  resources: StudioResource[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onAddFiles: (files: FileList | null, stepId?: string) => void;
  onAddQuiz: (stepId: string) => void;
  onAddModel: (stepId: string) => void;
  onAddActivity: () => void;
  onMoveActivity: (stepId: string, direction: -1 | 1) => void;
  onDeleteActivity: (stepId: string) => void;
  onMoveResource: (resourceKey: string, direction: -1 | 1) => void;
  onDeleteResource: (resourceKey: string) => void;
}

const labels = { slide: 'SL', pdf: 'PDF', doc: 'DOC', model_3d: '3D', video: 'VID', link: 'URL', quiz: '?' };
const actionClass = 'flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-[#31599E] [&>svg]:h-3.5 [&>svg]:w-3.5';
const miniActionClass = 'flex h-6 w-6 items-center justify-center rounded text-stone-400 hover:bg-white hover:text-[#31599E] disabled:opacity-20 [&>svg]:h-2.5 [&>svg]:w-2.5';

export function EditableLessonTree(props: EditableLessonTreeProps) {
  const [rootExpanded, setRootExpanded] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isExpanded = (stepId: string) => expanded[stepId] !== false;
  const toggleStep = (stepId: string) => setExpanded((current) => ({ ...current, [stepId]: !isExpanded(stepId) }));

  return <aside className="flex min-h-0 flex-col border-b border-stone-200 bg-white text-stone-800 xl:border-b-0 xl:border-r">
    <div className="flex items-center justify-between border-b border-stone-200 px-4 py-4"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#397BF6]">Nội dung bài học</p><p className="mt-1 text-[10px] text-stone-400">{props.resources.length} tài liệu & hoạt động</p></div><div className="flex gap-1"><button type="button" aria-label="Tìm kiếm" className={actionClass}><Search /></button><label className={`${actionClass} cursor-pointer bg-[#397BF6] text-white hover:bg-[#2E6DE0] hover:text-white`}><PlusLg /><input type="file" multiple accept=".pptx,.pdf,.docx" onChange={(event) => { props.onAddFiles(event.target.files); event.target.value = ''; }} className="sr-only" /></label></div></div>
    <div className="flex gap-3 overflow-x-auto p-3 xl:flex-1 xl:flex-col xl:gap-1 xl:overflow-y-auto">
      <button type="button" onClick={() => setRootExpanded((value) => !value)} className="hidden w-full items-center gap-2 rounded-lg px-1 py-2 text-left text-[11px] font-extrabold hover:bg-stone-50 xl:flex">{rootExpanded ? <ChevronDown /> : <ChevronRight />}<Folder2Open className="h-4 w-4 text-stone-500" />Bài học<span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[8px] text-stone-500">{props.resources.length}</span></button>
      {rootExpanded && props.steps.map((step, stepIndex) => {
        const children = props.resources.filter((item) => item.stepId === step.id);
        const open = isExpanded(step.id);
        return <section key={step.id} className="group/section min-w-[270px] rounded-xl border border-transparent hover:border-stone-100 xl:min-w-0">
          <div className="flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-stone-50">
            <button type="button" onClick={() => toggleStep(step.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-[10px] font-extrabold text-stone-700">{open ? <ChevronDown className="h-3 w-3 text-stone-400" /> : <ChevronRight className="h-3 w-3 text-stone-400" />}<Folder2Open className="h-3.5 w-3.5 shrink-0 text-[#397BF6]" /><span className="truncate">Phần {stepIndex + 1}: {step.title}</span><span className="ml-auto rounded-full bg-stone-100 px-1.5 py-0.5 text-[8px] text-stone-500">{children.length}</span></button>
            <span className="flex items-center gap-0.5 opacity-100 transition-opacity xl:opacity-0 xl:group-hover/section:opacity-100 xl:focus-within:opacity-100">
              <label title="Thêm tài liệu" className={`${miniActionClass} cursor-pointer text-[#397BF6]`}><PlusLg /><input type="file" multiple accept=".pptx,.pdf,.docx" onChange={(event) => { props.onAddFiles(event.target.files, step.id); event.target.value = ''; }} className="sr-only" /></label>
              <button type="button" title="Thêm quiz" onClick={() => props.onAddQuiz(step.id)} className={`${miniActionClass} text-violet-500`}><LightningChargeFill /></button>
              <button type="button" title="Thêm mô hình 3D" onClick={() => props.onAddModel(step.id)} className={`${miniActionClass} text-emerald-600`}><Badge3dFill /></button>
              <button type="button" title="Đưa phần lên" disabled={stepIndex === 0} onClick={() => props.onMoveActivity(step.id, -1)} className={miniActionClass}><ArrowUp /></button>
              <button type="button" title="Đưa phần xuống" disabled={stepIndex === props.steps.length - 1} onClick={() => props.onMoveActivity(step.id, 1)} className={miniActionClass}><ArrowDown /></button>
              <button type="button" title="Xóa phần" disabled={props.steps.length <= 1} onClick={() => { if (window.confirm(`Xóa “${step.title}” cùng toàn bộ tài liệu bên trong?`)) props.onDeleteActivity(step.id); }} className={`${miniActionClass} hover:text-rose-600`}><Trash /></button>
            </span>
          </div>
          {open && <div className="ml-3 space-y-1 border-l border-stone-200 pb-1 pl-3">
            {children.map((resource, index) => {
              const active = resource.key === props.selectedKey;
              const movable = resource.kind !== 'quiz';
              const materialIndex = movable ? children.filter((item) => item.kind !== 'quiz').findIndex((item) => item.key === resource.key) : -1;
              const materialCount = children.filter((item) => item.kind !== 'quiz').length;
              return <div key={resource.key} className={`group/item flex items-center rounded-lg transition ${active ? 'bg-[#E8F0FB] text-[#1E3F82] shadow-sm' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}>
                <GripVertical className="ml-1 h-3 w-3 shrink-0 text-stone-300" />
                <button type="button" onClick={() => props.onSelect(resource.key)} className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-2 text-left"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[7px] font-extrabold text-white ${resource.kind === 'quiz' ? 'bg-violet-400' : resource.kind === 'pdf' ? 'bg-rose-400' : resource.kind === 'doc' ? 'bg-sky-500' : 'bg-blue-500'}`}>{resource.kind === 'quiz' ? <LightningChargeFill className="h-3 w-3" /> : labels[resource.kind]}</span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold">{index + 1}. {getResourceTitle(resource)}</span>{resource.kind === 'quiz' && <span className="text-[8px] text-violet-500">Quiz có trigger</span>}</span></button>
                <span className="mr-1 flex items-center gap-0.5 opacity-100 transition-opacity xl:opacity-0 xl:group-hover/item:opacity-100 xl:focus-within:opacity-100">{movable && <><button type="button" title="Đưa lên" disabled={materialIndex === 0} onClick={() => props.onMoveResource(resource.key, -1)} className={miniActionClass}><ArrowUp /></button><button type="button" title="Đưa xuống" disabled={materialIndex === materialCount - 1} onClick={() => props.onMoveResource(resource.key, 1)} className={miniActionClass}><ArrowDown /></button></>}<button type="button" title="Xóa" onClick={() => { if (window.confirm(`Xóa “${getResourceTitle(resource)}”?`)) props.onDeleteResource(resource.key); }} className={`${miniActionClass} hover:text-rose-600`}><Trash /></button></span>
              </div>;
            })}
            {children.length === 0 && <p className="px-2 py-2 text-[9px] italic text-stone-400">Chưa có tài liệu</p>}
          </div>}
        </section>;
      })}
    </div>
    <div className="border-t border-stone-200 p-3"><button type="button" onClick={props.onAddActivity} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#397BF6] py-3 text-[10px] font-extrabold text-white hover:bg-[#2E6DE0]"><PlusLg className="h-3 w-3" />Thêm hoạt động</button></div>
  </aside>;
}

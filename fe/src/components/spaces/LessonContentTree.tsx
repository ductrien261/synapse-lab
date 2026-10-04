'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, Badge3dFill, BoxSeam, ChevronDown, ChevronRight,
  FileEarmarkPdfFill, FileEarmarkSlidesFill, FileEarmarkWordFill, Folder2,
  Folder2Open, GripVertical, LightningChargeFill, Link45deg, Pencil,
  PlayCircleFill, PlusLg, Search, ThreeDotsVertical, Trash,
} from 'react-bootstrap-icons';
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
  onDeleteResource: (resourceKey: string) => void;
  onRenameActivity: (stepId: string, title: string) => void;
  onRenameResource: (resourceKey: string, title: string) => void;
  onReorderActivity: (sourceStepId: string, targetStepId: string) => void;
  onReorderResource: (sourceKey: string, targetStepId: string, targetKey?: string) => void;
}

type DragItem = { type: 'activity' | 'resource'; id: string } | null;

const iconButtonClass = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-[#31599E] [&>svg]:h-3.5 [&>svg]:w-3.5';
const menuItemClass = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[10px] font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-900 [&>svg]:h-3.5 [&>svg]:w-3.5';

export function EditableLessonTree(props: EditableLessonTreeProps) {
  const [rootExpanded, setRootExpanded] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragItem>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('vi');
  const visibleResources = useMemo(() => normalizedQuery
    ? props.resources.filter((resource) => getResourceTitle(resource).toLocaleLowerCase('vi').includes(normalizedQuery))
    : props.resources, [normalizedQuery, props.resources]);
  const isExpanded = (stepId: string) => expanded[stepId] !== false;

  const renameActivity = (step: LessonStep) => {
    setOpenMenu(null);
    const title = window.prompt('Tên phần nội dung', step.title)?.trim();
    if (title && title !== step.title) props.onRenameActivity(step.id, title);
  };

  const renameResource = (resource: StudioResource) => {
    setOpenMenu(null);
    const currentTitle = getResourceTitle(resource);
    const title = window.prompt('Tên nội dung', currentTitle)?.trim();
    if (title && title !== currentTitle) props.onRenameResource(resource.key, title);
  };

  return <aside className="flex min-h-0 flex-col border-b border-stone-200 bg-white text-stone-800 xl:border-b-0 xl:border-r">
    <div className="border-b border-stone-200 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#397BF6]">Nội dung bài học</p><p className="mt-1 text-[10px] text-stone-400">{props.resources.length} nội dung</p></div>
        <div className="flex gap-1"><button type="button" aria-label="Tìm kiếm" onClick={() => { setSearching((value) => !value); setQuery(''); }} className={iconButtonClass}><Search /></button><button type="button" aria-label="Thêm hoạt động" onClick={props.onAddActivity} className={`${iconButtonClass} bg-[#397BF6] text-white hover:bg-[#2E6DE0] hover:text-white`}><PlusLg /></button></div>
      </div>
      {searching && <div className="mt-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3"><Search className="h-3 w-3 text-stone-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nội dung…" className="h-9 min-w-0 flex-1 bg-transparent text-[10px] outline-none placeholder:text-stone-400" /></div>}
    </div>

    <div className="flex gap-3 overflow-x-auto px-3 py-3 xl:flex-1 xl:flex-col xl:gap-0.5 xl:overflow-y-auto" onClick={() => openMenu && setOpenMenu(null)}>
      <button type="button" onClick={() => setRootExpanded((value) => !value)} className="hidden w-full items-center gap-2 rounded-lg px-1 py-2 text-left text-[11px] font-extrabold hover:bg-stone-50 xl:flex">{rootExpanded ? <ChevronDown className="h-3 w-3 text-stone-400" /> : <ChevronRight className="h-3 w-3 text-stone-400" />}<Folder2Open className="h-4 w-4 text-stone-500" />Bài học<span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[8px] text-stone-500">{props.resources.length}</span></button>

      {rootExpanded && props.steps.map((step, stepIndex) => {
        const allChildren = props.resources.filter((item) => item.stepId === step.id);
        const children = visibleResources.filter((item) => item.stepId === step.id);
        const open = isExpanded(step.id);
        const menuKey = `activity:${step.id}`;
        const folderDropKey = `folder:${step.id}`;
        return <section key={step.id} onDragOver={(event) => { if (dragItem) { event.preventDefault(); setDropTarget(dragItem.type === 'activity' ? menuKey : folderDropKey); } }} onDrop={(event) => { event.preventDefault(); if (dragItem?.type === 'activity' && dragItem.id !== step.id) props.onReorderActivity(dragItem.id, step.id); if (dragItem?.type === 'resource') props.onReorderResource(dragItem.id, step.id); setDragItem(null); setDropTarget(null); }} className={`group/section relative min-w-[270px] rounded-xl transition xl:min-w-0 ${dropTarget === menuKey || dropTarget === folderDropKey ? 'bg-blue-50 ring-1 ring-[#397BF6]/30' : ''}`}>
          <div className="group/header flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-stone-50">
            <span draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', `activity:${step.id}`); setDragItem({ type: 'activity', id: step.id }); }} onDragEnd={() => { setDragItem(null); setDropTarget(null); }} title="Kéo để sắp xếp phần" className="flex h-7 w-5 cursor-grab items-center justify-center text-stone-300 active:cursor-grabbing"><GripVertical className="h-3.5 w-3.5" /></span>
            <button type="button" onClick={() => setExpanded((current) => ({ ...current, [step.id]: !open }))} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-[10px] font-extrabold text-stone-700">{open ? <ChevronDown className="h-3 w-3 text-stone-400" /> : <ChevronRight className="h-3 w-3 text-stone-400" />}{open ? <Folder2Open className="h-3.5 w-3.5 shrink-0 text-[#397BF6]" /> : <Folder2 className="h-3.5 w-3.5 shrink-0 text-[#397BF6]" />}<span className="truncate">{step.title}</span><span className="ml-auto rounded-full bg-stone-100 px-1.5 py-0.5 text-[8px] text-stone-500">{allChildren.length}</span></button>
            <button type="button" aria-label={`Thao tác với ${step.title}`} onClick={(event) => { event.stopPropagation(); setOpenMenu((current) => current === menuKey ? null : menuKey); }} className={`${iconButtonClass} opacity-0 group-hover/header:opacity-100 focus:opacity-100 ${openMenu === menuKey ? 'opacity-100' : ''}`}><ThreeDotsVertical /></button>
          </div>

          {openMenu === menuKey && <div onClick={(event) => event.stopPropagation()} className="absolute right-1 top-10 z-40 w-52 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl">
            <button type="button" onClick={() => renameActivity(step)} className={menuItemClass}><Pencil />Chỉnh sửa tên phần</button>
            <label className={`${menuItemClass} cursor-pointer`}><FileEarmarkSlidesFill className="text-blue-500" />Thêm tài liệu<input type="file" multiple accept=".ppt,.pptx,.pdf,.doc,.docx" onChange={(event) => { props.onAddFiles(event.target.files, step.id); event.target.value = ''; setOpenMenu(null); }} className="sr-only" /></label>
            <button type="button" onClick={() => { props.onAddQuiz(step.id); setOpenMenu(null); }} className={menuItemClass}><LightningChargeFill className="text-violet-500" />Thêm quiz</button>
            <button type="button" onClick={() => { props.onAddModel(step.id); setOpenMenu(null); }} className={menuItemClass}><Badge3dFill className="text-cyan-600" />Thêm mô hình</button>
            <div className="my-1 border-t border-stone-100" />
            <button type="button" disabled={stepIndex === 0} onClick={() => { props.onMoveActivity(step.id, -1); setOpenMenu(null); }} className={`${menuItemClass} disabled:opacity-30`}><ArrowUp />Di chuyển lên</button>
            <button type="button" disabled={stepIndex === props.steps.length - 1} onClick={() => { props.onMoveActivity(step.id, 1); setOpenMenu(null); }} className={`${menuItemClass} disabled:opacity-30`}><ArrowDown />Di chuyển xuống</button>
            <button type="button" disabled={props.steps.length <= 1} onClick={() => { setOpenMenu(null); if (window.confirm(`Xóa “${step.title}” cùng toàn bộ nội dung bên trong?`)) props.onDeleteActivity(step.id); }} className={`${menuItemClass} text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30`}><Trash />Xóa phần</button>
          </div>}

          {open && <div className="ml-[18px] space-y-0.5 border-l border-stone-200 pb-2 pl-3">
            {children.map((resource) => {
              const active = resource.key === props.selectedKey;
              const resourceMenuKey = `resource:${resource.key}`;
              return <div key={resource.key} onDragOver={(event) => { if (dragItem?.type === 'resource') { event.preventDefault(); event.stopPropagation(); setDropTarget(resourceMenuKey); } }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (dragItem?.type === 'resource' && dragItem.id !== resource.key) props.onReorderResource(dragItem.id, step.id, resource.key); setDragItem(null); setDropTarget(null); }} className={`group/item relative flex items-center rounded-lg transition ${active ? 'bg-[#E8F0FB] text-[#1E3F82]' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'} ${dropTarget === resourceMenuKey ? 'ring-1 ring-[#397BF6]/40' : ''}`}>
                <span draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', `resource:${resource.key}`); setDragItem({ type: 'resource', id: resource.key }); }} onDragEnd={() => { setDragItem(null); setDropTarget(null); }} title="Kéo để sắp xếp hoặc chuyển phần" className="ml-0.5 flex h-8 w-4 cursor-grab items-center justify-center text-stone-300 active:cursor-grabbing"><GripVertical className="h-3 w-3" /></span>
                <button type="button" onClick={() => props.onSelect(resource.key)} className="flex min-w-0 flex-1 items-center gap-2 px-1 py-2 text-left"><ResourceIcon resource={resource} /><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold">{getResourceTitle(resource)}</span>{resource.kind === 'quiz' && <span className="block text-[8px] font-medium text-violet-500">Tương tác tự động</span>}</span></button>
                <button type="button" aria-label={`Thao tác với ${getResourceTitle(resource)}`} onClick={(event) => { event.stopPropagation(); setOpenMenu((current) => current === resourceMenuKey ? null : resourceMenuKey); }} className={`${iconButtonClass} mr-0.5 h-7 w-7 opacity-0 group-hover/item:opacity-100 focus:opacity-100 ${openMenu === resourceMenuKey ? 'opacity-100' : ''}`}><ThreeDotsVertical /></button>
                {openMenu === resourceMenuKey && <div onClick={(event) => event.stopPropagation()} className="absolute right-1 top-8 z-50 w-44 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl">
                  <button type="button" onClick={() => renameResource(resource)} className={menuItemClass}><Pencil />Chỉnh sửa tên</button>
                  <button type="button" onClick={() => { setOpenMenu(null); if (window.confirm(`Xóa “${getResourceTitle(resource)}”?`)) props.onDeleteResource(resource.key); }} className={`${menuItemClass} text-rose-600 hover:bg-rose-50 hover:text-rose-700`}><Trash />Xóa nội dung</button>
                </div>}
              </div>;
            })}
            {children.length === 0 && <p className="px-7 py-2 text-[9px] italic text-stone-400">{normalizedQuery ? 'Không có kết quả phù hợp' : 'Chưa có nội dung'}</p>}
          </div>}
        </section>;
      })}
    </div>
  </aside>;
}

function ResourceIcon({ resource }: { resource: StudioResource }) {
  const styles = { slide: 'bg-blue-50 text-blue-600', pdf: 'bg-rose-50 text-rose-500', doc: 'bg-sky-50 text-sky-600', model_3d: 'bg-indigo-50 text-indigo-600', video: 'bg-violet-50 text-violet-600', link: 'bg-emerald-50 text-emerald-600', quiz: 'bg-fuchsia-50 text-fuchsia-600' }[resource.kind];
  const icon = { slide: <FileEarmarkSlidesFill />, pdf: <FileEarmarkPdfFill />, doc: <FileEarmarkWordFill />, model_3d: <BoxSeam />, video: <PlayCircleFill />, link: <Link45deg />, quiz: <LightningChargeFill /> }[resource.kind];
  return <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${styles} [&>svg]:h-3.5 [&>svg]:w-3.5`}>{icon}</span>;
}

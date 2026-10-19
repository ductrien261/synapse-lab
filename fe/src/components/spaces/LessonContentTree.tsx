'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, Badge3dFill, BoxSeam, ChevronDown, ChevronRight,
  Check2,
  FileEarmarkPdfFill, FileEarmarkSlidesFill, FileEarmarkWordFill, Folder2,
  Folder2Open, GripVertical, LightningChargeFill, Link45deg, Pencil,
  PlayCircleFill, PlusLg, Search, ThreeDotsVertical, Trash, X,
} from 'react-bootstrap-icons';
import type { LessonStep } from './lesson-plan';
import { getResourceTitle, type StudioResource } from './studio-resource';

interface EditableLessonTreeProps {
  steps: LessonStep[];
  resources: StudioResource[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onAddFiles: (files: FileList | null, stepId?: string) => void;
  uploading: boolean;
  onAddQuiz: (stepId: string) => void;
  onAddModel: (stepId: string) => void;
  onAddActivity: (title?: string) => void;
  onMoveActivity: (stepId: string, direction: -1 | 1) => void;
  onDeleteActivity: (stepId: string) => void;
  onDeleteResource: (resourceKey: string) => void;
  onRenameActivity: (stepId: string, title: string) => void;
  onRenameResource: (resourceKey: string, title: string) => void;
  onReorderActivity: (sourceStepId: string, targetStepId: string) => void;
  onReorderResource: (sourceKey: string, targetStepId: string, targetKey?: string) => void;
}

type DragItem = { type: 'activity' | 'resource'; id: string } | null;
type EditItem = { type: 'activity' | 'resource'; id: string; value: string } | null;

const iconButtonClass = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-[#31599E] [&>svg]:h-3.5 [&>svg]:w-3.5';
const menuItemClass = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[10px] font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-900 [&>svg]:h-3.5 [&>svg]:w-3.5';

export function EditableLessonTree(props: EditableLessonTreeProps) {
  const [rootExpanded, setRootExpanded] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedResources, setExpandedResources] = useState<Record<string, boolean>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragItem>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [editItem, setEditItem] = useState<EditItem>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('vi');
  const visibleResources = useMemo(() => normalizedQuery
    ? props.resources.filter((resource) => getResourceTitle(resource).toLocaleLowerCase('vi').includes(normalizedQuery))
    : props.resources, [normalizedQuery, props.resources]);
  const isExpanded = (stepId: string) => expanded[stepId] !== false;
  const selectedStepId = props.resources.find((resource) => resource.key === props.selectedKey)?.stepId || props.steps[0]?.id;
  const selectedStep = props.steps.find((step) => step.id === selectedStepId);

  const renameActivity = (step: LessonStep) => {
    setOpenMenu(null);
    setEditItem({ type: 'activity', id: step.id, value: step.title });
  };

  const renameResource = (resource: StudioResource) => {
    setOpenMenu(null);
    const currentTitle = getResourceTitle(resource);
    setEditItem({ type: 'resource', id: resource.key, value: currentTitle });
  };

  const saveEdit = () => {
    if (!editItem) return;
    const title = editItem.value.trim();
    if (title) {
      if (editItem.type === 'activity') props.onRenameActivity(editItem.id, title);
      else props.onRenameResource(editItem.id, title);
    }
    setEditItem(null);
  };

  const createActivity = () => {
    const title = newActivityTitle.trim();
    if (!title) return;
    props.onAddActivity(title);
    setNewActivityTitle('');
    setOpenMenu(null);
  };

  return <aside className="flex min-h-0 flex-col border-b border-stone-200 bg-white text-stone-800 xl:border-b-0 xl:border-r">
    <div className="relative border-b border-stone-200 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#397BF6]">Nội dung bài học</p><p className="mt-1 text-[10px] text-stone-400">{props.resources.length} nội dung</p></div>
        <div className="flex gap-1"><button type="button" aria-label="Tìm kiếm" onClick={() => { setSearching((value) => !value); setQuery(''); }} className={iconButtonClass}><Search /></button><button type="button" aria-label="Thêm nội dung" aria-expanded={openMenu === 'root-add'} onClick={() => { setConfirmDelete(null); setOpenMenu((current) => current === 'root-add' ? null : 'root-add'); }} className={`${iconButtonClass} bg-[#397BF6] text-white hover:bg-[#2E6DE0] hover:text-white`}><PlusLg /></button></div>
      </div>
      {searching && <div className="mt-3 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3"><Search className="h-3 w-3 text-stone-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nội dung…" className="h-9 min-w-0 flex-1 bg-transparent text-[10px] outline-none placeholder:text-stone-400" /></div>}
      {openMenu === 'root-add' && <div onClick={(event) => event.stopPropagation()} className="absolute right-3 top-[58px] z-[60] w-64 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
        <p className="px-2 pb-1 pt-0.5 text-[9px] font-extrabold uppercase tracking-wide text-stone-400">Thêm nhanh</p>
        <div className="mb-1 flex items-center gap-1.5 rounded-lg bg-stone-50 p-1.5">
          <input autoFocus value={newActivityTitle} onChange={(event) => setNewActivityTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createActivity(); if (event.key === 'Escape') setOpenMenu(null); }} placeholder="Tên chủ đề mới…" className="h-8 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2.5 text-[10px] outline-none focus:border-[#397BF6]" />
          <button type="button" disabled={!newActivityTitle.trim()} onClick={createActivity} aria-label="Tạo chủ đề" className="flex h-8 w-8 items-center justify-center rounded-md bg-[#397BF6] text-white disabled:opacity-40"><Check2 /></button>
        </div>
        {selectedStepId && <>
          <p className="px-2 py-1 text-[9px] text-stone-400">Thêm vào <strong className="text-stone-600">{selectedStep?.title}</strong></p>
          <label className={`${menuItemClass} ${props.uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}><FileEarmarkSlidesFill className="text-blue-500" />{props.uploading ? 'Đang tải lên…' : 'Tải tài liệu lên'}<input type="file" multiple disabled={props.uploading} accept=".ppt,.pptx,.pdf,.doc,.docx" onChange={(event) => { props.onAddFiles(event.target.files, selectedStepId); event.target.value = ''; setOpenMenu(null); }} className="sr-only" /></label>
          <button type="button" onClick={() => { props.onAddQuiz(selectedStepId); setOpenMenu(null); }} className={menuItemClass}><LightningChargeFill className="text-violet-500" />Tạo quiz</button>
          <button type="button" onClick={() => { props.onAddModel(selectedStepId); setOpenMenu(null); }} className={menuItemClass}><Badge3dFill className="text-cyan-600" />Thêm mô hình 3D</button>
        </>}
      </div>}
    </div>

    <div className="flex gap-3 overflow-x-auto px-3 py-3 xl:flex-1 xl:flex-col xl:gap-0.5 xl:overflow-y-auto" onClick={() => openMenu && setOpenMenu(null)}>
      <button type="button" onClick={() => setRootExpanded((value) => !value)} className="hidden w-full items-center gap-2 rounded-lg px-1 py-2 text-left text-[11px] font-extrabold hover:bg-stone-50 xl:flex">{rootExpanded ? <ChevronDown className="h-3 w-3 text-stone-400" /> : <ChevronRight className="h-3 w-3 text-stone-400" />}<Folder2Open className="h-4 w-4 text-stone-500" />Bài học<span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[8px] text-stone-500">{props.resources.length}</span></button>

      {rootExpanded && props.steps.map((step, stepIndex) => {
        const allChildren = props.resources.filter((item) => item.stepId === step.id);
        const children = visibleResources.filter((item) => item.stepId === step.id);
        const materialIds = new Set(children.filter((item) => item.kind !== 'quiz').map((item) => item.material.id));
        const groupedQuizKeys = new Set(children.filter((item) => item.kind === 'quiz' && item.quiz.triggerResourceId && materialIds.has(item.quiz.triggerResourceId)).map((item) => item.key));
        const topLevelChildren = children.filter((item) => !groupedQuizKeys.has(item.key));
        const open = isExpanded(step.id);
        const menuKey = `activity:${step.id}`;
        const folderDropKey = `folder:${step.id}`;
        return <section key={step.id} onDragOver={(event) => { if (dragItem) { event.preventDefault(); setDropTarget(dragItem.type === 'activity' ? menuKey : folderDropKey); } }} onDrop={(event) => { event.preventDefault(); if (dragItem?.type === 'activity' && dragItem.id !== step.id) props.onReorderActivity(dragItem.id, step.id); if (dragItem?.type === 'resource') props.onReorderResource(dragItem.id, step.id); setDragItem(null); setDropTarget(null); }} className={`group/section relative min-w-[270px] rounded-xl transition xl:min-w-0 ${dropTarget === menuKey || dropTarget === folderDropKey ? 'bg-blue-50 ring-1 ring-[#397BF6]/30' : ''}`}>
          <div className="group/header flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-stone-50">
            <span draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', `activity:${step.id}`); setDragItem({ type: 'activity', id: step.id }); }} onDragEnd={() => { setDragItem(null); setDropTarget(null); }} title="Kéo để sắp xếp phần" className="flex h-7 w-5 cursor-grab items-center justify-center text-stone-300 active:cursor-grabbing"><GripVertical className="h-3.5 w-3.5" /></span>
            {editItem?.type === 'activity' && editItem.id === step.id
              ? <div className="flex min-w-0 flex-1 items-center gap-1"><input autoFocus value={editItem.value} onChange={(event) => setEditItem({ ...editItem, value: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') saveEdit(); if (event.key === 'Escape') setEditItem(null); }} className="h-8 min-w-0 flex-1 rounded-md border border-[#397BF6] bg-white px-2 text-[10px] font-bold outline-none" /><button type="button" onClick={saveEdit} aria-label="Lưu tên" className={`${iconButtonClass} h-7 w-7 text-emerald-600`}><Check2 /></button><button type="button" onClick={() => setEditItem(null)} aria-label="Hủy" className={`${iconButtonClass} h-7 w-7`}><X /></button></div>
              : <button type="button" onClick={() => setExpanded((current) => ({ ...current, [step.id]: !open }))} onDoubleClick={() => renameActivity(step)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-[10px] font-extrabold text-stone-700">{open ? <ChevronDown className="h-3 w-3 text-stone-400" /> : <ChevronRight className="h-3 w-3 text-stone-400" />}{open ? <Folder2Open className="h-3.5 w-3.5 shrink-0 text-[#397BF6]" /> : <Folder2 className="h-3.5 w-3.5 shrink-0 text-[#397BF6]" />}<span className="truncate">{step.title}</span><span className="ml-auto rounded-full bg-stone-100 px-1.5 py-0.5 text-[8px] text-stone-500">{allChildren.length}</span></button>}
            <button type="button" aria-label={`Thêm vào ${step.title}`} onClick={(event) => { event.stopPropagation(); setConfirmDelete(null); setOpenMenu((current) => current === `add:${step.id}` ? null : `add:${step.id}`); }} className={`${iconButtonClass} h-7 w-7 text-[#397BF6]`}><PlusLg /></button>
            <button type="button" aria-label={`Thao tác với ${step.title}`} onClick={(event) => { event.stopPropagation(); setConfirmDelete(null); setOpenMenu((current) => current === menuKey ? null : menuKey); }} className={`${iconButtonClass} h-7 w-7 ${openMenu === menuKey ? 'bg-stone-100 text-[#31599E]' : ''}`}><ThreeDotsVertical /></button>
          </div>

          {openMenu === `add:${step.id}` && <div onClick={(event) => event.stopPropagation()} className="absolute right-8 top-10 z-50 w-48 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl">
            <label className={`${menuItemClass} ${props.uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}><FileEarmarkSlidesFill className="text-blue-500" />{props.uploading ? 'Đang tải lên…' : 'Tải tài liệu'}<input type="file" multiple disabled={props.uploading} accept=".ppt,.pptx,.pdf,.doc,.docx" onChange={(event) => { props.onAddFiles(event.target.files, step.id); event.target.value = ''; setOpenMenu(null); }} className="sr-only" /></label>
            <button type="button" onClick={() => { props.onAddQuiz(step.id); setOpenMenu(null); }} className={menuItemClass}><LightningChargeFill className="text-violet-500" />Tạo quiz</button>
            <button type="button" onClick={() => { props.onAddModel(step.id); setOpenMenu(null); }} className={menuItemClass}><Badge3dFill className="text-cyan-600" />Thêm mô hình</button>
          </div>}

          {openMenu === menuKey && <div onClick={(event) => event.stopPropagation()} className="absolute right-1 top-10 z-40 w-52 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl">
            <button type="button" onClick={() => renameActivity(step)} className={menuItemClass}><Pencil />Chỉnh sửa tên phần</button>
            <label className={`${menuItemClass} ${props.uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}><FileEarmarkSlidesFill className="text-blue-500" />{props.uploading ? 'Đang tải lên…' : 'Thêm tài liệu'}<input type="file" multiple disabled={props.uploading} accept=".ppt,.pptx,.pdf,.doc,.docx" onChange={(event) => { props.onAddFiles(event.target.files, step.id); event.target.value = ''; setOpenMenu(null); }} className="sr-only" /></label>
            <button type="button" onClick={() => { props.onAddQuiz(step.id); setOpenMenu(null); }} className={menuItemClass}><LightningChargeFill className="text-violet-500" />Thêm quiz</button>
            <button type="button" onClick={() => { props.onAddModel(step.id); setOpenMenu(null); }} className={menuItemClass}><Badge3dFill className="text-cyan-600" />Thêm mô hình</button>
            <div className="my-1 border-t border-stone-100" />
            <button type="button" disabled={stepIndex === 0} onClick={() => { props.onMoveActivity(step.id, -1); setOpenMenu(null); }} className={`${menuItemClass} disabled:opacity-30`}><ArrowUp />Di chuyển lên</button>
            <button type="button" disabled={stepIndex === props.steps.length - 1} onClick={() => { props.onMoveActivity(step.id, 1); setOpenMenu(null); }} className={`${menuItemClass} disabled:opacity-30`}><ArrowDown />Di chuyển xuống</button>
            {confirmDelete === menuKey ? <div className="rounded-lg bg-rose-50 p-2"><p className="text-[9px] leading-4 text-rose-700">Xóa chủ đề và {allChildren.length} nội dung bên trong?</p><div className="mt-2 flex gap-1.5"><button type="button" onClick={() => { props.onDeleteActivity(step.id); setOpenMenu(null); setConfirmDelete(null); }} className="flex-1 rounded-md bg-rose-600 py-1.5 text-[9px] font-bold text-white">Xóa</button><button type="button" onClick={() => setConfirmDelete(null)} className="flex-1 rounded-md bg-white py-1.5 text-[9px] font-bold text-stone-600">Hủy</button></div></div> : <button type="button" disabled={props.steps.length <= 1} onClick={() => setConfirmDelete(menuKey)} className={`${menuItemClass} text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30`}><Trash />Xóa chủ đề</button>}
          </div>}

          {open && <div className="ml-[18px] space-y-0.5 border-l border-stone-200 pb-2 pl-3">
            {topLevelChildren.map((resource) => {
              const attachedQuizzes = resource.kind === 'quiz' ? [] : children.filter((item) => item.kind === 'quiz' && item.quiz.triggerResourceId === resource.material.id);
              const resourceExpanded = expandedResources[resource.key] ?? attachedQuizzes.some((quiz) => quiz.key === props.selectedKey);
              const renderRow = (item: StudioResource, nested = false) => {
                const itemActive = item.key === props.selectedKey;
                const itemMenuKey = `resource:${item.key}`;
                return <div key={item.key} onDragOver={(event) => { if (dragItem?.type === 'resource') { event.preventDefault(); event.stopPropagation(); setDropTarget(itemMenuKey); } }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (dragItem?.type === 'resource' && dragItem.id !== item.key) props.onReorderResource(dragItem.id, step.id, item.key); setDragItem(null); setDropTarget(null); }} className={`group/item relative flex items-center rounded-lg transition ${nested ? 'ml-2' : ''} ${itemActive ? 'bg-[#E8F0FB] text-[#1E3F82]' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'} ${dropTarget === itemMenuKey ? 'ring-1 ring-[#397BF6]/40' : ''}`}>
                <span draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', `resource:${item.key}`); setDragItem({ type: 'resource', id: item.key }); }} onDragEnd={() => { setDragItem(null); setDropTarget(null); }} title="Kéo để sắp xếp hoặc chuyển phần" className="ml-0.5 flex h-8 w-4 cursor-grab items-center justify-center text-stone-300 active:cursor-grabbing"><GripVertical className="h-3 w-3" /></span>
                {editItem?.type === 'resource' && editItem.id === item.key
                  ? <div className="flex min-w-0 flex-1 items-center gap-1 py-1"><input autoFocus value={editItem.value} onChange={(event) => setEditItem({ ...editItem, value: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') saveEdit(); if (event.key === 'Escape') setEditItem(null); }} className="h-8 min-w-0 flex-1 rounded-md border border-[#397BF6] bg-white px-2 text-[10px] font-bold outline-none" /><button type="button" onClick={saveEdit} aria-label="Lưu tên" className={`${iconButtonClass} h-7 w-7 text-emerald-600`}><Check2 /></button></div>
                  : <button type="button" onClick={() => props.onSelect(item.key)} onDoubleClick={() => renameResource(item)} className="flex min-w-0 flex-1 items-center gap-2 px-1 py-2 text-left"><ResourceIcon resource={item} /><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold">{getResourceTitle(item)}</span>{item.kind === 'quiz' && <span className="block text-[8px] font-medium text-violet-500">{quizLocationLabel(item)}</span>}</span></button>}
                {!nested && attachedQuizzes.length > 0 && <button type="button" aria-expanded={resourceExpanded} aria-label={`${attachedQuizzes.length} quiz gắn với ${getResourceTitle(item)}`} onClick={(event) => { event.stopPropagation(); setExpandedResources((current) => ({ ...current, [item.key]: !resourceExpanded })); }} className="mr-0.5 flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-1.5 py-1 text-[8px] font-bold text-violet-600 hover:bg-violet-100">{resourceExpanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}{attachedQuizzes.length} quiz</button>}
                <button type="button" aria-label={`Thao tác với ${getResourceTitle(item)}`} onClick={(event) => { event.stopPropagation(); setConfirmDelete(null); setOpenMenu((current) => current === itemMenuKey ? null : itemMenuKey); }} className={`${iconButtonClass} mr-0.5 h-7 w-7 ${openMenu === itemMenuKey ? 'bg-white text-[#31599E]' : ''}`}><ThreeDotsVertical /></button>
                {openMenu === itemMenuKey && <div onClick={(event) => event.stopPropagation()} className="absolute right-1 top-8 z-50 w-44 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl">
                  <button type="button" onClick={() => renameResource(item)} className={menuItemClass}><Pencil />Chỉnh sửa tên</button>
                  {confirmDelete === itemMenuKey ? <div className="rounded-lg bg-rose-50 p-2"><p className="text-[9px] text-rose-700">Xóa nội dung này?</p><div className="mt-2 flex gap-1.5"><button type="button" onClick={() => { props.onDeleteResource(item.key); setOpenMenu(null); setConfirmDelete(null); }} className="flex-1 rounded-md bg-rose-600 py-1.5 text-[9px] font-bold text-white">Xóa</button><button type="button" onClick={() => setConfirmDelete(null)} className="flex-1 rounded-md bg-white py-1.5 text-[9px] font-bold text-stone-600">Hủy</button></div></div> : <button type="button" onClick={() => setConfirmDelete(itemMenuKey)} className={`${menuItemClass} text-rose-600 hover:bg-rose-50 hover:text-rose-700`}><Trash />Xóa nội dung</button>}
                </div>}
              </div>;
              };
              return <div key={resource.key}>{renderRow(resource)}{resourceExpanded && attachedQuizzes.length > 0 && <div className="ml-6 border-l border-violet-100 pl-1.5">{attachedQuizzes.map((quiz) => renderRow(quiz, true))}</div>}</div>;
            })}
            {children.length === 0 && (normalizedQuery ? <p className="px-7 py-2 text-[9px] italic text-stone-400">Không có kết quả phù hợp</p> : <button type="button" onClick={() => setOpenMenu(`add:${step.id}`)} className="mx-1 my-1 flex w-[calc(100%-0.5rem)] items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-200 py-2 text-[9px] font-semibold text-stone-400 hover:border-[#397BF6]/40 hover:bg-blue-50 hover:text-[#31599E]"><PlusLg />Thêm nội dung đầu tiên</button>)}
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

function quizLocationLabel(resource: Extract<StudioResource, { kind: 'quiz' }>): string {
  if (resource.quiz.triggerMode === 'at_slide') return `Tự bật ở slide ${resource.quiz.triggerSlideNumber}`;
  if (resource.quiz.triggerMode === 'after_activity') return `Sau tài liệu · trễ ${resource.quiz.delaySeconds}s`;
  if (resource.quiz.triggerMode === 'at_minute') return `Tự bật phút ${resource.quiz.triggerMinute}`;
  return 'Giáo viên kích hoạt';
}

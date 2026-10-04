'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatDots, Clock, Eye, FileEarmarkText, Flag, InfoCircle, JournalText, PlusLg, Tag, X } from 'react-bootstrap-icons';
import { quizTriggerLabels, type LessonMaterial, type LessonQuiz, type LessonStep } from './lesson-plan';
import type { StudioResource } from './studio-resource';

type InspectorPanel = 'info' | 'objectives' | 'display' | 'tags' | 'notes' | 'discussion' | 'quiz' | 'schedule';
const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[11px] text-stone-700 outline-none transition focus:border-[#5B8FD8] focus:ring-2 focus:ring-blue-100';

export function LessonToolsRail({ resource, step, onUpdateMaterial, onUpdateQuiz }: {
  resource?: StudioResource;
  step?: LessonStep;
  onUpdateMaterial: (patch: Partial<LessonMaterial>) => void;
  onUpdateQuiz: (patch: Partial<LessonQuiz>) => void;
}) {
  const [panel, setPanel] = useState<InspectorPanel | null>(null);
  const inspectorRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!panel) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!inspectorRef.current?.contains(event.target as Node)) setPanel(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [panel]);

  const tools = resource?.kind === 'quiz'
    ? [
        { id: 'quiz' as const, label: 'Nội dung', icon: FileEarmarkText },
        { id: 'schedule' as const, label: 'Kích hoạt', icon: Clock },
        { id: 'notes' as const, label: 'Ghi chú', icon: JournalText },
        { id: 'discussion' as const, label: 'Thảo luận', icon: ChatDots },
      ]
    : [
        { id: 'info' as const, label: 'Thông tin', icon: InfoCircle },
        { id: 'objectives' as const, label: 'Mục tiêu', icon: Flag },
        { id: 'display' as const, label: 'Hiển thị', icon: Eye },
        { id: 'tags' as const, label: 'Phân loại', icon: Tag },
        { id: 'notes' as const, label: 'Ghi chú', icon: JournalText },
        { id: 'discussion' as const, label: 'Thảo luận', icon: ChatDots },
      ];

  return <aside ref={inspectorRef} className="absolute bottom-3 left-3 right-3 z-30 sm:bottom-auto sm:left-auto sm:right-5 sm:top-1/2 sm:-translate-y-1/2">
    <div className="flex items-center gap-0.5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white/95 p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-white/70 backdrop-blur-xl sm:w-[62px] sm:flex-col sm:overflow-visible">
      {tools.map((item) => {
        const Icon = item.icon;
        const active = panel === item.id;
        return <button key={item.id} type="button" aria-label={item.label} aria-expanded={active} onClick={() => setPanel(active ? null : item.id)} className={`group flex h-[52px] min-w-[60px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 text-[7.5px] font-bold transition sm:w-full sm:min-w-0 ${active ? 'border-blue-100 bg-[#EAF2FF] text-[#2563EB] shadow-sm' : 'border-transparent bg-transparent text-stone-500 hover:bg-stone-50 hover:text-[#1E3F82]'}`}>
          <Icon className="h-4 w-4" /><span className="whitespace-nowrap">{item.label}</span>
        </button>;
      })}
    </div>
    {panel && resource && <InspectorPopover title={panelTitle(panel)} icon={panelIcon(panel)} onClose={() => setPanel(null)}><PanelContent panel={panel} resource={resource} step={step} onUpdateMaterial={onUpdateMaterial} onUpdateQuiz={onUpdateQuiz} /></InspectorPopover>}
  </aside>;
}

function PanelContent({ panel, resource, step, onUpdateMaterial, onUpdateQuiz }: { panel: InspectorPanel; resource: StudioResource; step?: LessonStep; onUpdateMaterial: (patch: Partial<LessonMaterial>) => void; onUpdateQuiz: (patch: Partial<LessonQuiz>) => void }) {
  if (panel === 'notes') return <NotesPanel />;
  if (panel === 'discussion') return <DiscussionPanel />;
  if (resource.kind === 'quiz') return panel === 'schedule' ? <QuizSchedulePanel quiz={resource.quiz} onChange={onUpdateQuiz} /> : <QuizContentPanel quiz={resource.quiz} step={step} onChange={onUpdateQuiz} />;
  const material = resource.material;
  if (panel === 'objectives') return <ObjectivesPanel material={material} step={step} onChange={onUpdateMaterial} />;
  if (panel === 'display') return <DisplayPanel material={material} onChange={onUpdateMaterial} />;
  if (panel === 'tags') return <TagsPanel material={material} step={step} onChange={onUpdateMaterial} />;
  return <InformationPanel material={material} step={step} onChange={onUpdateMaterial} />;
}

function InspectorPopover({ title, icon: Icon, onClose, children }: { title: string; icon: typeof InfoCircle; onClose: () => void; children: React.ReactNode }) {
  return <section className="fixed inset-x-3 bottom-20 z-50 flex max-h-[72dvh] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-slate-950/20 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-[calc(100%+12px)] sm:top-1/2 sm:max-h-[calc(100dvh-170px)] sm:w-[332px] sm:-translate-y-1/2">
    <header className="flex shrink-0 items-center justify-between border-b border-stone-100 px-4 py-3.5"><div className="flex items-center gap-2 text-xs font-extrabold text-stone-900"><Icon className="h-4 w-4 text-[#397BF6]" />{title}</div><button type="button" onClick={onClose} aria-label="Đóng" className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X /></button></header>
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#FBFCFF] p-4">{children}</div>
    <footer className="shrink-0 border-t border-stone-100 bg-white px-4 py-2.5 text-right text-[8px] font-semibold text-emerald-600">● Tự động lưu thay đổi</footer>
  </section>;
}

function InformationPanel({ material, step, onChange }: { material: LessonMaterial; step?: LessonStep; onChange: (patch: Partial<LessonMaterial>) => void }) {
  return <div className="space-y-4"><Field label="Tiêu đề"><input value={material.name} onChange={(event) => onChange({ name: event.target.value })} className={inputClass} /></Field><Field label="Mô tả"><textarea rows={5} value={material.description || ''} onChange={(event) => onChange({ description: event.target.value })} className={`${inputClass} resize-y`} placeholder="Mô tả ngắn nội dung tài liệu..." /></Field><div className="grid grid-cols-2 gap-2"><Field label="Loại tài liệu"><select value={material.kind} onChange={(event) => onChange({ kind: event.target.value as LessonMaterial['kind'] })} className={inputClass}><option value="slide">Slide</option><option value="pdf">PDF</option><option value="doc">Document</option><option value="model_3d">Mô hình 3D</option><option value="video">Video</option><option value="link">Liên kết</option></select></Field><Field label="Thời lượng"><div className="relative"><input type="number" min={1} value={material.durationMinutes || step?.durationMinutes || 10} onChange={(event) => onChange({ durationMinutes: Number(event.target.value) })} className={`${inputClass} pr-10`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-stone-400">phút</span></div></Field></div>{material.anatomyModel && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[9px] leading-5 text-blue-800"><strong>Mô hình Giải phẫu:</strong> {material.anatomyModel.title}<br /><span className="text-blue-500">Sketchfab UID: {material.anatomyModel.sketchfabUid}</span></div>}</div>;
}

function ObjectivesPanel({ material, step, onChange }: { material: LessonMaterial; step?: LessonStep; onChange: (patch: Partial<LessonMaterial>) => void }) {
  const objectives = material.learningObjectives?.length ? material.learningObjectives : step?.objective ? [step.objective] : [];
  return <div className="space-y-2.5"><p className="mb-3 text-[10px] leading-5 text-stone-500">Xác định những điều học viên cần đạt được sau nội dung này.</p>{objectives.map((objective, index) => <div key={index} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8F0FB] text-[9px] font-extrabold text-[#397BF6]">{index + 1}</span><input value={objective} onChange={(event) => { const next = [...objectives]; next[index] = event.target.value; onChange({ learningObjectives: next }); }} className="min-w-0 flex-1 text-[10px] text-stone-600 outline-none" /><button type="button" onClick={() => onChange({ learningObjectives: objectives.filter((_, itemIndex) => itemIndex !== index) })} className="text-stone-300 hover:text-rose-500"><X /></button></div>)}<button type="button" onClick={() => onChange({ learningObjectives: [...objectives, 'Mục tiêu học tập mới'] })} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-200 bg-white py-2.5 text-[9px] font-bold text-[#397BF6] hover:bg-blue-50"><PlusLg />Thêm mục tiêu học tập</button></div>;
}

function DisplayPanel({ material, onChange }: { material: LessonMaterial; onChange: (patch: Partial<LessonMaterial>) => void }) {
  return <div className="space-y-1 rounded-xl border border-stone-200 bg-white p-3"><Toggle label="Hiển thị với học viên" description="Học viên có thể xem nội dung này" checked={material.visibleToStudents ?? true} onChange={(value) => onChange({ visibleToStudents: value })} /><Toggle label="Cho phép tải xuống" description="Cho phép lưu bản gốc về thiết bị" checked={material.allowDownload ?? false} onChange={(value) => onChange({ allowDownload: value })} /><Toggle label="Hiển thị số trang" description="Hiện thứ tự trang trong trình xem" checked={material.showPageNumber ?? true} onChange={(value) => onChange({ showPageNumber: value })} /></div>;
}

function TagsPanel({ material, step, onChange }: { material: LessonMaterial; step?: LessonStep; onChange: (patch: Partial<LessonMaterial>) => void }) {
  const tags = material.tags || [material.kind === 'slide' ? 'Bài giảng' : 'Tài liệu', step?.type || 'Học tập'];
  return <div><p className="mb-3 text-[10px] leading-5 text-stone-500">Dùng thẻ để tìm kiếm và tái sử dụng nội dung nhanh hơn.</p><div className="flex flex-wrap gap-2">{tags.map((tagItem, index) => <span key={`${tagItem}-${index}`} className="flex items-center gap-1 rounded-full bg-[#E8F0FB] px-2.5 py-1.5 text-[9px] font-bold text-[#31599E]">{tagItem}<button type="button" onClick={() => onChange({ tags: tags.filter((_, itemIndex) => itemIndex !== index) })}><X /></button></span>)}<button type="button" onClick={() => onChange({ tags: [...tags, 'Thẻ mới'] })} className="flex items-center gap-1 rounded-full border border-dashed border-blue-200 px-2.5 py-1.5 text-[9px] font-bold text-[#397BF6]"><PlusLg />Thêm thẻ</button></div></div>;
}

function QuizContentPanel({ quiz, step, onChange }: { quiz: LessonQuiz; step?: LessonStep; onChange: (patch: Partial<LessonQuiz>) => void }) {
  return <div className="space-y-4"><Field label="Tiêu đề"><input value={quiz.title} onChange={(event) => onChange({ title: event.target.value })} className={inputClass} /></Field><Field label="Câu hỏi"><textarea rows={5} value={quiz.question} onChange={(event) => onChange({ question: event.target.value })} className={`${inputClass} resize-y`} /></Field><p className="rounded-xl bg-[#F4F7FC] p-3 text-[9px] font-semibold leading-5 text-stone-500">Thuộc hoạt động: <strong className="text-[#31599E]">{step?.title}</strong></p></div>;
}

function QuizSchedulePanel({ quiz, onChange }: { quiz: LessonQuiz; onChange: (patch: Partial<LessonQuiz>) => void }) {
  return <div className="space-y-4"><Field label="Chế độ"><select value={quiz.triggerMode} onChange={(event) => onChange({ triggerMode: event.target.value as LessonQuiz['triggerMode'] })} className={inputClass}>{Object.entries(quizTriggerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>{quiz.triggerMode === 'at_minute' && <Field label="Xuất hiện ở phút"><input type="number" min={0} value={quiz.triggerMinute} onChange={(event) => onChange({ triggerMinute: Number(event.target.value) })} className={inputClass} /></Field>}{quiz.triggerMode === 'after_activity' && <Field label="Độ trễ sau nội dung (giây)"><input type="number" min={0} value={quiz.delaySeconds} onChange={(event) => onChange({ delaySeconds: Number(event.target.value) })} className={inputClass} /></Field>}<Field label="Thời gian trả lời (giây)"><input type="number" min={10} value={quiz.durationSeconds} onChange={(event) => onChange({ durationSeconds: Number(event.target.value) })} className={inputClass} /></Field></div>;
}

function NotesPanel() { return <div><p className="mb-3 text-[10px] leading-5 text-stone-500">Ghi chú riêng dành cho giáo viên khi chuẩn bị và giảng dạy.</p><textarea rows={12} className={`${inputClass} resize-y`} placeholder="Ghi lại lưu ý khi giảng dạy tài liệu này..." /></div>; }
function DiscussionPanel() { return <div className="flex min-h-56 flex-col items-center justify-center text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#397BF6]"><ChatDots className="h-5 w-5" /></span><p className="mt-4 text-xs font-extrabold text-stone-700">Thảo luận theo tài liệu</p><p className="mt-2 max-w-[240px] text-[10px] leading-5 text-stone-400">Câu hỏi và phản hồi của lớp sẽ hiển thị tại đây trong buổi học.</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[8px] font-extrabold uppercase tracking-wider text-stone-400">{label}</span>{children}</label>; }
function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex cursor-pointer items-center justify-between gap-3 border-b border-stone-100 py-3 last:border-0"><span><span className="block text-[10px] font-bold text-stone-700">{label}</span><span className="mt-1 block text-[8px] text-stone-400">{description}</span></span><span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-[#397BF6]' : 'bg-stone-200'}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only" /><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} /></span></label>; }
function panelTitle(panel: InspectorPanel) { return ({ info: 'Thông tin tài liệu', objectives: 'Mục tiêu học tập', display: 'Tùy chọn hiển thị', tags: 'Thẻ phân loại', notes: 'Ghi chú giáo viên', discussion: 'Thảo luận', quiz: 'Nội dung quiz', schedule: 'Lịch kích hoạt' } as const)[panel]; }
function panelIcon(panel: InspectorPanel) { return ({ info: InfoCircle, objectives: Flag, display: Eye, tags: Tag, notes: JournalText, discussion: ChatDots, quiz: FileEarmarkText, schedule: Clock } as const)[panel]; }

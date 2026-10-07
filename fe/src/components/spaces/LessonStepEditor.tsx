'use client';

import type { Icon } from 'react-bootstrap-icons';
import { FileEarmarkText, Lightbulb, LightningChargeFill, PencilSquare, PlusLg, Trash, X } from 'react-bootstrap-icons';
import { activityTypeLabels, quizTriggerLabels, type LessonActivityType, type MaterialKind, type LessonQuiz, type LessonStep } from './lesson-plan';

interface LessonStepEditorProps { step: LessonStep; stepNumber: number; onChange: (patch: Partial<LessonStep>) => void; onRemove: () => void; canRemove: boolean }
const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-800 outline-none transition focus:border-[#5B8FD8] focus:ring-2 focus:ring-[#5B8FD8]/10';

export function LessonStepEditor({ step, stepNumber, onChange, onRemove, canRemove }: LessonStepEditorProps) {
  const updateQuiz = (patch: Partial<LessonQuiz>) => onChange({
    quiz: { ...step.quiz, ...patch },
    ...(patch.enabled === true ? { feedbackMode: 'quiz' as const } : {}),
  });
  const addMaterials = (files: FileList | null) => {
    if (!files?.length) return;
    const materials = Array.from(files).map((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const kind: MaterialKind = extension === 'pdf' ? 'pdf' : extension === 'doc' || extension === 'docx' ? 'doc' : 'slide';
      const sizeLabel = file.size > 1_048_576 ? `${(file.size / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      return { id: `${Date.now()}-${file.name}`, name: file.name, kind, sizeLabel };
    });
    onChange({ materials: [...step.materials, ...materials] });
  };

  const updateOption = (index: number, value: string) => {
    const options = [...step.quiz.options];
    options[index] = value;
    updateQuiz({ options });
  };

  return (
    <main className="min-w-0 bg-[#F7F9FD] xl:min-h-0 xl:overflow-y-auto">
      <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#5B8FD8]">Hoạt động {stepNumber}</p><h2 className="mt-0.5 text-base font-extrabold text-stone-900">Thiết kế nội dung & cách triển khai</h2></div><button type="button" disabled={!canRemove} onClick={onRemove} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold text-stone-400 hover:bg-rose-50 hover:text-rose-600 disabled:hidden"><Trash className="h-3 w-3" />Xóa hoạt động</button></div></div>
      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px_120px]">
            <Field label="Tên hoạt động"><input value={step.title} onChange={(event) => onChange({ title: event.target.value })} className={inputClass} placeholder="Ví dụ: Khởi động bằng tình huống" /></Field>
            <Field label="Hình thức"><select value={step.type} onChange={(event) => onChange({ type: event.target.value as LessonActivityType })} className={inputClass}>{Object.entries(activityTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Thời lượng"><div className="relative"><input type="number" min={1} max={180} value={step.durationMinutes} onChange={(event) => onChange({ durationMinutes: Math.max(1, Number(event.target.value) || 1) })} className={`${inputClass} pr-12`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400">phút</span></div></Field>
          </div>
        </section>
        <EditorSection icon={Lightbulb} title="Mục tiêu học tập" hint="Sau hoạt động này, học viên làm được gì?"><textarea rows={3} value={step.objective} onChange={(event) => onChange({ objective: event.target.value })} className={`${inputClass} resize-y leading-relaxed`} placeholder="Viết một mục tiêu có thể quan sát hoặc đánh giá..." /></EditorSection>
        <EditorSection icon={PencilSquare} title="Kịch bản của giáo viên" hint="Synapse dựa vào phần này để gợi ý và điều phối."><textarea rows={6} value={step.teacherInstructions} onChange={(event) => onChange({ teacherInstructions: event.target.value })} className={`${inputClass} resize-y leading-relaxed`} placeholder="Mô tả giáo viên sẽ nói gì, mở hoạt động nào, dừng ở đâu để hỏi học viên..." /><div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[10px] leading-relaxed text-blue-800"><span className="font-extrabold">Khi dạy:</span> hệ thống dùng kịch bản này để nhắc đúng hoạt động, thu phản hồi và đề xuất bước tiếp theo. Mic, camera và chia sẻ màn hình vẫn chạy trong BBB.</div></EditorSection>
        <EditorSection icon={FileEarmarkText} title="Học liệu của hoạt động" hint="Thêm PPT/PPTX, PDF hoặc DOC/DOCX để dùng theo đúng thứ tự khi dạy.">
          <div className="grid gap-2 sm:grid-cols-2">
            {step.materials.map((material) => <div key={material.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-[#FBFCFF] p-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[9px] font-extrabold uppercase ${material.kind === 'slide' ? 'bg-blue-50 text-blue-700' : material.kind === 'pdf' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700'}`}>{material.kind}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-stone-700">{material.name}</span><span className="text-[9px] text-stone-400">{material.sizeLabel}</span></span><button type="button" aria-label={`Xóa ${material.name}`} onClick={() => onChange({ materials: step.materials.filter((item) => item.id !== material.id) })} className="rounded-lg p-1.5 text-stone-300 hover:bg-rose-50 hover:text-rose-500"><X className="h-3 w-3" /></button></div>)}
            <label className="flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#5B8FD8]/50 bg-blue-50/30 text-[10px] font-bold text-[#1E3F82] hover:bg-blue-50"><PlusLg className="h-3 w-3" />Thêm slide, PDF hoặc DOC<input type="file" multiple accept=".ppt,.pptx,.pdf,.doc,.docx" onChange={(event) => { addMaterials(event.target.files); event.target.value = ''; }} className="sr-only" /></label>
          </div>
          <input value={step.resource} onChange={(event) => onChange({ resource: event.target.value })} className={inputClass} placeholder="Hoặc dán liên kết tài liệu, Figma, Google Drive..." />
          <p className="text-[9px] leading-relaxed text-stone-400">Bản thử nghiệm hiện lưu tên và cấu hình file trong bản nháp. Nội dung file sẽ được tải lên kho học liệu khi nối API lưu trữ.</p>
        </EditorSection>

        <EditorSection icon={LightningChargeFill} title="Quiz gắn với hoạt động" hint="Quiz có thể phát thủ công hoặc tự xuất hiện theo mốc đã đặt.">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-lime-200 bg-lime-50 p-3"><span><span className="block text-[11px] font-extrabold text-stone-800">Kích hoạt quiz cho hoạt động này</span><span className="mt-0.5 block text-[9px] text-stone-500">Học viên sẽ nhận quiz trên lớp khi trigger chạy.</span></span><input type="checkbox" checked={step.quiz.enabled} onChange={(event) => updateQuiz({ enabled: event.target.checked })} className="h-4 w-4 accent-[#1E3F82]" /></label>
          {step.quiz.enabled && <div className="space-y-4 rounded-xl border border-stone-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Tên quiz"><input value={step.quiz.title} onChange={(event) => updateQuiz({ title: event.target.value })} className={inputClass} /></Field><Field label="Cách xuất hiện"><select value={step.quiz.triggerMode} onChange={(event) => updateQuiz({ triggerMode: event.target.value as LessonQuiz['triggerMode'] })} className={inputClass}>{Object.entries(quizTriggerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
            <Field label="Câu hỏi"><textarea rows={3} value={step.quiz.question} onChange={(event) => updateQuiz({ question: event.target.value })} className={`${inputClass} resize-y`} /></Field>
            <div className="grid gap-2 sm:grid-cols-2">{step.quiz.options.map((option, index) => <label key={index} className={`flex items-center gap-2 rounded-xl border p-2 ${step.quiz.correctOption === index ? 'border-lime-300 bg-lime-50' : 'border-stone-200'}`}><input type="radio" name={`correct-${step.id}`} checked={step.quiz.correctOption === index} onChange={() => updateQuiz({ correctOption: index })} className="accent-emerald-600" /><input aria-label={`Đáp án ${index + 1}`} value={option} onChange={(event) => updateOption(index, event.target.value)} className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-stone-700 outline-none" /></label>)}</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {step.quiz.triggerMode === 'at_minute' && <Field label="Xuất hiện ở phút"><input type="number" min={0} value={step.quiz.triggerMinute} onChange={(event) => updateQuiz({ triggerMinute: Math.max(0, Number(event.target.value)) })} className={inputClass} /></Field>}
              {step.quiz.triggerMode === 'after_activity' && <Field label="Trễ sau nội dung"><div className="relative"><input type="number" min={0} value={step.quiz.delaySeconds} onChange={(event) => updateQuiz({ delaySeconds: Math.max(0, Number(event.target.value)) })} className={`${inputClass} pr-10`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-stone-400">giây</span></div></Field>}
              <Field label="Thời gian trả lời"><div className="relative"><input type="number" min={10} value={step.quiz.durationSeconds} onChange={(event) => updateQuiz({ durationSeconds: Math.max(10, Number(event.target.value)) })} className={`${inputClass} pr-10`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-stone-400">giây</span></div></Field>
            </div>
          </div>}
        </EditorSection>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-stone-500">{label}</span>{children}</label>; }
function EditorSection({ icon: IconComponent, title, hint, children }: { icon: Icon; title: string; hint: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E8F0FB] text-[#1E3F82]"><IconComponent className="h-4 w-4" /></span><div><h3 className="text-xs font-extrabold text-stone-800">{title}</h3><p className="mt-0.5 text-[10px] text-stone-400">{hint}</p></div></div><div className="mt-3 space-y-3">{children}</div></section>; }

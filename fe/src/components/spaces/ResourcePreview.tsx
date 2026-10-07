'use client';

import { FileEarmarkText, LightningChargeFill } from 'react-bootstrap-icons';
import { getResourceTitle, type StudioResource } from './studio-resource';

export function ResourcePreview({ resource }: { resource?: StudioResource }) {
  if (!resource) return <main className="flex min-h-[480px] items-center justify-center bg-[#F3F5F9] p-6"><div className="text-center text-stone-400"><FileEarmarkText className="mx-auto h-10 w-10" /><p className="mt-3 text-xs font-bold">Chọn hoặc thêm tài liệu để xem trước</p></div></main>;
  return <main className="min-w-0 bg-[#E9EDF4] xl:min-h-0 xl:overflow-y-auto">
    <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-3"><div className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-wider text-[#5B8FD8]">Bản xem trước · {resource.stepTitle}</p><h2 className="mt-1 truncate text-sm font-extrabold text-stone-900">{getResourceTitle(resource)}</h2></div><span className="rounded-lg bg-[#F4F7FC] px-2.5 py-1.5 text-[9px] font-extrabold uppercase text-[#1E3F82]">{resource.kind}</span></div>
    <div className="flex min-h-[520px] items-start justify-center p-4 sm:p-7">
      {resource.kind === 'quiz' ? <QuizPreview resource={resource} /> : <DocumentPreview resource={resource} />}
    </div>
  </main>;
}

function DocumentPreview({ resource }: { resource: Exclude<StudioResource, { kind: 'quiz' }> }) {
  return <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-blue-950/10"><div className={`h-2 ${resource.kind === 'pdf' ? 'bg-rose-500' : resource.kind === 'doc' ? 'bg-sky-600' : 'bg-[#31599E]'}`} /><div className="border-b border-stone-100 px-8 py-6"><span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-stone-400">{resource.kind === 'slide' ? 'Trang trình chiếu' : 'Tài liệu học tập'}</span><h3 className="mt-3 text-xl font-extrabold text-stone-900">{resource.material.name.replace(/\.[^.]+$/, '')}</h3><p className="mt-2 text-xs leading-relaxed text-stone-500">Bản xem trước nội dung sẽ xuất hiện tại đây sau khi file được tải lên kho học liệu.</p></div><div className="grid min-h-72 gap-6 p-8 sm:grid-cols-[1.2fr_0.8fr]"><div className="space-y-3"><div className="h-3 w-3/4 rounded bg-stone-200" /><div className="h-2 w-full rounded bg-stone-100" /><div className="h-2 w-11/12 rounded bg-stone-100" /><div className="mt-6 aspect-video rounded-xl bg-gradient-to-br from-[#E8F0FB] to-[#D7E3F7] p-6"><div className="h-full rounded-lg border border-white/70 bg-white/45" /></div></div><div className="rounded-xl bg-[#F8FBEA] p-4"><p className="text-[10px] font-extrabold text-[#1E3F82]">Ghi chú của giáo viên</p><p className="mt-2 text-[10px] leading-relaxed text-stone-500">Sử dụng phần cài đặt bên phải để gắn tài liệu vào hoạt động và cấu hình cách hiển thị.</p></div></div></div>;
}

function QuizPreview({ resource }: { resource: Extract<StudioResource, { kind: 'quiz' }> }) {
  return <div className="w-full max-w-2xl rounded-2xl border border-lime-200 bg-white p-5 shadow-xl shadow-blue-950/10 sm:p-7"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-extrabold text-lime-800"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-200"><LightningChargeFill /></span>Quiz tương tác</span><span className="rounded-full bg-stone-100 px-2.5 py-1 text-[9px] font-bold text-stone-500">{resource.quiz.durationSeconds} giây</span></div><h3 className="mt-6 text-lg font-extrabold leading-relaxed text-stone-900">{resource.quiz.question}</h3><div className="mt-5 grid gap-3 sm:grid-cols-2">{resource.quiz.options.map((option, index) => <div key={index} className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-semibold ${index === resource.quiz.correctOption ? 'border-lime-300 bg-lime-50 text-lime-900' : 'border-stone-200 text-stone-600'}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-[9px] font-extrabold">{String.fromCharCode(65 + index)}</span>{option}</div>)}</div><button type="button" disabled className="mt-6 w-full rounded-xl bg-[#1E3F82] py-3 text-xs font-extrabold text-white opacity-70">Xem trước phía học viên</button></div>;
}

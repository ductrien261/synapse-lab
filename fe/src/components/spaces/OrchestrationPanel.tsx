'use client';

import type { Icon } from 'react-bootstrap-icons';
import { BarChartFill, CheckCircleFill, Clock, LightningChargeFill, Sliders } from 'react-bootstrap-icons';
import { feedbackModeLabels, quizTriggerLabels, type FeedbackMode, type LessonStep } from './lesson-plan';

export function OrchestrationPanel({ step, onChange }: { step: LessonStep; onChange: (patch: Partial<LessonStep>) => void }) {
  const quizTiming = step.quiz.triggerMode === 'at_minute'
    ? `Phút ${step.quiz.triggerMinute} của buổi học`
    : step.quiz.triggerMode === 'after_activity'
      ? `Sau nội dung ${step.quiz.delaySeconds} giây`
      : 'Chờ giáo viên bấm phát';
  return (
    <aside className="flex min-h-0 flex-col border-t border-stone-200 bg-white xl:border-l xl:border-t-0">
      <div className="border-b border-stone-200 px-4 py-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-stone-400">Luật điều phối</p><h2 className="mt-1 text-sm font-extrabold text-stone-900">Tự động hóa lớp học</h2></div>
      <div className="flex-1 space-y-4 overflow-y-auto bg-[#FBFCFF] p-4">
        {step.quiz.enabled && <section className="rounded-2xl border border-lime-200 bg-lime-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><Label icon={LightningChargeFill} title="Quiz tự động" /><span className="rounded-full bg-white px-2 py-1 text-[8px] font-extrabold uppercase text-lime-700">Đã bật</span></div>
          <p className="mt-3 text-[11px] font-extrabold leading-relaxed text-stone-800">{step.quiz.title}</p>
          <div className="mt-3 space-y-2 rounded-xl bg-white/80 p-3 text-[10px] text-stone-600"><p className="flex items-center gap-2"><Clock className="h-3 w-3 text-lime-700" /><strong>{quizTiming}</strong></p><p>{step.quiz.durationSeconds} giây trả lời · đáp án đúng từ cấu hình quiz</p><p className="text-[9px] font-semibold text-lime-700">{quizTriggerLabels[step.quiz.triggerMode]}</p></div>
        </section>}
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <Label icon={BarChartFill} title="Tín hiệu cần thu" />
          <select value={step.feedbackMode} onChange={(event) => onChange({ feedbackMode: event.target.value as FeedbackMode })} className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-700 outline-none focus:border-[#5B8FD8]">{Object.entries(feedbackModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          {step.feedbackMode !== 'none' && <div className="mt-4"><div className="flex items-center justify-between text-[10px] font-bold text-stone-500"><span>Ngưỡng đạt yêu cầu</span><span className="rounded-md bg-[#E8F0FB] px-2 py-1 text-[#1E3F82]">{step.successThreshold}%</span></div><input aria-label="Ngưỡng đạt yêu cầu" type="range" min={10} max={100} step={5} value={step.successThreshold} onChange={(event) => onChange({ successThreshold: Number(event.target.value) })} className="mt-3 w-full accent-[#1E3F82]" /></div>}
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <Label icon={Sliders} title="Điều kiện chuyển bước" />
          <textarea rows={4} value={step.transitionCondition} onChange={(event) => onChange({ transitionCondition: event.target.value })} className="mt-3 w-full resize-y rounded-xl border border-stone-200 px-3 py-2.5 text-[11px] leading-relaxed text-stone-700 outline-none focus:border-[#5B8FD8]" />
          <label className="mt-3 flex cursor-pointer items-start justify-between gap-3 rounded-xl bg-stone-50 p-3"><span><span className="block text-[11px] font-extrabold text-stone-700">Tự động chuyển bước</span><span className="mt-0.5 block text-[9px] leading-relaxed text-stone-400">Chỉ chuyển khi ngưỡng phản hồi đạt yêu cầu.</span></span><input type="checkbox" checked={step.autoAdvance} onChange={(event) => onChange({ autoAdvance: event.target.checked })} className="mt-1 h-4 w-4 accent-[#1E3F82]" /></label>
        </section>
        <section className="rounded-2xl border border-[#DDE6C5] bg-[#F8FBEA] p-4"><Label icon={LightningChargeFill} title="Khi buổi học diễn ra" /><div className="mt-3 space-y-2"><FlowItem number="1" text={`Mở ${step.materials.length || 'không có'} học liệu của hoạt động`} />{step.quiz.enabled && <FlowItem number="2" text={`Phát quiz: ${quizTiming.toLowerCase()}`} />}<FlowItem number={step.quiz.enabled ? '3' : '2'} text={step.feedbackMode === 'none' ? 'Theo dõi thời lượng hoạt động' : `Thu ${feedbackModeLabels[step.feedbackMode].toLowerCase()}`} /><FlowItem number={step.quiz.enabled ? '4' : '3'} text={step.autoAdvance ? `Tự chuyển khi đạt ${step.successThreshold}%` : 'Báo kết quả để giáo viên quyết định'} /></div></section>
        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-800"><CheckCircleFill className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p><span className="font-extrabold">Bản nháp thiết kế:</span> các luật đang được lưu trên thiết bị này. Runtime điều phối sẽ được nối với máy chủ ở giai đoạn tiếp theo.</p></div>
      </div>
    </aside>
  );
}

function Label({ icon: IconComponent, title }: { icon: Icon; title: string }) { return <div className="flex items-center gap-2 text-xs font-extrabold text-stone-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F0FB] text-[#1E3F82]"><IconComponent className="h-3.5 w-3.5" /></span>{title}</div>; }
function FlowItem({ number, text }: { number: string; text: string }) { return <div className="flex items-center gap-2 text-[10px] font-semibold text-stone-600"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-extrabold text-[#1E3F82] shadow-sm">{number}</span><span className="min-w-0 flex-1">{text}</span></div>; }

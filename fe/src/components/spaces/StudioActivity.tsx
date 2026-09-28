'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';
import { HandIndexThumbFill, PeopleFill, QuestionCircleFill, Robot, SendFill } from 'react-bootstrap-icons';

export function StudioActivity() {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  return (
    <aside className="flex min-h-0 flex-col border-t border-stone-200 bg-white xl:border-l xl:border-t-0">
      <div className="flex border-b border-stone-200">
        {['Hoạt động', 'Trao đổi', 'Ghi chú'].map((tab, index) => <button type="button" key={tab} className={`flex-1 border-b-2 px-2 py-3 text-[10px] font-bold ${index === 0 ? 'border-[#1E3F82] text-[#1E3F82]' : 'border-transparent text-stone-400 hover:text-stone-700'}`}>{tab}{tab === 'Trao đổi' && ' (18)'}</button>)}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#FBFCFF] p-3">
        <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2 text-xs font-extrabold text-stone-800"><QuestionCircleFill className="h-4 w-4 text-[#5B8FD8]" /> Nhịp độ phiên</div><span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Realtime</span></div>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-500">Bạn đang theo kịp phần mô phỏng này chứ?</p>
          <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className="rounded-xl bg-emerald-50 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">👍 Đã hiểu (4)</button><button type="button" className="rounded-xl bg-amber-50 py-2 text-[10px] font-bold text-amber-700 hover:bg-amber-100">Cần chậm lại (2)</button></div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between"><span className="rounded-md bg-[#1E3F82] px-1.5 py-1 text-[8px] font-extrabold uppercase text-white">Quiz</span><span className="rounded-md bg-amber-50 px-1.5 py-1 text-[9px] font-bold text-amber-700">00:42</span></div>
          <p className="mt-3 text-[11px] font-bold leading-relaxed text-stone-800">Sau khi đỉnh E vào hàng đợi và đỉnh B kết thúc, đỉnh nào sẽ được lấy ra duyệt tiếp theo?</p>
          <div className="mt-3 space-y-1.5">
            {['Đỉnh C', 'Đỉnh D', 'Đỉnh E', 'Đỉnh F'].map((option) => <label key={option} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-semibold transition-colors ${answer === option ? 'border-[#5B8FD8] bg-[#E8F0FB] text-[#1E3F82]' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}><input type="radio" name="answer" value={option} checked={answer === option} onChange={() => { setAnswer(option); setSubmitted(false); }} className="accent-[#1E3F82]" />{option}</label>)}
          </div>
          <button type="button" disabled={!answer} onClick={() => setSubmitted(true)} className="mt-3 w-full rounded-lg bg-[#1E3F82] py-2 text-[10px] font-bold text-white hover:bg-[#163070] disabled:opacity-40">{submitted ? 'Đã gửi câu trả lời' : 'Gửi câu trả lời'}</button>
        </section>

        <section>
          <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-stone-400">Tương tác nhanh</p>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction icon={HandIndexThumbFill} label={handRaised ? 'Đã giơ tay' : 'Giơ tay'} active={handRaised} onClick={() => setHandRaised((value) => !value)} />
            <QuickAction icon={QuestionCircleFill} label="Đặt câu hỏi" />
            <QuickAction icon={PeopleFill} label="Thảo luận" />
          </div>
        </section>

        <section className="rounded-2xl border border-[#DDE6C5] bg-[#F8FBEA] p-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#1E3F82]"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1E3F82] text-white"><Robot className="h-3 w-3" /></span> Synapse AI Tutor</div>
          <p className="mt-2 text-[10px] leading-relaxed text-stone-600">Bạn muốn xem lại cách hàng đợi thay đổi khi các đỉnh kề lần lượt được enqueue không?</p>
          <button type="button" className="mt-2 rounded-lg bg-[#1E3F82] px-3 py-1.5 text-[9px] font-bold text-white">Xem lại bước Queue</button>
        </section>
      </div>
      <div className="flex gap-2 border-t border-stone-200 p-3"><input aria-label="Nhắn vào phòng" placeholder="Nhắn vào phòng..." className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-[#F9FBFF] px-3 py-2 text-[10px] outline-none focus:border-[#5B8FD8]" /><button type="button" aria-label="Gửi tin nhắn" className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1E3F82] text-white"><SendFill className="h-3 w-3" /></button></div>
    </aside>
  );
}

function QuickAction({ icon: Icon, label, active, onClick }: { icon: ComponentType<{ className?: string }>; label: string; active?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-[9px] font-bold transition-colors ${active ? 'border-[#5B8FD8] bg-[#E8F0FB] text-[#1E3F82]' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}><Icon className="h-4 w-4" />{label}</button>;
}

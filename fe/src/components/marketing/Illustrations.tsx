import { ShieldCheck } from 'react-bootstrap-icons';

// Minh họa giao diện thật của sản phẩm (ví dụ nội dung, không phải số liệu).

export function CitationCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_64px_-32px_rgba(15,34,88,0.35)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ví dụ câu trả lời</p>
      <div className="mt-4 ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#1E3F82] px-4 py-3 text-[15px] text-white">
        Van hai lá nằm ở đâu và có vai trò gì?
      </div>
      <div className="mt-4 max-w-[92%] rounded-2xl rounded-bl-md bg-[#F4F7FC] px-4 py-3 text-[15px] leading-relaxed text-slate-800">
        Van hai lá nằm giữa tâm nhĩ trái và tâm thất trái <sup className="font-bold text-[#1E3F82]">[1]</sup>. Khi tâm thất co, van đóng lại để
        máu không trào ngược lên tâm nhĩ <sup className="font-bold text-[#1E3F82]">[1]</sup>.
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
        <span className="mt-0.5 text-sm font-bold text-[#1E3F82]">[1]</span>
        <div className="text-sm leading-snug">
          <p className="font-semibold text-[#0F2258]">Anatomy and Physiology 2e</p>
          <p className="text-slate-500">OpenStax · 19.1 Heart Anatomy</p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
        <ShieldCheck className="h-4 w-4" /> Trích dẫn đã được kiểm tra tự động
      </p>
    </div>
  );
}

export function ReviewSchedule() {
  const steps = ['10 phút', '1 ngày', '2 ngày', '4 ngày', '7 ngày', '16 ngày'];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Khoảng cách ôn tập</p>
      <ol className="mt-5 flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-4">
            <span className="w-6 text-sm font-semibold tabular-nums text-slate-400">{i + 1}</span>
            <div className="h-9 flex-1 rounded-lg bg-slate-100">
              <div className="flex h-9 items-center rounded-lg bg-[#1E3F82] px-3 text-sm font-semibold text-white" style={{ width: `${28 + i * 14}%`, opacity: 0.45 + i * 0.11 }}>
                {s}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-sm leading-relaxed text-slate-500">Trả lời đúng: khoảng cách giãn ra. Trả lời sai: quay lại mức đầu.</p>
    </div>
  );
}

export function ProfileCard() {
  const rows = [
    { name: 'Tâm thất trái', level: 86 },
    { name: 'Van hai lá', level: 64 },
    { name: 'Động mạch vành', level: 38 },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ví dụ hồ sơ học tập</p>
      <ul className="mt-5 flex flex-col gap-4">
        {rows.map((r) => (
          <li key={r.name}>
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-[#0F2258]">{r.name}</span>
              <span className="tabular-nums text-slate-500">{r.level}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-[#1E3F82]" style={{ width: `${r.level}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
        <span className="font-semibold">Hay nhầm:</span> van hai lá và van ba lá
      </div>
    </div>
  );
}

export function SpaceCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ví dụ không gian học nhóm</p>
      <p className="mt-4 text-xl font-bold text-[#0F2258]">Ôn tập hệ tuần hoàn</p>
      <div className="mt-5 flex items-center justify-between rounded-xl border border-dashed border-slate-300 px-4 py-3">
        <span className="text-sm text-slate-500">Mã tham gia</span>
        <span className="font-mono text-lg font-bold tracking-[0.2em] text-[#1E3F82]">SYN-4821</span>
      </div>
      <div className="mt-5 flex -space-x-2">
        {['#1E3F82', '#5B8FD8', '#0E6B6B', '#B45309'].map((c) => (
          <span key={c} className="h-9 w-9 rounded-full border-2 border-white" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

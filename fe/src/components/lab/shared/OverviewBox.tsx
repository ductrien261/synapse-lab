'use client';

import { useState } from 'react';

interface Props {
  title: string;
  /** Một câu: hệ thống này làm gì */
  what: string;
  /** Các bước hoạt động theo thứ tự */
  steps: string[];
  /** Vị trí (lớp CSS), mặc định góc trái dưới của khung tương tác */
  className?: string;
}

/** Hộp giải thích tổng quan cố định ở góc khung 3D, cho người học đọc trước khi bấm vào từng bộ phận. */
export function OverviewBox({ title, what, steps, className = 'left-3 bottom-3' }: Props) {
  const [open, setOpen] = useState(true);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`absolute z-20 rounded-full border border-[#1E3F82]/30 bg-white/95 px-4 py-2 text-sm font-semibold text-[#1E3F82] shadow-lg backdrop-blur ${className}`}
      >
        Xem cách hoạt động
      </button>
    );
  }
  return (
    <div className={`absolute z-20 flex max-h-[70%] w-[min(25rem,calc(100%-1.5rem))] flex-col gap-2 overflow-y-auto rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold text-[#0F2258]">{title}</h2>
        <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-stone-500 hover:bg-stone-100">
          Thu gọn
        </button>
      </div>
      <p className="text-sm text-stone-700">{what}</p>
      <ol className="flex flex-col gap-1.5 text-xs leading-relaxed text-stone-600">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1E3F82] text-[10px] font-bold text-white">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-stone-400">Đọc xong thì bấm vào từng bộ phận để xem chi tiết.</p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Lightbulb } from 'react-bootstrap-icons';
import type { AlgorithmScenarioOptions } from '@/lib/algorithm-api';

const fieldClass = 'block w-full min-h-11 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none transition-colors focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10 disabled:opacity-50';

export function AlgorithmScenarioForm({ initialTopic, disabled, onSubmit, onCancel }: {
  initialTopic: string;
  disabled: boolean;
  onSubmit: (options: AlgorithmScenarioOptions) => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [style, setStyle] = useState<AlgorithmScenarioOptions['style']>('trace');

  return <form
    onSubmit={(event) => { event.preventDefault(); if (topic.trim()) onSubmit({ topic: topic.trim(), style }); }}
    className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_rgba(36,51,85,0.06)]"
    aria-label="Cấu hình tình huống thuật toán"
  >
    <div className="flex items-start gap-3 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-white px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600"><Lightbulb className="h-4 w-4" /></span>
      <div><h3 className="text-sm font-bold text-[#243355]">Tạo tình huống</h3><p className="mt-0.5 text-xs text-stone-500">Chọn một cách luyện phù hợp với bài học.</p></div>
    </div>
    <div className="space-y-4 p-4">
      <label className="block space-y-1.5 text-xs font-semibold text-stone-600">Chủ đề muốn luyện
        <input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={160} required disabled={disabled} className={fieldClass} />
      </label>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-stone-600">Kiểu tình huống</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([{ value: 'trace', label: 'Theo dõi từng bước', detail: 'Dự đoán bước chạy tiếp theo' }, { value: 'application', label: 'Bài toán thực tế', detail: 'Chọn cách áp dụng phù hợp' }] as const).map((option) => (
            <label key={option.value} className={`flex min-h-16 cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-3 transition-colors focus-within:ring-2 focus-within:ring-[#1E3F82]/20 ${style === option.value ? 'border-[#1E3F82] bg-[#F2F6FD]' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
              <input type="radio" name="algorithm-scenario-style" value={option.value} checked={style === option.value} onChange={() => setStyle(option.value)} disabled={disabled} className="mt-0.5 accent-[#1E3F82]" />
              <span><span className="block text-xs font-semibold text-[#243355]">{option.label}</span><span className="mt-1 block text-[11px] leading-snug text-stone-500">{option.detail}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-3">
        <button type="button" onClick={onCancel} disabled={disabled} className="rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50">Hủy</button>
        <button type="submit" disabled={disabled} className="rounded-xl bg-[#1E3F82] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#17316A] disabled:opacity-50">Tạo tình huống</button>
      </div>
    </div>
  </form>;
}

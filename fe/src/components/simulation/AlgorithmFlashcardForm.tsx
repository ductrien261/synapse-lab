'use client';

import { useState } from 'react';
import { CardText, ChevronDown } from 'react-bootstrap-icons';
import type { AlgorithmFlashcardOptions } from '@/lib/algorithm-api';

const fieldClass = 'block w-full min-h-11 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none transition-colors focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10 disabled:opacity-50';

export function AlgorithmFlashcardForm({ initialTopic, disabled, onSubmit, onCancel }: {
  initialTopic: string;
  disabled: boolean;
  onSubmit: (options: AlgorithmFlashcardOptions) => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [count, setCount] = useState(5);
  const [focus, setFocus] = useState('');

  return <form
    onSubmit={(event) => {
      event.preventDefault();
      if (topic.trim() && Number.isInteger(count) && count >= 1 && count <= 10) {
        onSubmit({ topic: topic.trim(), count, focus: focus.trim() });
      }
    }}
    className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_rgba(36,51,85,0.06)]"
    aria-label="Cấu hình flashcard thuật toán"
  >
    <div className="flex items-start gap-3 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-white px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600"><CardText className="h-4 w-4" /></span>
      <div><h3 className="text-sm font-bold text-[#243355]">Tạo flashcard</h3><p className="mt-0.5 text-xs text-stone-500">Chọn phần kiến thức muốn ghi nhớ.</p></div>
    </div>
    <div className="space-y-4 p-4">
      <label className="block space-y-1.5 text-xs font-semibold text-stone-600">Chủ đề muốn ôn
        <input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={160} required disabled={disabled} className={fieldClass} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-xs font-semibold text-stone-600">Số thẻ
          <span className="relative block"><select value={count} onChange={(event) => setCount(Number(event.target.value))} disabled={disabled} className={`${fieldClass} appearance-none pr-9`}>
            {Array.from({ length: 10 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} thẻ</option>)}
          </select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" /></span>
        </label>
      </div>
      <label className="block space-y-1.5 text-xs font-semibold text-stone-600">Trọng tâm muốn nhớ <span className="font-normal text-stone-400">(không bắt buộc)</span>
        <input value={focus} onChange={(event) => setFocus(event.target.value)} maxLength={200} disabled={disabled} placeholder="Ví dụ: điều kiện dừng, độ phức tạp..." className={fieldClass} />
      </label>
      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-3">
        <button type="button" onClick={onCancel} disabled={disabled} className="rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50">Hủy</button>
        <button type="submit" disabled={disabled} className="rounded-xl bg-[#1E3F82] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#17316A] disabled:opacity-50">Tạo flashcard</button>
      </div>
    </div>
  </form>;
}

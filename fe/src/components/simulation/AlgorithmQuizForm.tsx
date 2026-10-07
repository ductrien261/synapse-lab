'use client';

import { useState } from 'react';
import { ChevronDown, QuestionCircle } from 'react-bootstrap-icons';
import type { AlgorithmQuizOptions } from '@/lib/algorithm-api';

interface Props {
  disabled: boolean;
  initialTopic: string;
  onSubmit: (options: AlgorithmQuizOptions) => void;
  onCancel: () => void;
}

const fieldClass = 'block w-full min-h-11 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none transition-colors focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10 disabled:opacity-50';
const selectClass = `${fieldClass} appearance-none pr-9`;

export function AlgorithmQuizForm({ disabled, initialTopic, onSubmit, onCancel }: Props) {
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState<AlgorithmQuizOptions['difficulty']>('medium');
  const [focus, setFocus] = useState<AlgorithmQuizOptions['focus']>('mixed');
  const [topic, setTopic] = useState(initialTopic);

  return <form
    onSubmit={event => { event.preventDefault(); onSubmit({ count, difficulty, focus, topic: topic.trim() }); }}
    className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_rgba(36,51,85,0.06)]"
    aria-label="Cấu hình bài trắc nghiệm"
  >
    <div className="flex items-start gap-3 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-white px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600"><QuestionCircle className="h-4 w-4" /></span>
      <div><h3 className="text-sm font-bold text-[#243355]">Tạo bài trắc nghiệm</h3><p className="mt-0.5 text-xs text-stone-500">Chọn nội dung và cách luyện tập.</p></div>
    </div>
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-xs font-semibold text-stone-600">Số câu hỏi
          <span className="relative block"><select value={count} onChange={event => setCount(Number(event.target.value))} disabled={disabled} className={selectClass}>
            {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} câu</option>)}
          </select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" /></span>
        </label>
        <label className="block space-y-1.5 text-xs font-semibold text-stone-600">Độ khó
          <span className="relative block"><select value={difficulty} onChange={event => setDifficulty(event.target.value as AlgorithmQuizOptions['difficulty'])} disabled={disabled} className={selectClass}>
            <option value="easy">Cơ bản</option><option value="medium">Vận dụng</option><option value="hard">Nâng cao</option>
          </select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" /></span>
        </label>
      </div>
      <label className="block space-y-1.5 text-xs font-semibold text-stone-600">Nội dung trọng tâm
        <span className="relative block"><select value={focus} onChange={event => setFocus(event.target.value as AlgorithmQuizOptions['focus'])} disabled={disabled} className={selectClass}>
          <option value="mixed">Tổng hợp cả bài</option>
          <option value="problem">Bài toán, đầu vào và đầu ra</option>
          <option value="principle">Ý tưởng và nguyên lý</option>
          <option value="trace">Theo dõi từng bước</option>
          <option value="complexity">Độ phức tạp và giới hạn</option>
          <option value="application">Ứng dụng và biến thể</option>
        </select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" /></span>
      </label>
      <label className="block space-y-1.5 text-xs font-semibold text-stone-600">Chủ đề cụ thể <span className="font-normal text-stone-400">(có thể đổi)</span>
        <input value={topic} onChange={event => setTopic(event.target.value)} maxLength={200} disabled={disabled} placeholder="Ví dụ: khi nào phải quay lui?" className={fieldClass} />
      </label>
      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-3">
        <button type="button" onClick={onCancel} disabled={disabled} className="rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50">Hủy</button>
        <button type="submit" disabled={disabled} className="rounded-xl bg-[#1E3F82] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#17316A] disabled:opacity-50">Tạo câu hỏi</button>
      </div>
    </div>
  </form>;
}

'use client';

import { useState } from 'react';
import type { TutorQuizStyle } from '@/lib/tutor';

const STYLES: { value: TutorQuizStyle; label: string }[] = [
  { value: 'theory', label: 'Lý thuyết' },
  { value: 'application', label: 'Tình huống thực tế' },
  { value: 'practice', label: 'Thực hành nhận diện' },
];

export function QuizSetup({ initialTopic, onCreate, onCancel }: {
  initialTopic: string;
  onCreate: (options: { topic: string; question_count: number; quiz_style: TutorQuizStyle }) => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [count, setCount] = useState(5);
  const [style, setStyle] = useState<TutorQuizStyle>('theory');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (topic.trim() && Number.isInteger(count) && count >= 1 && count <= 10) {
          onCreate({ topic: topic.trim(), question_count: count, quiz_style: style });
        }
      }}
      className="mx-4 mb-3 rounded-2xl border border-[#C5D5EE] bg-[#F7F9FD] p-3 shadow-sm"
    >
      <div className="mb-3 text-sm font-bold text-[#1E3F82]">Tạo bài tập trắc nghiệm</div>
      <label htmlFor="quiz-topic" className="mb-1 block text-xs font-semibold text-stone-600">Nội dung muốn ôn</label>
      <input id="quiz-topic" value={topic} maxLength={160} required onChange={(event) => setTopic(event.target.value)} className="mb-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800" />
      <label htmlFor="quiz-count" className="mb-1 block text-xs font-semibold text-stone-600">Số câu hỏi</label>
      <input id="quiz-count" type="number" min={1} max={10} step={1} value={count} required onChange={(event) => setCount(Number(event.target.value))} className="mb-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800" />
      <fieldset>
        <legend className="mb-1 text-xs font-semibold text-stone-600">Kiểu câu hỏi</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {STYLES.map((item) => (
            <label key={item.value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-semibold ${style === item.value ? 'border-[#1E3F82] bg-[#E8F0FB] text-[#1E3F82]' : 'border-stone-200 bg-white text-stone-600'}`}>
              <input type="radio" name="quiz-style" value={item.value} checked={style === item.value} onChange={() => setStyle(item.value)} className="sr-only" />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-2 text-xs text-stone-500">Câu hỏi được soạn từ tài liệu trong kho và kèm nguồn đối chiếu.</p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600">Hủy</button>
        <button type="submit" className="rounded-lg bg-[#1E3F82] px-3 py-2 text-xs font-semibold text-white">Tạo câu hỏi</button>
      </div>
    </form>
  );
}

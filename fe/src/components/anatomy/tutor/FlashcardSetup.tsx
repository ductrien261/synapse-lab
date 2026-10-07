'use client';

import { useState } from 'react';

export function FlashcardSetup({ initialTopic, onCreate, onCancel }: {
  initialTopic: string;
  onCreate: (options: { topic: string; card_count: number; focus_note: string }) => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [count, setCount] = useState(5);
  const [focus, setFocus] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (topic.trim() && Number.isInteger(count) && count >= 1 && count <= 10) {
          onCreate({ topic: topic.trim(), card_count: count, focus_note: focus.trim() });
        }
      }}
      className="mx-4 mb-3 rounded-2xl border border-[#C5D5EE] bg-[#F7F9FD] p-3 shadow-sm"
    >
      <div className="mb-3 text-sm font-bold text-[#1E3F82]">Tạo flashcard</div>
      <label htmlFor="flashcard-topic" className="mb-1 block text-xs font-semibold text-stone-600">Chủ đề muốn ôn</label>
      <input id="flashcard-topic" value={topic} maxLength={160} required onChange={(event) => setTopic(event.target.value)} className="mb-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800" />
      <label htmlFor="flashcard-count" className="mb-1 block text-xs font-semibold text-stone-600">Số thẻ</label>
      <input id="flashcard-count" type="number" min={1} max={10} step={1} value={count} required onChange={(event) => setCount(Number(event.target.value))} className="mb-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800" />
      <label htmlFor="flashcard-focus" className="mb-1 block text-xs font-semibold text-stone-600">Muốn tập trung ghi nhớ điều gì? (không bắt buộc)</label>
      <input id="flashcard-focus" value={focus} maxLength={200} onChange={(event) => setFocus(event.target.value)} placeholder="Ví dụ: vị trí, chức năng, đường đi của mạch..." className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400" />
      <p className="mt-2 text-xs text-stone-500">Chỉ tạo thẻ khi tìm được nội dung tương ứng trong kho tài liệu.</p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600">Hủy</button>
        <button type="submit" className="rounded-lg bg-[#1E3F82] px-3 py-2 text-xs font-semibold text-white">Tạo flashcard</button>
      </div>
    </form>
  );
}

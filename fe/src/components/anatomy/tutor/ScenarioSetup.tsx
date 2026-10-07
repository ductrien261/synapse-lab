'use client';

import { useState } from 'react';

export function ScenarioSetup({ initialTopic, onCreate, onCancel }: {
  initialTopic: string;
  onCreate: (options: { topic: string; style: 'clinic' | 'imaging' }) => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [style, setStyle] = useState<'clinic' | 'imaging'>('clinic');

  return (
    <form onSubmit={(event) => { event.preventDefault(); if (topic.trim()) onCreate({ topic: topic.trim(), style }); }} className="mx-4 mb-3 rounded-2xl border border-[#C5D5EE] bg-[#F7F9FD] p-3 shadow-sm">
      <div className="mb-3 text-sm font-bold text-[#1E3F82]">Bạn muốn luyện tình huống nào?</div>
      <label className="mb-1 block text-xs font-semibold text-stone-600" htmlFor="scenario-topic">Chủ đề</label>
      <input id="scenario-topic" value={topic} maxLength={160} required onChange={(event) => setTopic(event.target.value)} className="mb-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800" />
      <fieldset>
        <legend className="mb-1 text-xs font-semibold text-stone-600">Kiểu tình huống</legend>
        <div className="grid grid-cols-2 gap-2">
          {([{ value: 'clinic', label: 'Ca khám bệnh' }, { value: 'imaging', label: 'Quan sát mô hình 3D' }] as const).map((item) => (
            <label key={item.value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-semibold ${style === item.value ? 'border-[#1E3F82] bg-[#E8F0FB] text-[#1E3F82]' : 'border-stone-200 bg-white text-stone-600'}`}>
              <input type="radio" name="scenario-style" value={item.value} checked={style === item.value} onChange={() => setStyle(item.value)} className="sr-only" />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-2 text-xs text-stone-500">
        {style === 'clinic'
          ? 'Một ca giả định để vận dụng kiến thức giải phẫu; không suy đoán bệnh nếu tài liệu không nêu.'
          : 'Quan sát bộ phận đang học trên mô hình, rồi trả lời về vị trí, đường đi hoặc mối liên hệ của nó.'}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600">Hủy</button>
        <button type="submit" className="rounded-lg bg-[#1E3F82] px-3 py-2 text-xs font-semibold text-white">Tạo tình huống</button>
      </div>
    </form>
  );
}

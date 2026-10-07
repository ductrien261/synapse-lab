'use client';

import type { AlgorithmContentDto } from '@/lib/algorithm-api';

export function AlgorithmLessonOverview({ content }: { content: AlgorithmContentDto }) {
  const fields = content.lesson_fields ?? {};
  const summary = fields.summary || content.summary;
  return <div className="space-y-4">
    {summary && <section className="rounded-2xl border border-stone-200/90 bg-white px-5 py-4"><h2 className="text-sm font-bold text-[#243355]">Bài học này giải quyết điều gì?</h2><p className="mt-2 text-sm leading-7 text-stone-600">{summary}</p><p className="mt-3 text-xs leading-relaxed text-stone-400">Hiểu bài toán → Ý tưởng giải → Ví dụ & độ phức tạp → Đọc code → Chạy từng bước</p></section>}
    {fields.example && <section className="rounded-2xl border border-stone-200/90 bg-white px-5 py-4"><h2 className="text-sm font-bold text-[#243355]">Ví dụ</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-600">{fields.example}</p></section>}
  </div>;
}

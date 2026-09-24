'use client';

import { Robot, Send, Stars } from 'react-bootstrap-icons';
import { partName, type PartItem } from './types';

/**
 * Tab "Hỏi AI" — khung giao diện sẵn sàng.
 * Sẽ nối vào API hỏi đáp dựa trên giáo trình (RAG) ở giai đoạn sau.
 */
export function AskAiTab({ part, modelTitle }: { part: PartItem | null; modelTitle: string }) {
  const subject = part ? partName(part) : modelTitle;
  const suggestions = part
    ? [`${subject} có chức năng gì?`, `${subject} nằm ở đâu, liên quan với cấu trúc nào?`, `Bệnh lý thường gặp liên quan tới ${subject}?`]
    : [`Mô hình này mô tả điều gì?`, `Những bộ phận quan trọng cần nhớ trong mô hình?`];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col gap-4 p-5">
        <div className="rounded-2xl bg-gradient-to-br from-[#0F2258] to-[#1E3F82] text-white p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-bold">
              <Robot className="w-4 h-4" /> Trợ lý AI
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
              Sắp có
            </span>
          </div>
          <p className="text-xs text-white/75 mt-2 leading-relaxed">
            Hỏi bất cứ điều gì về {part ? `“${subject}”` : 'mô hình này'}. Câu trả lời sẽ trích dẫn trực tiếp từ giáo trình kèm số trang.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            <Stars className="w-3.5 h-3.5 text-amber-500" /> Câu hỏi gợi ý
          </div>
          <div className="flex flex-col gap-2">
            {suggestions.map((q) => (
              <div key={q} className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-500 bg-stone-50">
                {q}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-stone-100">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 pl-4 pr-1.5 py-1.5">
          <input
            disabled
            placeholder="Tính năng đang được phát triển..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400 cursor-not-allowed"
          />
          <button
            type="button"
            disabled
            aria-label="Gửi"
            className="w-9 h-9 rounded-xl bg-stone-300 text-white flex items-center justify-center cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

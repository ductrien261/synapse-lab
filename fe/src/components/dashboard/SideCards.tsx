'use client';

import Link from 'next/link';
import { PeopleFill, Robot, Stars } from 'react-bootstrap-icons';
import { TRACKS, type Track } from '@/lib/tracks';

export function ClassesCard() {
  return (
    <section className="relative overflow-hidden bg-white rounded-3xl border border-stone-200/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-[#E8F0FB] pointer-events-none" />
      <div className="relative">
        <span className="w-10 h-10 rounded-xl bg-[#1E3F82] text-white flex items-center justify-center shadow-md shadow-[#1E3F82]/20">
          <PeopleFill className="w-5 h-5" />
        </span>
        <h2 className="mt-3 text-base font-bold text-stone-900">Không gian</h2>
        <p className="text-sm text-stone-500 mt-1 leading-relaxed">
          Vào không gian bằng mã được chia sẻ để học, họp nhóm hay thuyết trình thử — hoặc tự tạo một không gian mới.
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/spaces"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold transition-colors"
          >
            Nhập mã
          </Link>
          <Link
            href="/spaces"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-200 hover:border-[#1E3F82]/40 text-stone-700 hover:text-[#1E3F82] text-sm font-bold transition-colors"
          >
            Tạo không gian
          </Link>
        </div>
      </div>
    </section>
  );
}

const AI_PROMPTS: Record<Track, string[]> = {
  cs: ['Vì sao Dijkstra không chạy đúng với cạnh âm?', 'So sánh quy hoạch động và chia để trị'],
  med: ['Vòng tuần hoàn nhỏ đi qua những cấu trúc nào?', 'Phân biệt động mạch và tĩnh mạch'],
};

/** Thẻ giới thiệu trợ lý AI — sẽ nối vào /api/ai/ask khi app ai ở backend sẵn sàng. */
export function AiTutorCard({ track }: { track: Track }) {
  return (
    <section className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#0F2258] to-[#1E3F82] text-white">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Robot className="w-5 h-5" />
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
            Sắp ra mắt
          </span>
        </div>
        <h2 className="mt-3 text-base font-bold flex items-center gap-1.5">
          Trợ lý AI <Stars className="w-3.5 h-3.5 text-amber-300" />
        </h2>
        <p className="text-sm text-white/75 mt-1 leading-relaxed">
          Hỏi đáp về {TRACKS[track].moduleLabel.toLowerCase()}, câu trả lời trích dẫn trực tiếp từ giáo trình.
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          {AI_PROMPTS[track].map((p) => (
            <div key={p} className="text-xs px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white/85">
              “{p}”
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

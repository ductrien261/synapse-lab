'use client';

import Link from 'next/link';
import { ArrowRight, ClockHistory } from 'react-bootstrap-icons';
import { TRACKS, type Track } from '@/lib/tracks';
import type { RecentItem } from '@/lib/recent';
import { timeAgo } from '@/lib/format';

interface Props {
  items: RecentItem[];
  track: Track;
}

export function RecentList({ items, track }: Props) {
  const config = TRACKS[track];

  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <ClockHistory className="w-4 h-4 text-[#1E3F82]" />
          Đã xem gần đây
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-[#F9FBFF] px-5 py-8 text-center">
          <p className="text-sm text-stone-600">Bạn chưa mở mục nào.</p>
          <Link
            href={config.moduleHref}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#1E3F82] hover:underline"
          >
            Bắt đầu với {config.moduleLabel} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {items.slice(0, 6).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-stone-100 hover:border-[#1E3F82]/30 hover:bg-[#F4F7FC] transition-all"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-stone-800 group-hover:text-[#1E3F82] truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5 truncate">
                    {item.subtitle} · {timeAgo(item.visitedAt)}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-[#1E3F82] shrink-0 transition-colors" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

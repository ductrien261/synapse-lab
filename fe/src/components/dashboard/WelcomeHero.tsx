'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowRight, ClockHistory, Search } from 'react-bootstrap-icons';
import { TRACKS, searchHref, type Track } from '@/lib/tracks';
import type { RecentItem } from '@/lib/recent';
import { timeAgo } from '@/lib/format';
import { useBodySystems } from '@/lib/anatomy-catalog';

interface Props {
  greetingName: string;
  track: Track;
  lastItem: RecentItem | null;
}

export function WelcomeHero({ greetingName, track, lastItem }: Props) {
  const router = useRouter();
  const config = TRACKS[track];
  const [query, setQuery] = useState('');
  const { systems } = useBodySystems();
  const quickLinks =
    track === 'med'
      ? systems.filter((s) => s.model_count > 0).slice(0, 6).map((s) => ({ label: s.name_vi, href: `/anatomy?system=${s.slug}` }))
      : config.quickTags.map((tag) => ({ label: tag, href: searchHref(track, tag) }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push(searchHref(track, query));
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F2258] via-[#163070] to-[#1E3F82] text-white p-6 md:p-8 shadow-sm">
      <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full bg-[#5B8FD8]/20 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_left,black,transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-80 h-80 rounded-full bg-[#E8F0FB]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
        {/* Lời chào + tìm kiếm */}
        <div className="flex flex-col gap-5 min-w-0">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold tracking-wider uppercase text-[#E8F0FB]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8FB6EE]" />
              {config.audience} · {config.moduleLabel}
            </span>
            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
              Chào {greetingName}! 👋
            </h1>
            <p className="mt-1.5 text-sm text-white/75 max-w-xl leading-relaxed">{config.tagline}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 bg-white rounded-2xl p-1.5 pl-4 shadow-lg shadow-black/10 max-w-2xl"
          >
            <Search className="w-4 h-4 text-stone-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={config.searchPlaceholder}
              aria-label={`Tìm trong ${config.moduleLabel}`}
              className="flex-1 min-w-0 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 outline-none py-2"
            />
            <button
              type="submit"
              className="shrink-0 px-4 py-2.5 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold transition-colors cursor-pointer"
            >
              Tìm kiếm
            </button>
          </form>

          {quickLinks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Tìm nhanh:</span>
            {quickLinks.map(({ label: tag, href }) => (
              <Link
                key={tag}
                href={href}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/90 hover:bg-white/20 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
          )}
        </div>

        {/* Thẻ học tiếp */}
        {lastItem ? (
          <Link
            href={lastItem.href}
            className="group rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-4 hover:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#E8F0FB]/80">
              <ClockHistory className="w-3.5 h-3.5" />
              Tiếp tục học · {timeAgo(lastItem.visitedAt)}
            </div>
            <div className="mt-2 font-bold leading-snug line-clamp-2">{lastItem.title}</div>
            <div className="text-xs text-white/65 mt-0.5">{lastItem.subtitle}</div>
            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#1E3F82] text-xs font-bold">
              Học tiếp
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ) : (
          <Link
            href={config.moduleHref}
            className="group rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-4 hover:bg-white/15 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#E8F0FB]/80">Bắt đầu</div>
            <div className="mt-2 font-bold leading-snug">
              Khám phá kho {config.moduleLabel.toLowerCase()}
            </div>
            <div className="text-xs text-white/65 mt-0.5">Chọn một mục bất kỳ để bắt đầu học.</div>
            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#1E3F82] text-xs font-bold">
              Mở {config.moduleLabel}
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}

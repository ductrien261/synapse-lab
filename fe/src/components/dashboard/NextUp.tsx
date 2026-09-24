'use client';

import Link from 'next/link';
import { ArrowRight, Lightbulb } from 'react-bootstrap-icons';
import type { RecentItem } from '@/lib/recent';
import { useAlgoCatalog } from '@/lib/algo-catalog';
import { categoryLabelVi } from '@/lib/algo-categories';
import { modelHref, modelTitle, useAnatomyModels, useBodySystems } from '@/lib/anatomy-catalog';
import type { Track } from '@/lib/tracks';

interface Suggestion {
  href: string;
  title: string;
  subtitle: string;
  reason: string;
  dot?: string;
  color?: string;
}

const MAX = 3;

export function NextUp({ track, recent }: { track: Track; recent: RecentItem[] }) {
  const { categories, state } = useAlgoCatalog();
  const { models, state: modelsState } = useAnatomyModels();
  const { systems } = useBodySystems();
  const visited = new Set(recent.map((r) => r.href));

  let suggestions: Suggestion[] = [];

  if (track === 'cs') {
    const lastGroup = recent[0]?.group;
    // Ưu tiên nhóm vừa học, rồi tới các nhóm khác; bỏ qua bài đã xem
    const ordered = [...categories].sort((a, b) => Number(b.key === lastGroup) - Number(a.key === lastGroup));
    for (const cat of ordered) {
      for (const algo of cat.algorithms ?? []) {
        const href = `/algorithms/${cat.key}/${algo.key}`;
        if (visited.has(href)) continue;
        suggestions.push({
          href,
          title: algo.name,
          subtitle: categoryLabelVi(cat.key, cat.name),
          reason: cat.key === lastGroup ? 'Cùng nhóm bạn vừa học' : 'Chưa khám phá',
        });
        if (suggestions.length >= MAX) break;
      }
      if (suggestions.length >= MAX) break;
    }
  } else {
    const lastGroup = recent[0]?.group;
    const systemName = new Map(systems.map((sys) => [sys.slug, sys]));
    suggestions = models
      .filter((m) => !visited.has(modelHref(m.sketchfab_uid)))
      .sort((x, y) => Number(y.system === lastGroup) - Number(x.system === lastGroup))
      .slice(0, MAX)
      .map((m) => {
        const sys = m.system ? systemName.get(m.system) : undefined;
        return {
          href: modelHref(m.sketchfab_uid),
          title: modelTitle(m),
          subtitle: sys?.name_vi ?? 'Giải phẫu 3D',
          reason: m.system && m.system === lastGroup ? 'Cùng hệ bạn vừa học' : 'Chưa khám phá',
          color: sys?.color,
        };
      });
  }

  const loading = track === 'cs' ? state === 'loading' : modelsState === 'loading';
  if (!loading && suggestions.length === 0) return null;

  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <h2 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        Gợi ý học tiếp
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        {loading
          ? [1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-stone-100 animate-pulse" />)
          : suggestions.map((s, idx) => (
              <Link
                key={s.href}
                href={s.href}
                className="group relative overflow-hidden flex flex-col gap-1 p-4 rounded-2xl border border-stone-100 bg-gradient-to-br from-white to-[#F7F9FD] hover:border-[#1E3F82]/30 hover:shadow-md hover:shadow-[#1E3F82]/5 transition-all"
              >
                <span className="absolute -right-2 -top-3 text-6xl font-extrabold text-[#1E3F82]/[0.05] select-none">
                  {idx + 1}
                </span>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#1E3F82]/70">{s.reason}</span>
                <span className="text-sm font-bold text-stone-900 group-hover:text-[#1E3F82] line-clamp-2 leading-snug">
                  {s.title}
                </span>
                <span className="text-xs text-stone-500 flex items-center gap-1.5 truncate">
                  {s.dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
                  {s.color && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />}
                  {s.subtitle}
                </span>
                <span className="mt-auto pt-2 inline-flex items-center gap-1 text-xs font-bold text-[#1E3F82]">
                  Bắt đầu <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}

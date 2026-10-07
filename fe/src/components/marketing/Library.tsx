'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Box, CodeSlash, Search } from 'react-bootstrap-icons';
import { modelHref, modelTitle, useAnatomyModels, useBodySystems } from '@/lib/anatomy-catalog';
import { Container } from './ui';
import { AlgorithmLibraryTab } from './AlgorithmLibraryTab';

type Tab = 'models' | 'algorithms';

const TABS: { key: Tab; label: string; icon: typeof Box }[] = [
  { key: 'models', label: 'Mô hình giải phẫu 3D', icon: Box },
  { key: 'algorithms', label: 'Giải thuật', icon: CodeSlash },
];

/** Kho học liệu: dùng thử ngay mô hình 3D và mô phỏng giải thuật đang có. */
export function Library({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  const change = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, '', next === 'models' ? '/library' : `/library?tab=${next}`);
  };

  return (
    <>
      <div className="sticky top-[72px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <Container>
          <div className="relative flex gap-8" role="tablist">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => change(key)}
                className={`relative flex items-center gap-2 py-4 text-[15px] font-semibold transition-colors ${
                  tab === key ? 'text-[#1E3F82]' : 'text-slate-500 hover:text-[#0F2258]'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
                <span
                  className={`absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-[#1E3F82] transition-transform duration-300 ${
                    tab === key ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            ))}
          </div>
        </Container>
      </div>
      <section className="bg-[#F4F7FC] py-12 md:py-16">
        <Container>{tab === 'models' ? <ModelsTab /> : <AlgorithmLibraryTab />}</Container>
      </section>
    </>
  );
}

function ModelsTab() {
  const { models, state } = useAnatomyModels();
  const { systems } = useBodySystems();
  const [system, setSystem] = useState('');
  const [query, setQuery] = useState('');
  const names = useMemo(() => new Map(systems.map((s) => [s.slug, s.name_vi])), [systems]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models
      .filter((m) => m.is_published)
      .filter((m) => !system || m.system === system)
      .filter((m) => !q || `${m.title} ${m.title_vi}`.toLowerCase().includes(q))
      .sort((a, b) => b.annotation_count - a.annotation_count);
  }, [models, system, query]);

  const chips = systems.filter((s) => s.model_count > 0);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Chip active={!system} onClick={() => setSystem('')}>
            Tất cả
          </Chip>
          {chips.map((s) => (
            <Chip key={s.slug} active={system === s.slug} onClick={() => setSystem(s.slug)}>
              {s.name_vi} <span className="opacity-60">{s.model_count}</span>
            </Chip>
          ))}
        </div>
        <label className="relative md:w-72">
          <span className="sr-only">Tìm mô hình</span>
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mô hình..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-[15px] focus:border-[#1E3F82] focus:outline-none focus:ring-2 focus:ring-[#1E3F82]/10"
          />
        </label>
      </div>

      {state === 'loading' ? (
        <Grid>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-white" />
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-500">
          {state === 'error' ? 'Chưa tải được thư viện mô hình. Vui lòng thử lại sau.' : 'Không có mô hình phù hợp.'}
        </p>
      ) : (
        <Grid>
          {items.map((m) => (
            <li key={m.sketchfab_uid}>
              <Link href={modelHref(m.sketchfab_uid)} className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(15,34,88,0.4)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {m.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.thumbnail_url} alt={modelTitle(m)} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  )}
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#1E3F82] opacity-0 shadow transition-opacity group-hover:opacity-100">
                    Mở mô hình <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
                <div className="p-4">
                  <p className="line-clamp-1 font-semibold text-[#0F2258]">{modelTitle(m)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {[m.system ? names.get(m.system) : '', m.annotation_count ? `${m.annotation_count} thành phần` : ''].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </Grid>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#1E3F82] hover:text-[#1E3F82]'
      }`}
    >
      {children}
    </button>
  );
}

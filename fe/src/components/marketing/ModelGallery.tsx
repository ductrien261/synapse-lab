'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { modelHref, modelTitle, useAnatomyModels, useBodySystems } from '@/lib/anatomy-catalog';

/** Thư viện mô hình thật (đã xuất bản) — bấm là mở trình xem đầy đủ, không cần tài khoản. */
export function ModelGallery({ limit = 6 }: { limit?: number }) {
  const { models, state } = useAnatomyModels();
  const { systems } = useBodySystems();
  const names = useMemo(() => new Map(systems.map((s) => [s.slug, s.name_vi])), [systems]);
  const items = useMemo(
    () =>
      models
        .filter((m) => m.is_published && m.thumbnail_url)
        .sort((a, b) => b.annotation_count - a.annotation_count)
        .slice(0, limit),
    [models, limit],
  );

  if (state === 'loading') {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: limit }, (_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-slate-500">Thư viện mô hình đang được cập nhật.</p>;
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((m) => (
        <li key={m.sketchfab_uid}>
          <Link href={modelHref(m.sketchfab_uid)} className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
            <div className="aspect-[4/3] overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.thumbnail_url} alt={modelTitle(m)} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
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
    </ul>
  );
}

/** Lưới 4 ảnh mô hình thật (minh họa cho phần phương pháp). */
export function ModelMosaic() {
  const { models } = useAnatomyModels();
  const items = models.filter((m) => m.is_published && m.thumbnail_url).slice(0, 4);
  return (
    <div className="grid grid-cols-2 gap-3">
      {(items.length ? items : Array.from({ length: 4 }, () => null)).map((m, i) =>
        m ? (
          <Link key={m.sketchfab_uid} href={modelHref(m.sketchfab_uid)} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.thumbnail_url} alt={modelTitle(m)} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2.5 pt-8 text-sm font-semibold text-white">
              {modelTitle(m)}
            </span>
          </Link>
        ) : (
          <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-100" />
        ),
      )}
    </div>
  );
}

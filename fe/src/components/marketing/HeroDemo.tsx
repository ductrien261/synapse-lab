'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Badge3dFill, PlayFill } from 'react-bootstrap-icons';
import { track } from '@/lib/analytics';
import { modelHref, modelTitle, useAnatomyModels, useBodySystems, type AnatomyModelSummary } from '@/lib/anatomy-catalog';

/** Chọn mô hình tiêu biểu: ưu tiên hệ tuần hoàn, nhiều chú thích nhất. */
function pickFeatured(models: AnatomyModelSummary[]): AnatomyModelSummary | null {
  const usable = models.filter((m) => m.is_published && m.thumbnail_url);
  if (usable.length === 0) return null;
  const score = (m: AnatomyModelSummary) => (m.system === 'cardiovascular' ? 1000 : 0) + m.annotation_count;
  return [...usable].sort((a, b) => score(b) - score(a))[0];
}

/** Trình xem 3D thật ngay trên trang: hiện ảnh trước, bấm mới tải mô hình (không làm chậm trang). */
export function HeroDemo() {
  const { models, state } = useAnatomyModels();
  const { systems } = useBodySystems();
  const featured = useMemo(() => pickFeatured(models), [models]);
  const [live, setLive] = useState(false);
  const systemName = systems.find((s) => s.slug === featured?.system)?.name_vi;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_-24px_rgba(15,34,88,0.35)]">
      <div className="relative aspect-[4/3] bg-[#0B1A44]">
        {featured && live ? (
          <iframe
            title={`Mô hình 3D: ${modelTitle(featured)}`}
            src={`${featured.embed_url}?autostart=1&ui_theme=dark&ui_infos=0&ui_watermark_link=0&ui_hint=2&dnt=1`}
            allow="autoplay; fullscreen; xr-spatial-tracking"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : featured ? (
          <button
            type="button"
            onClick={() => {
              setLive(true);
              track('hero_model_interacted');
            }}
            className="group absolute inset-0 h-full w-full cursor-pointer"
            aria-label={`Tương tác với mô hình ${modelTitle(featured)}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={featured.thumbnail_url} alt="" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-semibold text-[#0F2258] shadow-lg transition-transform group-hover:scale-105">
                <PlayFill className="h-5 w-5" /> Tương tác trực tiếp
              </span>
            </span>
          </button>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
            <Badge3dFill className="h-10 w-10" />
            <span className="text-sm">{state === 'loading' ? 'Đang tải mô hình...' : 'Mô hình 3D sẽ hiển thị tại đây'}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[#0F2258]">{featured ? modelTitle(featured) : 'Thư viện mô hình 3D'}</p>
          <p className="truncate text-sm text-slate-500">
            {featured
              ? [systemName, featured.annotation_count ? `${featured.annotation_count} thành phần có chú thích` : ''].filter(Boolean).join(' · ')
              : 'Giải phẫu học người'}
          </p>
        </div>
        <Link
          href={featured ? modelHref(featured.sketchfab_uid) : '/anatomy'}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-[#1E3F82] hover:border-[#1E3F82]"
        >
          Mở đầy đủ <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

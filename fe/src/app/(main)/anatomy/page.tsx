'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, HeartPulseFill, PinMapFill, Search } from 'react-bootstrap-icons';
import {
  anatomyApi,
  modelHref,
  modelTitle,
  useBodySystems,
  type AnatomyModelSummary,
  type BodySystem,
} from '@/lib/anatomy-catalog';
import { useUser } from '@/lib/user-context';

export default function AnatomyPage() {
  // useSearchParams cần Suspense bao ngoài
  return (
    <Suspense fallback={<GridSkeleton />}>
      <AnatomyBrowser />
    </Suspense>
  );
}

function AnatomyBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const systemSlug = params.get('system') ?? '';
  const initialQuery = params.get('q') ?? '';

  const { user } = useUser();
  const { systems, state: systemsState } = useBodySystems();
  const [search, setSearch] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery.trim());
  const queryKey = `${systemSlug}|${debounced}`;
  const [result, setResult] = useState<{ key: string; models: AnatomyModelSummary[]; error: string } | null>(null);
  const loading = result?.key !== queryKey;
  const models = result?.models ?? [];
  const error = result?.error ?? '';

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    anatomyApi
      .models({ system: systemSlug || undefined, search: debounced || undefined })
      .then((data) => {
        if (!cancelled) setResult({ key: queryKey, models: data, error: '' });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setResult({ key: queryKey, models: [], error: err instanceof Error ? err.message : 'Không tải được danh sách mô hình' });
      });
    return () => {
      cancelled = true;
    };
  }, [systemSlug, debounced, queryKey]);

  const systemsWithModels = systems.filter((s) => s.model_count > 0);
  const systemBySlug = useMemo(() => new Map(systems.map((s) => [s.slug, s])), [systems]);
  const activeSystem = systemSlug ? systemBySlug.get(systemSlug) : undefined;

  const setSystem = (slug: string) => {
    const next = new URLSearchParams(params.toString());
    if (slug) next.set('system', slug);
    else next.delete('system');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F2258] via-[#163070] to-[#1E3F82] text-white rounded-3xl p-7 shadow-sm">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_left,black,transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold tracking-wider uppercase text-[#E8F0FB] mb-3">
            <HeartPulseFill className="w-3 h-3" /> Giải phẫu 3D tương tác
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{activeSystem ? activeSystem.name_vi : 'Phòng Giải Phẫu 3D'}</h1>
          <p className="text-sm text-white/80 mt-2">
            {activeSystem
              ? `${activeSystem.name_en} · ${activeSystem.model_count} mô hình`
              : 'Xoay, phóng to mô hình 3D và bấm vào từng số để xem kiến thức về bộ phận đó.'}
          </p>
        </div>
      </section>

      {/* Tìm kiếm + lọc theo hệ */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên mô hình hoặc bộ phận (ví dụ: heart, tâm thất, aorta)..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10 transition-all"
          />
        </div>
        {systemsState === 'ready' && systemsWithModels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <SystemChip label="Tất cả" active={!systemSlug} onClick={() => setSystem('')} />
            {systemsWithModels.map((s) => (
              <SystemChip
                key={s.slug}
                label={s.name_vi}
                count={s.model_count}
                color={s.color}
                active={systemSlug === s.slug}
                onClick={() => setSystem(s.slug)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Danh sách */}
      {loading ? (
        <GridSkeleton />
      ) : error ? (
        <EmptyState title="Không tải được danh sách mô hình" description={error} />
      ) : models.length === 0 ? (
        debounced ? (
          <EmptyState title="Không tìm thấy mô hình phù hợp" description={`Không có mô hình nào khớp với “${debounced}”.`} />
        ) : (
          <EmptyState
            title="Chưa có mô hình nào được xuất bản"
            description={
              user?.role === 'admin'
                ? 'Vào trang quản trị để nhập mô hình từ Sketchfab / AnatomyTOOL rồi xuất bản.'
                : 'Nội dung đang được biên soạn, bạn quay lại sau nhé.'
            }
            action={user?.role === 'admin' ? { href: '/admin/anatomy', label: 'Mở trang quản trị' } : undefined}
          />
        )
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {models.map((m) => (
            <ModelCard key={m.id} model={m} system={m.system ? systemBySlug.get(m.system) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}

function SystemChip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
        active
          ? 'bg-[#1E3F82] border-[#1E3F82] text-white'
          : 'bg-white border-stone-200 text-stone-600 hover:border-[#1E3F82]/40 hover:text-[#1E3F82]'
      }`}
    >
      {color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      {count !== undefined && <span className={active ? 'text-white/70' : 'text-stone-400'}>{count}</span>}
    </button>
  );
}

function ModelCard({ model, system }: { model: AnatomyModelSummary; system?: BodySystem }) {
  return (
    <Link
      href={modelHref(model.sketchfab_uid)}
      className="group bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-[#1E3F82]/30 hover:shadow-lg hover:shadow-[#1E3F82]/5 transition-all flex flex-col"
    >
      <div className="relative aspect-[16/10] bg-stone-900 overflow-hidden">
        {model.thumbnail_url ? (
          // Ảnh từ Sketchfab (domain ngoài) nên dùng <img> thường
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.thumbnail_url}
            alt={modelTitle(model)}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40">
            <Box className="w-10 h-10" />
          </div>
        )}
        {system && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[11px] font-bold text-stone-800">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: system.color }} />
            {system.name_vi}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-bold text-stone-900 group-hover:text-[#1E3F82] line-clamp-2 leading-snug">
          {modelTitle(model)}
        </h3>
        {model.title_vi && <p className="text-xs text-stone-400 line-clamp-1">{model.title}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <PinMapFill className="w-3 h-3 text-[#1E3F82]" />
            {model.annotation_count > 0 ? `${model.annotation_count} bộ phận` : 'Xem mô hình'}
          </span>
          {model.author_name && <span className="truncate max-w-[55%]">© {model.author_name}</span>}
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-10 text-center">
      <p className="text-sm font-bold text-stone-800">{title}</p>
      <p className="text-sm text-stone-500 mt-1">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
      ))}
    </div>
  );
}

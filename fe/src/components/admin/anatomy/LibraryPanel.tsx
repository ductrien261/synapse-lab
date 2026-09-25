'use client';

import { useEffect, useMemo, useState } from 'react';
import { BoxArrowUpRight, CheckCircleFill, CloudDownload, Collection, Search } from 'react-bootstrap-icons';
import { adminAnatomyApi, type ImportJob, type LibraryItem } from '@/lib/admin-anatomy';
import type { BodySystem } from '@/lib/anatomy-catalog';

type Show = 'new' | 'imported' | 'all';
const PAGE = 48;

/**
 * Thư viện "3D models, games" của AnatomyTOOL (~500 mục): quét 1 lần, lọc/tìm, tick rồi nhập.
 * Hệ cơ quan lấy theo tên (tự đoán); sửa sau ở tab Mô hình nếu cần.
 */
export function LibraryPanel({
  active,
  reloadKey,
  systems,
  run,
}: {
  active: boolean;
  reloadKey: number;
  systems: BodySystem[];
  run: (fn: () => Promise<ImportJob>) => Promise<void>;
}) {
  const [data, setData] = useState<{ last_scanned_at: string | null; results: LibraryItem[] } | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [show, setShow] = useState<Show>('new');
  const [only3d, setOnly3d] = useState(true);
  const [systemFilter, setSystemFilter] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    adminAnatomyApi
      .library()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được thư viện');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const systemName = useMemo(() => new Map(systems.map((s) => [s.slug, s.name_vi])), [systems]);
  const items = useMemo(() => data?.results ?? [], [data]);

  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((i) => {
      if (show === 'new' && i.status !== 'new') return false;
      if (show === 'imported' && i.status !== 'imported') return false;
      if (only3d && !i.is_3d) return false;
      if (systemFilter === 'none' ? i.suggested_system : systemFilter && i.suggested_system !== systemFilter) return false;
      const title = i.title.toLowerCase();
      return words.every((w) => title.includes(w));
    });
  }, [items, query, show, only3d, systemFilter]);

  const counts = useMemo(
    () => ({
      new: items.filter((i) => i.status === 'new').length,
      imported: items.filter((i) => i.status === 'imported').length,
    }),
    [items],
  );

  const selectable = filtered.filter((i) => i.status !== 'imported');
  const allPicked = selectable.length > 0 && selectable.every((i) => picked.has(i.nid));
  const toggle = (nid: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(nid)) next.delete(nid);
      else next.add(nid);
      return next;
    });
  const toggleAll = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      selectable.forEach((i) => (allPicked ? next.delete(i.nid) : next.add(i.nid)));
      return next;
    });

  const startImport = () =>
    run(() => adminAnatomyApi.startImport({ items: [...picked].map((nid) => ({ nid, system: null })) })).then(() =>
      setPicked(new Set()),
    );

  const minutes = Math.max(1, Math.round((picked.size * 12) / 60));

  return (
    <section className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-stone-100">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Collection className="w-4 h-4 text-[#1E3F82]" /> Thư viện 3D AnatomyTOOL
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {data && data.results.length > 0
              ? `${data.results.length} mục · ${counts.imported} đã nhập · quét lúc ${new Date(data.last_scanned_at ?? '').toLocaleString('vi-VN')}`
              : 'Toàn bộ mô hình 3D trên AnatomyTOOL. Quét một lần (khoảng 2 phút) rồi tìm và tick mô hình cần lấy.'}
          </p>
        </div>
        <button
          type="button"
          disabled={active}
          onClick={() => void run(adminAnatomyApi.scanLibrary)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82] disabled:opacity-50 cursor-pointer"
        >
          <Search className="w-4 h-4" /> {items.length ? 'Quét lại thư viện' : 'Quét thư viện'}
        </button>
      </div>

      {error && <div className="mx-5 mt-4 rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div>}

      {data === null ? (
        <div className="p-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-stone-500">Chưa quét. Bấm “Quét thư viện” để lấy danh sách mô hình.</p>
      ) : (
        <>
          {/* Bộ lọc */}
          <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-stone-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(PAGE);
                }}
                placeholder="Tìm theo tên tiếng Anh: nerve, skull, knee, lung..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10"
              />
            </div>
            <select
              value={systemFilter}
              onChange={(e) => {
                setSystemFilter(e.target.value);
                setLimit(PAGE);
              }}
              className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm"
              aria-label="Lọc theo hệ đoán được"
            >
              <option value="">Mọi hệ</option>
              <option value="none">— Không đoán được hệ —</option>
              {systems.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name_vi}
                </option>
              ))}
            </select>
            <div className="inline-flex p-1 rounded-xl bg-stone-100 text-xs font-bold">
              {(
                [
                  ['new', `Chưa nhập (${counts.new})`],
                  ['imported', `Đã nhập (${counts.imported})`],
                  ['all', 'Tất cả'],
                ] as [Show, string][]
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setShow(v);
                    setLimit(PAGE);
                  }}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${show === v ? 'bg-white text-[#1E3F82] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 cursor-pointer">
              <input type="checkbox" checked={only3d} onChange={(e) => setOnly3d(e.target.checked)} className="w-4 h-4 accent-[#1E3F82]" />
              Chỉ mục có chữ “3D”
            </label>
          </div>

          <div className="flex items-center justify-between px-5 pt-3 text-xs text-stone-500">
            <span>{filtered.length} mục khớp</span>
            {selectable.length > 0 && (
              <button type="button" onClick={toggleAll} className="font-bold text-[#1E3F82] hover:underline cursor-pointer">
                {allPicked ? 'Bỏ chọn các mục đang lọc' : `Chọn ${selectable.length} mục đang lọc`}
              </button>
            )}
          </div>

          {/* Lưới */}
          <div className="p-5 pt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.slice(0, limit).map((i) => {
              const checked = picked.has(i.nid);
              const done = i.status === 'imported';
              return (
                <label
                  key={i.nid}
                  className={`group relative flex flex-col rounded-xl border overflow-hidden transition-colors ${
                    done ? 'border-stone-200 opacity-70' : checked ? 'border-[#1E3F82] ring-2 ring-[#1E3F82]/15 cursor-pointer' : 'border-stone-200 hover:border-[#1E3F82]/40 cursor-pointer'
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-stone-100">
                    {i.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.thumbnail_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                    {done ? (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold">
                        <CheckCircleFill className="w-3 h-3" /> Đã nhập
                      </span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(i.nid)}
                        className="absolute top-2 left-2 w-4 h-4 accent-[#1E3F82] cursor-pointer"
                        aria-label={`Chọn ${i.title}`}
                      />
                    )}
                    <a
                      href={i.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 p-1 rounded-md bg-white/85 text-stone-500 hover:text-[#1E3F82] opacity-0 group-hover:opacity-100"
                      aria-label="Mở trang AnatomyTOOL"
                    >
                      <BoxArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="p-2.5 flex flex-col gap-1">
                    <div className="text-xs font-semibold text-stone-800 leading-snug line-clamp-2" title={i.title}>
                      {i.title}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">
                      {i.status === 'no_model' ? (
                        <span className="text-amber-700">Không có mô hình Sketchfab</span>
                      ) : i.status === 'failed' ? (
                        <span className="text-rose-600" title={i.note}>
                          Lỗi lần trước — thử lại được
                        </span>
                      ) : i.suggested_system ? (
                        systemName.get(i.suggested_system)
                      ) : (
                        'Chưa đoán được hệ'
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          {filtered.length > limit && (
            <div className="pb-5 text-center">
              <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="text-sm font-bold text-[#1E3F82] hover:underline cursor-pointer">
                Xem thêm {Math.min(PAGE, filtered.length - limit)} mục
              </button>
            </div>
          )}

          {/* Thanh nhập */}
          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 px-5 py-3 border-t border-stone-100 bg-stone-50/95 backdrop-blur">
            {picked.size > 0 && (
              <span className="mr-auto text-xs text-stone-500">
                Đã chọn <b className="text-stone-800">{picked.size}</b> · khoảng {minutes} phút
              </span>
            )}
            <button
              type="button"
              disabled={active || picked.size === 0}
              onClick={() => void startImport()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              <CloudDownload className="w-4 h-4" /> Nhập {picked.size || ''} mô hình
            </button>
          </div>
        </>
      )}
    </section>
  );
}

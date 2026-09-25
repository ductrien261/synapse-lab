'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Box, EyeFill, EyeSlashFill, PencilSquare, Search, Trash3 } from 'react-bootstrap-icons';
import { adminAnatomyApi, type AdminModelRow } from '@/lib/admin-anatomy';
import { modelTitle, useBodySystems } from '@/lib/anatomy-catalog';
import { BatchSync } from './BatchSync';

type StatusFilter = '' | 'draft' | 'published';

export function ModelsTable({ reloadSignal }: { reloadSignal: number }) {
  const { systems } = useBodySystems();
  const systemBySlug = new Map(systems.map((s) => [s.slug, s]));

  const [status, setStatus] = useState<StatusFilter>('');
  const [system, setSystem] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; rows: AdminModelRow[]; error: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSystem, setBulkSystem] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const queryKey = `${status}|${system}|${debounced}|${refresh}|${reloadSignal}`;
  const loading = result?.key !== queryKey;
  const rows = result?.rows ?? [];

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    adminAnatomyApi
      .models({ status, system, search: debounced })
      .then((data) => {
        if (!cancelled) setResult({ key: queryKey, rows: data, error: '' });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key: queryKey, rows: [], error: err instanceof Error ? err.message : 'Lỗi tải dữ liệu' });
      });
    return () => {
      cancelled = true;
    };
  }, [status, system, debounced, queryKey]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.sketchfab_uid));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.sketchfab_uid)));
  const toggleOne = (uid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const bulk = async (action: 'publish' | 'unpublish' | 'set_system' | 'delete') => {
    setBusy(true);
    setNotice('');
    try {
      const { affected } = await adminAnatomyApi.bulk([...selected], action, action === 'set_system' ? bulkSystem || null : undefined);
      const label = { publish: 'xuất bản', unpublish: 'ẩn', set_system: 'gán hệ', delete: 'xóa' }[action];
      setNotice(`Đã ${label} ${affected} mô hình.`);
      setSelected(new Set());
      setConfirmDelete(false);
      setRefresh((n) => n + 1);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden">
      {/* Bộ lọc */}
      <div className="flex flex-col lg:flex-row gap-3 p-4 border-b border-stone-100">
        <div className="inline-flex p-1 rounded-xl bg-stone-100 text-xs font-bold self-start">
          {(
            [
              ['', 'Tất cả'],
              ['draft', 'Nháp'],
              ['published', 'Đã xuất bản'],
            ] as [StatusFilter, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setStatus(v)}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${status === v ? 'bg-white text-[#1E3F82] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm"
          aria-label="Lọc theo hệ cơ quan"
        >
          <option value="">Mọi hệ cơ quan</option>
          <option value="none">— Chưa gán hệ —</option>
          {systems.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name_vi}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mã Sketchfab..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82]"
          />
        </div>
      </div>

      {/* Thao tác hàng loạt */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-[#F4F7FC] border-b border-[#DDE6F5] text-sm">
          <span className="font-bold text-[#1E3F82] mr-2">Đã chọn {selected.size}</span>
          <BulkButton disabled={busy} onClick={() => void bulk('publish')}>
            <EyeFill className="w-3.5 h-3.5" /> Xuất bản
          </BulkButton>
          <BulkButton disabled={busy} onClick={() => void bulk('unpublish')}>
            <EyeSlashFill className="w-3.5 h-3.5" /> Ẩn
          </BulkButton>
          <span className="inline-flex items-center gap-1.5">
            <select
              value={bulkSystem}
              onChange={(e) => setBulkSystem(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
              aria-label="Hệ cơ quan để gán"
            >
              <option value="">— Bỏ gán hệ —</option>
              {systems.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name_vi}
                </option>
              ))}
            </select>
            <BulkButton disabled={busy} onClick={() => void bulk('set_system')}>
              Gán hệ
            </BulkButton>
          </span>
          <span className="flex-1" />
          <BulkButton disabled={busy} danger onClick={() => (confirmDelete ? void bulk('delete') : setConfirmDelete(true))}>
            <Trash3 className="w-3.5 h-3.5" /> {confirmDelete ? `Bấm lần nữa để xóa ${selected.size} mô hình` : 'Xóa'}
          </BulkButton>
        </div>
      )}
      {notice && <div className="px-4 py-2 text-sm text-emerald-700 bg-emerald-50 border-b border-emerald-100">{notice}</div>}

      {/* Đồng bộ chú thích hàng loạt */}
      <BatchSync
        models={rows.filter((r) => r.annotation_count === 0)}
        needDrafts={rows.filter((r) => r.annotation_count > 0 && r.filled_count < r.annotation_count).length}
        onDone={() => setRefresh((n) => n + 1)}
      />

      {/* Bảng */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">
              <th className="pl-4 py-3 w-8">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-[#1E3F82] cursor-pointer" aria-label="Chọn tất cả" />
              </th>
              <th className="px-3 py-3">Mô hình</th>
              <th className="px-3 py-3">Hệ cơ quan</th>
              <th className="px-3 py-3">Nội dung</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3 text-right pr-4"> </th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 &&
              [1, 2, 3].map((i) => (
                <tr key={i} className="border-t border-stone-100">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-10 rounded-lg bg-stone-100 animate-pulse" />
                  </td>
                </tr>
              ))}
            {!loading && result?.error && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-stone-500">{result.error}</td>
              </tr>
            )}
            {!loading && !result?.error && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                  Chưa có mô hình nào. Sang tab <b>Nhập dữ liệu</b> để lấy từ AnatomyTOOL.
                </td>
              </tr>
            )}
            {rows.map((m) => {
              const sys = m.system ? systemBySlug.get(m.system) : undefined;
              const pct = m.annotation_count ? Math.round((m.filled_count / m.annotation_count) * 100) : 0;
              return (
                <tr key={m.id} className={`border-t border-stone-100 ${selected.has(m.sketchfab_uid) ? 'bg-[#F9FBFF]' : ''} ${loading ? 'opacity-60' : ''}`}>
                  <td className="pl-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(m.sketchfab_uid)}
                      onChange={() => toggleOne(m.sketchfab_uid)}
                      className="w-4 h-4 accent-[#1E3F82] cursor-pointer"
                      aria-label={`Chọn ${modelTitle(m)}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/anatomy/models/${m.sketchfab_uid}`} className="flex items-center gap-3 group">
                      <span className="w-16 h-11 rounded-lg overflow-hidden bg-stone-900 shrink-0 flex items-center justify-center">
                        {m.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Box className="w-4 h-4 text-white/40" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-stone-900 group-hover:text-[#1E3F82] line-clamp-1">{modelTitle(m)}</span>
                        <span className="block text-xs text-stone-400 line-clamp-1">
                          {m.source_url.includes('anatomytool') ? 'AnatomyTOOL' : 'Sketchfab'} · {m.author_name || '—'}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {sys ? (
                      <span className="inline-flex items-center gap-1.5 text-stone-700">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sys.color }} />
                        {sys.name_vi}
                      </span>
                    ) : (
                      <span className="text-amber-600 text-xs font-semibold">Chưa gán</span>
                    )}
                  </td>
                  <td className="px-3 py-3 min-w-[130px]">
                    {m.annotation_count > 0 ? (
                      <div>
                        <div className="text-xs text-stone-600 mb-1">
                          {m.filled_count}/{m.annotation_count} bộ phận
                        </div>
                        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                          <div className="h-full bg-[#1E3F82]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400">Chưa quét chú thích</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ${
                        m.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {m.is_published ? 'Đã xuất bản' : 'Nháp'}
                    </span>
                  </td>
                  <td className="px-3 py-3 pr-4 text-right">
                    <Link
                      href={`/admin/anatomy/models/${m.sketchfab_uid}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82]"
                    >
                      <PencilSquare className="w-3.5 h-3.5" /> Soạn
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BulkButton({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold bg-white disabled:opacity-50 cursor-pointer ${
        danger ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-stone-200 text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82]'
      }`}
    >
      {children}
    </button>
  );
}

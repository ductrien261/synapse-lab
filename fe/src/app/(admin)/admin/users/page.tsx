'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, LockFill, Search, UnlockFill } from 'react-bootstrap-icons';
import { adminApi, type AdminUser, type AdminUserQuery, type Role } from '@/lib/api';
import { useUser } from '@/lib/user-context';
import { TRACKS } from '@/lib/tracks';
import { getInitials } from '@/lib/format';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { user: me } = useUser();

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<AdminUserQuery>({ page: 1 });
  const [data, setData] = useState<{ count: number; results: AdminUser[] } | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const queryKey = JSON.stringify(query);
  const loading = loadedKey !== queryKey;
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listUsers(query)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError('');
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được danh sách');
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(queryKey);
      });
    return () => {
      cancelled = true;
    };
  }, [query, queryKey]);

  // Tìm kiếm sau khi ngừng gõ 350ms
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery((q) => (q.search === search.trim() ? q : { ...q, search: search.trim(), page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const update = async (target: AdminUser, patch: Partial<Pick<AdminUser, 'role' | 'is_active'>>, doneText: string) => {
    setSavingId(target.id);
    setNotice(null);
    try {
      const updated = await adminApi.updateUser(target.id, patch);
      setData((d) => (d ? { ...d, results: d.results.map((u) => (u.id === updated.id ? updated : u)) } : d));
      setNotice({ type: 'ok', text: doneText });
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Không cập nhật được' });
    } finally {
      setSavingId(null);
    }
  };

  const page = query.page ?? 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <>
    <AdminPageHeader title="Người dùng" description="Tìm kiếm, cấp quyền quản trị, khóa hoặc mở khóa tài khoản." />
    <section className="bg-white rounded-3xl border border-stone-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* Bộ lọc */}
      <div className="p-5 flex flex-col md:flex-row gap-3 md:items-center border-b border-stone-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10"
          />
        </div>
        <FilterSelect
          value={query.role ?? ''}
          onChange={(v) => setQuery((q) => ({ ...q, role: v as Role | '', page: 1 }))}
          options={[
            ['', 'Mọi vai trò'],
            ['user', 'Thành viên'],
            ['admin', 'Quản trị viên'],
          ]}
        />
        <FilterSelect
          value={query.track ?? ''}
          onChange={(v) => setQuery((q) => ({ ...q, track: v as AdminUserQuery['track'], page: 1 }))}
          options={[
            ['', 'Mọi chuyên ngành'],
            ['cs', TRACKS.cs.label],
            ['med', TRACKS.med.label],
          ]}
        />
        <FilterSelect
          value={query.is_active ?? ''}
          onChange={(v) => setQuery((q) => ({ ...q, is_active: v as AdminUserQuery['is_active'], page: 1 }))}
          options={[
            ['', 'Mọi trạng thái'],
            ['true', 'Đang hoạt động'],
            ['false', 'Đã khóa'],
          ]}
        />
      </div>

      {notice && (
        <div
          className={`mx-5 mt-4 px-4 py-2.5 rounded-xl text-sm font-medium ${
            notice.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Bảng */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">
              <th className="px-5 py-3">Người dùng</th>
              <th className="px-5 py-3">Chuyên ngành</th>
              <th className="px-5 py-3">Vai trò</th>
              <th className="px-5 py-3">Trạng thái</th>
              <th className="px-5 py-3">Đăng nhập gần nhất</th>
              <th className="px-5 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data &&
              [1, 2, 3, 4].map((i) => (
                <tr key={i} className="border-t border-stone-100">
                  <td colSpan={6} className="px-5 py-4">
                    <div className="h-8 rounded-lg bg-stone-100 animate-pulse" />
                  </td>
                </tr>
              ))}

            {error && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-stone-500">{error}</td>
              </tr>
            )}

            {data?.results.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-stone-500">Không có người dùng phù hợp</td>
              </tr>
            )}

            {data?.results.map((u) => {
              const isMe = u.id === me?.id;
              const busy = savingId === u.id;
              return (
                <tr key={u.id} className={`border-t border-stone-100 ${busy ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1E3F82] to-[#5B8FD8] flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {getInitials(u.name || u.email)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-900 truncate">
                          {u.name || '—'} {isMe && <span className="text-xs font-medium text-stone-400">(bạn)</span>}
                        </div>
                        <div className="text-xs text-stone-500 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-stone-600">{u.track ? TRACKS[u.track].label : '—'}</td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      disabled={isMe || busy}
                      title={isMe ? 'Không thể tự đổi vai trò của mình' : undefined}
                      onChange={(e) => {
                        const role = e.target.value as Role;
                        void update(u, { role }, `Đã đổi ${u.email} thành ${role === 'admin' ? 'quản trị viên' : 'thành viên'}.`);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <option value="user">Thành viên</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                        u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {u.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-stone-500 whitespace-nowrap">
                    {u.last_login ? new Date(u.last_login).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      disabled={isMe || busy}
                      onClick={() =>
                        void update(
                          u,
                          { is_active: !u.is_active },
                          u.is_active ? `Đã khóa tài khoản ${u.email}.` : `Đã mở khóa tài khoản ${u.email}.`,
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                        u.is_active
                          ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {u.is_active ? <LockFill className="w-3 h-3" /> : <UnlockFill className="w-3 h-3" />}
                      {u.is_active ? 'Khóa' : 'Mở khóa'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {data && data.count > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 text-sm text-stone-500">
          <span>
            {data.count} người dùng · Trang {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <PageButton label="Trang trước" disabled={page <= 1} onClick={() => setQuery((q) => ({ ...q, page: page - 1 }))}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </PageButton>
            <PageButton label="Trang sau" disabled={page >= totalPages} onClick={() => setQuery((q) => ({ ...q, page: page + 1 }))}>
              <ChevronRight className="w-3.5 h-3.5" />
            </PageButton>
          </div>
        </div>
      )}
    </section>
    </>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-700 focus:outline-none focus:border-[#1E3F82] cursor-pointer"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center hover:border-[#1E3F82]/40 hover:text-[#1E3F82] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      {children}
    </button>
  );
}

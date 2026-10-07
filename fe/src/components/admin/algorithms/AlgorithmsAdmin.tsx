'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowClockwise, ArrowRight, Book, Box, JournalText, Search } from 'react-bootstrap-icons';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { algorithmApi, type AlgorithmCategory } from '@/lib/algorithm-api';
import { useUser } from '@/lib/user-context';
import { useDrafts } from './drafts';
import { SearchTester } from './SearchTester';
import { SourcesPanel } from './SourcesPanel';
import { LessonGroups } from './LessonGroups';

type Tab = 'catalog' | 'sources' | 'search';
const TABS = [
  { key: 'catalog', label: 'Kho thuật toán', icon: Box },
  { key: 'sources', label: 'Nhập dữ liệu', icon: Book },
  { key: 'search', label: 'Tạo từ liên kết', icon: Search },
] as const;

export function AlgorithmsAdmin() {
  const { user } = useUser();
  const [categories, setCategories] = useState<AlgorithmCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const { drafts, error: draftError } = useDrafts(user?.id ?? 'guest', reload);
  const [tab, setTab] = useState<Tab>('catalog');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    let cancelled = false;
    algorithmApi.categories(true).then((data) => {
      if (!cancelled) { setCategories(data); setError(''); }
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được danh mục thuật toán.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  const rows = categories.flatMap((group) => group.algorithms.map((algorithm) => ({ ...algorithm, group, path: `${group.key}/${algorithm.key}` })));
  const draftCount = rows.filter((row) => drafts[row.path] && drafts[row.path].status !== 'published').length;
  const publishedCount = rows.filter((row) => drafts[row.path]?.status === 'published').length;
  const filtered = rows.filter((row) => {
    const matchesSearch = `${row.name} ${row.key} ${drafts[row.path]?.title ?? ''} ${row.group.name}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'));
    const hasDraft = Boolean(drafts[row.path]);
    return matchesSearch && (!category || row.group.key === category)
      && (status === 'all' || (status === 'draft' && hasDraft && drafts[row.path].status !== 'published') || (status === 'published' && drafts[row.path]?.status === 'published'));
  });
  const groups = categories.map((group) => ({ ...group, algorithms: filtered.filter((row) => row.group.key === group.key) })).filter((group) => group.algorithms.length > 0);

  return <>
    <AdminPageHeader title="Thuật toán" description="Biên soạn bài học, đối chiếu giáo trình và chuẩn bị nội dung cho học viên." actions={<Link href="/algorithms" className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700">Xem kho học viên <ArrowRight /></Link>} />
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">{[
      { label: 'Tổng thuật toán', value: rows.length, tone: 'text-stone-900' },
      { label: 'Chưa biên soạn', value: rows.length - draftCount - publishedCount, tone: 'text-stone-500' },
      { label: 'Đang nháp', value: draftCount, tone: 'text-[#1E3F82]' },
      { label: 'Đã xuất bản', value: publishedCount, tone: 'text-emerald-600' },
    ].map(({ label, value, tone }) => <div key={label} className="bg-white rounded-2xl border border-stone-200/90 px-4 py-3"><div className={`text-2xl font-extrabold tabular-nums ${tone}`}>{loading ? <span className="inline-block w-8 h-6 rounded bg-stone-100 animate-pulse" /> : value}</div><div className="text-xs font-semibold text-stone-500 mt-0.5">{label}</div></div>)}</div>
    {draftError && <p role="alert" className="text-sm text-rose-600">Không tải được nội dung từ hệ thống: {draftError}</p>}
    <nav aria-label="Các mục quản trị thuật toán" className="flex flex-wrap gap-1 self-start rounded-2xl border border-stone-200/90 bg-white p-1">{TABS.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} onClick={() => { setTab(key); }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${tab === key ? 'bg-[#1E3F82] text-white' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
    {tab === 'sources' && <SourcesPanel />}
    {tab === 'search' && <SearchTester categories={categories} onImported={() => setReload((n) => n + 1)} />}
    {tab === 'catalog' && <section className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white">

      <div className="flex flex-col lg:flex-row gap-3 p-4 border-b border-stone-100">
        <div className="inline-flex p-1 rounded-xl bg-stone-100 text-xs font-bold self-start">
          {[['all', 'Tất cả'], ['draft', 'Nháp'], ['published', 'Đã xuất bản']].map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`px-3 py-1.5 rounded-lg cursor-pointer ${status === value ? 'bg-white text-[#1E3F82] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>{label}</button>)}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Lọc theo nhóm thuật toán" className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm">
          <option value="">Mọi nhóm thuật toán</option>
          {categories.map((group) => <option key={group.key} value={group.key}>{group.name}</option>)}
        </select>
        <label className="relative flex-1"><span className="sr-only">Tìm bài học</span><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc mã thuật toán..." className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82]" /></label>
        <button type="button" disabled={loading} aria-label="Làm mới danh mục" title="Làm mới danh mục" onClick={() => { setLoading(true); setReload((n) => n + 1); }} className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-[#1E3F82] disabled:opacity-50"><ArrowClockwise className={loading ? 'animate-spin' : ''} /></button>
      </div>
      {error ? <div role="alert" className="p-8 text-center text-sm text-rose-600">{error}<p className="mt-2 text-xs text-stone-500">Không thể tải danh mục. Vui lòng thử làm mới sau ít phút.</p></div> : loading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((n) => <div key={n} className="h-14 animate-pulse rounded-xl bg-stone-100" />)}</div> : filtered.length === 0 ? <div className="px-5 py-16 text-center"><JournalText className="mx-auto h-8 w-8 text-stone-300" /><p className="mt-3 text-sm font-semibold text-stone-700">{status === 'published' ? 'Chưa có dữ liệu bài học đã xuất bản' : 'Không tìm thấy bài học'}</p><p className="mt-1 text-xs text-stone-500">{status === 'published' ? 'Mở bài học và chọn Xuất bản để đưa nội dung vào danh sách này.' : 'Thử đổi từ khóa hoặc bộ lọc.'}</p></div> : <LessonGroups key={`${tab}:${search}:${category}:${status}`} groups={groups} drafts={drafts} initiallyExpanded={Boolean(search.trim() || category || status !== 'all')} />}
      {!loading && !error && filtered.length > 0 && <div className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500">{groups.length} nhóm · {filtered.length} bài học{filtered.length !== rows.length ? ` / ${rows.length} bài trong kho` : ''}</div>}
    </section>}
  </>;
}

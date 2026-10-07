"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowClockwise, ArrowUpRight, SearchHeart } from 'react-bootstrap-icons';
import {
  algorithmApi,
  MAX_ALGORITHM_SCAN_SOURCES,
  type AlgorithmImportSource,
  type MissingAlgorithmSuggestion,
} from '@/lib/algorithm-api';

export function SourcesPanel() {
  const [sources, setSources] = useState<AlgorithmImportSource[]>([]);
  const [sourceIds, setSourceIds] = useState<number[]>([]);
  const [results, setResults] = useState<MissingAlgorithmSuggestion[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    algorithmApi.importSources().then((data) => {
      if (!cancelled) setSources(data);
    }).catch((caught: unknown) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : 'Không tải được nguồn thuật toán.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleSource = (id: number) => {
    setResults([]);
    setWarnings([]);
    setScanned(false);
    setError('');
    setSourceIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_ALGORITHM_SCAN_SOURCES) {
        setError(`Mỗi lượt quét chọn tối đa ${MAX_ALGORITHM_SCAN_SOURCES} nguồn.`);
        return current;
      }
      return [...current, id];
    });
  };

  const scan = async () => {
    if (!sourceIds.length) return;
    setScanning(true);
    setError('');
    setResults([]);
    try {
      const data = await algorithmApi.discoverMissing(sourceIds);
      setResults(data.results);
      setWarnings(data.warnings);
      setScanned(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không quét được nguồn đã chọn.');
      setScanned(false);
    } finally {
      setScanning(false);
    }
  };

  return <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
    <aside className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white">
      <div className="border-b border-stone-100 px-5 py-4"><h2 className="font-bold text-stone-900">Nguồn đã duyệt</h2><p className="mt-1 text-sm text-stone-500">Chọn nguồn tài liệu CNTT muốn kiểm tra.</p></div>
      <div className="space-y-2 p-3">
        {sources.map((source) => <label key={source.id} className={`block cursor-pointer rounded-xl border p-3 ${sourceIds.includes(source.id) ? 'border-[#1E3F82]/30 bg-[#E8F0FB]' : 'border-transparent hover:bg-stone-50'}`}>
          <span className="flex gap-2"><input type="checkbox" checked={sourceIds.includes(source.id)} disabled={scanning} onChange={() => toggleSource(source.id)} className="mt-0.5 h-4 w-4 accent-[#1E3F82]" /><span><span className="block text-sm font-bold text-stone-800">{source.name}</span><span className="mt-1 block text-xs leading-relaxed text-stone-500">{source.description}</span></span></span>
          <span className="mt-2 flex flex-wrap gap-2 pl-6 text-[10px] text-stone-500"><span className="rounded bg-white px-1.5 py-0.5 uppercase">{source.source_type}</span>{source.license_name && <span>{source.license_name}</span>}</span>
        </label>)}
        {!loading && !sources.length && <p className="px-2 py-6 text-sm text-stone-500">Chưa có nguồn CNTT sẵn sàng.</p>}
        {loading && <p className="px-2 py-6 text-sm text-stone-500">Đang tải nguồn...</p>}
      </div>
      <div className="border-t border-stone-100 p-4"><Link href="/admin/documents" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E3F82]">Mở kho tài liệu <ArrowUpRight /></Link></div>
    </aside>

    <section className="min-w-0 overflow-hidden rounded-2xl border border-stone-200/90 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 p-5">
        <div><h2 className="font-bold text-stone-900">Tìm bài mới từ nguồn</h2><p className="mt-1 max-w-2xl text-sm text-stone-500">Quét tiêu đề mục của nguồn đã chọn và đối chiếu toàn bộ kho thuật toán. Bài đã có trong kho sẽ không xuất hiện trong kết quả.</p></div>
        <button type="button" disabled={loading || scanning || !sourceIds.length} onClick={() => void scan()} className="inline-flex items-center gap-2 rounded-xl bg-[#1E3F82] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{scanning ? <ArrowClockwise className="animate-spin" /> : <SearchHeart />} {scanning ? 'Đang quét...' : 'Quét nguồn'}</button>
      </div>
      {error && <p role="alert" className="m-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {warnings.map((warning) => <p key={warning} role="status" className="mx-5 mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{warning}</p>)}
      {scanned && <div className="border-b border-stone-100 px-5 py-4 text-sm text-stone-600">Tìm thấy <strong className="text-stone-900">{results.length}</strong> chủ đề chưa có trong kho. Đây là gợi ý theo tiêu đề nguồn để quản trị viên kiểm tra; chưa tạo hay xuất bản bài học.</div>}
      <div className="max-h-[580px] overflow-auto">
        {results.map((item) => <div key={`${item.source_id}-${item.name}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 last:border-0"><div><p className="font-semibold text-stone-900">{item.name}</p><p className="mt-1 text-xs text-stone-500">{item.source_name}{item.page ? ` · trang ${item.page}` : ''}</p></div>{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1E3F82] hover:underline">Xem nguồn <ArrowUpRight /></a>}</div>)}
        {!scanned && !scanning && !error && <p className="px-5 py-12 text-center text-sm text-stone-500">Chọn ít nhất một nguồn rồi nhấn Quét nguồn.</p>}
        {scanned && !results.length && <p className="px-5 py-12 text-center text-sm text-stone-500">Không thấy chủ đề mới từ các nguồn đã chọn.</p>}
      </div>
    </section>
  </div>;
}

'use client';

import {
  ArrowClockwise,
  BoxArrowUpRight,
  Check2Circle,
  ExclamationTriangle,
  Lightbulb,
  Link45deg,
  PlusCircle,
  SearchHeart,
} from 'react-bootstrap-icons';
import type { AlgorithmDiscoveredSource, AlgorithmSourcePreview, CandidateFieldStatus } from '@/lib/algorithm-api';

interface GapField {
  key: string;
  label: string;
  status: CandidateFieldStatus;
}

interface Props {
  algorithmName: string;
  fields: GapField[];
  sourceCount: number;
  url: string;
  licenseName: string;
  preview: AlgorithmSourcePreview | null;
  discovered: AlgorithmDiscoveredSource[];
  selectedUrls: string[];
  discovering: boolean;
  reading: boolean;
  rescanning: boolean;
  error: string;
  onUrlChange: (value: string) => void;
  onLicenseChange: (value: string) => void;
  onDiscover: () => void;
  onToggleDiscovered: (url: string) => void;
  onUseDiscovered: () => void;
  onRead: () => void;
  onRescan: () => void;
}

export function SourceGapSuggestion({
  algorithmName,
  fields,
  sourceCount,
  url,
  licenseName,
  preview,
  discovered,
  selectedUrls,
  discovering,
  reading,
  rescanning,
  error,
  onUrlChange,
  onLicenseChange,
  onDiscover,
  onToggleDiscovered,
  onUseDiscovered,
  onRead,
  onRescan,
}: Props) {
  const missing = fields.filter((field) => field.status === 'missing');
  const weak = fields.filter((field) => field.status === 'weak');
  const conflict = fields.filter((field) => field.status === 'conflict');
  return <section aria-labelledby="source-gap-title" className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Lightbulb /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 id="source-gap-title" className="font-bold text-stone-900">Hoàn thiện bài bằng nguồn khác</h4>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              {missing.length > 0 && <><strong>{missing.length}</strong> mục còn thiếu</>}
              {missing.length > 0 && (weak.length > 0 || conflict.length > 0) && ' · '}
              {weak.length > 0 && <><strong>{weak.length}</strong> mục mới có một phần</>}
              {conflict.length > 0 && (missing.length > 0 || weak.length > 0) && ' · '}
              {conflict.length > 0 && <><strong>{conflict.length}</strong> mục có thông tin mâu thuẫn</>}
              . AI sẽ đọc chung nguồn mới với {sourceCount} nguồn hiện tại và tạo một bản đề xuất mới.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800">
            <ExclamationTriangle /> Cần bổ sung nguồn
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {fields.map((field) => <span key={field.key} className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] text-stone-600">
            {field.label} · {field.status}
          </span>)}
        </div>

        <div className="mt-4 rounded-lg border border-[#C9D8EF] bg-white p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-stone-800"><SearchHeart className="text-[#1E3F82]" /> Tự động tìm nguồn phù hợp</div>
              <p className="mt-1 text-[11px] leading-4 text-stone-500">Hệ thống tìm tài liệu cho “{algorithmName}” theo đúng các mục còn thiếu, bỏ trang trùng và trang không đọc được.</p>
            </div>
            <button type="button" disabled={discovering || rescanning} onClick={onDiscover} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1E3F82] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
              {discovering ? <ArrowClockwise className="animate-spin" /> : <SearchHeart />} {discovering ? 'Đang tìm và kiểm tra...' : discovered.length ? 'Tìm lại nguồn khác' : 'Tìm nguồn giúp tôi'}
            </button>
          </div>

          {discovered.length > 0 && <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
            <p className="text-[11px] font-semibold text-stone-600">Chọn nguồn để AI đọc chung:</p>
            {discovered.map((source) => <label key={source.url} className={`block rounded-lg border p-3 ${selectedUrls.includes(source.url) ? 'border-[#1E3F82]/30 bg-[#F4F7FC]' : 'border-stone-200'} ${rescanning ? 'opacity-60' : 'cursor-pointer'}`}>
              <span className="flex items-start gap-2.5">
                <input type="checkbox" disabled={rescanning} checked={selectedUrls.includes(source.url)} onChange={() => onToggleDiscovered(source.url)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#1E3F82]" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-xs text-stone-800">{source.title}</span><span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{source.reason}</span></span>
                  <span className="mt-1 block text-[10px] text-stone-400">{source.allowed_domain}</span>
                  <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-stone-500">{source.excerpt}</span>
                </span>
                <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Mở nguồn ${source.title}`} onClick={(event) => event.stopPropagation()} className="shrink-0 text-[#1E3F82]"><BoxArrowUpRight /></a>
              </span>
            </label>)}
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-4 text-stone-500">Nguồn được chọn vẫn cần Ngân kiểm tra nội dung và giấy phép trước khi xuất bản.</p>
              <button type="button" disabled={!selectedUrls.length || rescanning} onClick={onUseDiscovered} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1E3F82] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                {rescanning ? <ArrowClockwise className="animate-spin" /> : <PlusCircle />} {rescanning ? 'Đang quét lại...' : `Dùng ${selectedUrls.length} nguồn & quét lại`}
              </button>
            </div>
          </div>}
        </div>

        <details className="mt-3 rounded-lg border border-amber-100 bg-white/70 px-3 py-2.5">
          <summary className="cursor-pointer text-xs font-semibold text-[#1E3F82]">Hoặc thêm một liên kết thủ công</summary>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (preview) onRescan();
            else onRead();
          }} className="mt-3 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2.5 focus-within:border-[#1E3F82] focus-within:ring-2 focus-within:ring-[#1E3F82]/10">
              <Link45deg className="shrink-0 text-stone-400" />
              <span className="sr-only">Liên kết nguồn bổ sung</span>
              <input
                type="url"
                required
                disabled={reading || rescanning}
                value={url}
                onChange={(event) => onUrlChange(event.target.value)}
                placeholder="Dán liên kết nguồn bổ sung..."
                className="w-full min-w-0 bg-transparent text-xs outline-none disabled:opacity-60"
              />
            </label>
            {!preview && <button type="submit" disabled={!url.trim() || reading || rescanning} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-[#1E3F82] ring-1 ring-inset ring-[#1E3F82]/20 disabled:opacity-50">
              {reading ? <ArrowClockwise className="animate-spin" /> : <Check2Circle />} {reading ? 'Đang kiểm tra...' : 'Kiểm tra nguồn'}
            </button>}
          </div>

          {preview && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Nguồn bổ sung đọc được</p>
                <p className="mt-1 truncate text-xs font-semibold text-stone-800">{preview.title}</p>
                <a href={preview.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-[#1E3F82] hover:underline">{preview.url} <BoxArrowUpRight /></a>
              </div>
              <label className="block lg:w-52">
                <span className="mb-1 block text-[10px] font-semibold text-stone-600">Giấy phép (nếu có)</span>
                <input value={licenseName} disabled={rescanning} onChange={(event) => onLicenseChange(event.target.value)} placeholder="VD: CC BY 4.0" className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs outline-none" />
              </label>
              <button type="submit" disabled={rescanning} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E3F82] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                {rescanning ? <ArrowClockwise className="animate-spin" /> : <PlusCircle />} {rescanning ? 'Đang quét lại...' : 'Gộp nguồn & quét lại'}
              </button>
            </div>
          </div>}
          </form>
        </details>

        {rescanning && <p role="status" className="mt-3 rounded-lg bg-[#E8F0FB] px-3 py-2 text-xs text-[#1E3F82]">Bản đề xuất cũ vẫn được giữ bên dưới. Hệ thống sẽ thay bằng kết quả mới sau khi đọc xong tất cả nguồn.</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      </div>
    </div>
  </section>;
}

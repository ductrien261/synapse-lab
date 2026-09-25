'use client';

import { useState } from 'react';
import { CheckCircleFill, ChevronDown, CloudDownload } from 'react-bootstrap-icons';
import { SCOPE_HINT, SCOPE_LABEL, SCOPES, type DocScope, type TocChapter } from '@/lib/admin-knowledge';

const SECONDS_PER_PAGE = 5; // ≥3 giây giãn cách + tạo vector

/**
 * Chọn chương / bài cần nạp từ mục lục sách OpenStax.
 * - Tick chương = chọn các bài học chính chưa nạp trong chương (bỏ qua câu hỏi ôn tập, thuật ngữ)
 * - Mở chương để chọn/bỏ từng bài; bài đã nạp có dấu ✓ (chọn lại = nạp lại)
 */
export function TocPicker({
  toc,
  ingested,
  defaultScope = 'med',
  busy,
  onSubmit,
}: {
  toc: TocChapter[];
  ingested: Set<string>;
  defaultScope?: DocScope;
  busy: boolean;
  /** trả về true nếu đã bắt đầu nạp -> xóa lựa chọn */
  onSubmit: (pages: string[], scope: DocScope) => Promise<boolean>;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<DocScope>(defaultScope);

  const togglePage = (slug: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const chapterTargets = (c: TocChapter) => c.pages.filter((p) => p.kind === 'content' && !ingested.has(p.slug)).map((p) => p.slug);

  const toggleChapter = (c: TocChapter) => {
    const targets = chapterTargets(c);
    const all = targets.length > 0 && targets.every((s) => picked.has(s));
    setPicked((prev) => {
      const next = new Set(prev);
      targets.forEach((s) => (all ? next.delete(s) : next.add(s)));
      return next;
    });
  };

  const toggleOpen = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const count = picked.size;
  const minutes = Math.max(1, Math.round((count * SECONDS_PER_PAGE) / 60));

  return (
    <div className="flex flex-col">
      <ul className="max-h-[480px] overflow-y-auto">
        {toc.map((c, i) => {
          const targets = chapterTargets(c);
          const pickedIn = c.pages.filter((p) => picked.has(p.slug)).length;
          const doneIn = c.pages.filter((p) => ingested.has(p.slug)).length;
          const contentTotal = c.pages.filter((p) => p.kind === 'content').length;
          const checked = targets.length > 0 && targets.every((s) => picked.has(s));
          const isOpen = open.has(c.key);
          const unitHeader = c.unit && c.unit !== toc[i - 1]?.unit ? c.unit : '';
          return (
            <li key={c.key}>
              {unitHeader && (
                <div className="px-5 pt-4 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-stone-400">{unitHeader}</div>
              )}
              <div className={`flex items-center gap-3 px-5 py-2.5 border-t border-stone-100 ${pickedIn ? 'bg-[#F4F7FC]' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  ref={(el) => {
                    if (el) el.indeterminate = !checked && pickedIn > 0;
                  }}
                  disabled={targets.length === 0}
                  onChange={() => toggleChapter(c)}
                  className="w-4 h-4 accent-[#1E3F82] cursor-pointer disabled:cursor-not-allowed"
                  aria-label={`Chọn ${c.title}`}
                />
                <button type="button" onClick={() => toggleOpen(c.key)} className="flex-1 flex items-center gap-2 text-left cursor-pointer min-w-0">
                  <span className="text-sm font-semibold text-stone-900 truncate">{c.title}</span>
                  <ChevronDown className={`w-3 h-3 shrink-0 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <span className="text-xs text-stone-500 shrink-0">
                  {doneIn > 0 && <span className="text-emerald-700 font-semibold">đã nạp {doneIn} · </span>}
                  {contentTotal} bài
                </span>
              </div>
              {isOpen && (
                <ul className="pb-2">
                  {c.pages.map((p) => (
                    <li key={p.slug}>
                      <label className="flex items-center gap-3 pl-12 pr-5 py-1.5 text-sm cursor-pointer hover:bg-stone-50">
                        <input
                          type="checkbox"
                          checked={picked.has(p.slug)}
                          onChange={() => togglePage(p.slug)}
                          className="w-3.5 h-3.5 accent-[#1E3F82]"
                        />
                        <span className={`flex-1 truncate ${p.kind === 'extra' ? 'text-stone-400' : 'text-stone-700'}`}>{p.title}</span>
                        {p.kind === 'extra' && <span className="text-[10.5px] text-stone-400">ôn tập / phụ</span>}
                        {ingested.has(p.slug) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircleFill className="w-3 h-3" /> đã nạp
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-stone-100 bg-stone-50/60">
        <span className="text-xs text-stone-500">
          {count > 0 ? (
            <>
              Đã chọn <b className="text-stone-800">{count}</b> bài · khoảng {minutes} phút
            </>
          ) : (
            'Tick chương (hoặc mở ra chọn từng bài) cần đưa vào kho.'
          )}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-stone-500" title={SCOPE_HINT[scope]}>
            Dùng cho
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as DocScope)}
              className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800"
              aria-label="Chuyên ngành"
            >
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || count === 0}
            onClick={() => {
              const pages = toc.flatMap((c) => c.pages.map((p) => p.slug)).filter((s) => picked.has(s));
              void onSubmit(pages, scope).then((ok) => ok && setPicked(new Set()));
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            <CloudDownload className="w-4 h-4" /> Nạp {count || ''} bài
          </button>
        </div>
      </div>
    </div>
  );
}

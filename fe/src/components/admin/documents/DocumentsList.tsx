'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRepeat,
  Book,
  BoxArrowUpRight,
  ChevronDown,
  FileEarmarkPdf,
  PlusLg,
  Trash,
} from 'react-bootstrap-icons';
import {
  adminKnowledgeApi,
  SCOPE_LABEL,
  type DocScope,
  type DocStatus,
  type IngestJob,
  type KnowledgeDocument,
  type KnowledgeDocumentDetail,
} from '@/lib/admin-knowledge';
import { TocPicker } from './TocPicker';

type StartJob = (fn: () => Promise<IngestJob>) => Promise<boolean>;

const STATUS: Record<DocStatus, { label: string; cls: string }> = {
  pending: { label: 'Chưa có nội dung', cls: 'bg-stone-100 text-stone-600' },
  processing: { label: 'Đang nạp', cls: 'bg-[#E8F0FB] text-[#1E3F82]' },
  ready: { label: 'Sẵn sàng', cls: 'bg-emerald-50 text-emerald-700' },
  failed: { label: 'Lỗi', cls: 'bg-rose-50 text-rose-700' },
};

export function DocumentsList({
  busy,
  startJob,
  reloadSignal,
  onChanged,
  onAdd,
}: {
  busy: boolean;
  startJob: StartJob;
  reloadSignal: number;
  onChanged: () => void;
  onAdd: () => void;
}) {
  const [docs, setDocs] = useState<KnowledgeDocument[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminKnowledgeApi
      .documents()
      .then((d) => {
        if (!cancelled) setDocs(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được danh sách');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadSignal]);

  if (error) return <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div>;

  if (docs === null) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-stone-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center">
        <p className="text-sm text-stone-600">Kho chưa có tài liệu nào.</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold cursor-pointer"
        >
          <PlusLg className="w-4 h-4" /> Thêm tài liệu
        </button>
      </div>
    );
  }

  return (
    <ul className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden">
      {docs.map((d) => {
        const isOpen = openId === d.id;
        const Icon = d.source_type === 'openstax' ? Book : FileEarmarkPdf;
        return (
          <li key={d.id} className="border-t first:border-t-0 border-stone-100">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : d.id)}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-left cursor-pointer hover:bg-stone-50 ${isOpen ? 'bg-[#F4F7FC]' : ''}`}
            >
              <span className="w-9 h-9 rounded-xl bg-[#E8F0FB] text-[#1E3F82] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-stone-900 truncate">{d.title}</span>
                  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${STATUS[d.status].cls}`}>{STATUS[d.status].label}</span>
                  <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{SCOPE_LABEL[d.scope]}</span>
                </div>
                <div className="text-xs text-stone-500 mt-0.5 truncate">
                  {d.source_type === 'openstax' ? `OpenStax · ${d.section_count} bài` : `PDF · ${d.page_count ?? '?'} trang`} ·{' '}
                  {d.chunk_count} đoạn{d.license_name && ` · ${d.license_name}`}
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <DocumentDetail
                id={d.id}
                busy={busy}
                startJob={startJob}
                reloadSignal={reloadSignal}
                onChanged={onChanged}
                onDeleted={() => {
                  setOpenId(null);
                  onChanged();
                }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function DocumentDetail({
  id,
  busy,
  startJob,
  reloadSignal,
  onChanged,
  onDeleted,
}: {
  id: string;
  busy: boolean;
  startJob: StartJob;
  reloadSignal: number;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [doc, setDoc] = useState<KnowledgeDocumentDetail | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [localReload, setLocalReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminKnowledgeApi
      .document(id)
      .then((d) => {
        if (!cancelled) setDoc(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được tài liệu');
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadSignal, localReload]);

  const act = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      setSelected(new Set());
      setLocalReload((n) => n + 1);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại');
    }
  };

  if (!doc) {
    return <div className="px-5 pb-4">{error ? <p className="text-sm text-rose-600">{error}</p> : <div className="h-20 rounded-xl bg-stone-100 animate-pulse" />}</div>;
  }

  const isOpenStax = doc.source_type === 'openstax';
  const allChecked = doc.sections.length > 0 && doc.sections.every((s) => selected.has(s.key));
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="px-5 pb-5 pt-2 bg-[#F4F7FC] flex flex-col gap-3">
      {doc.error_message && (
        <div className="rounded-xl bg-rose-50 text-rose-700 text-xs px-3 py-2">Lần nạp gần nhất báo lỗi: {doc.error_message}</div>
      )}
      {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</div>}

      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
        {doc.source_url && (
          <a href={doc.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1E3F82] hover:underline">
            Mở nguồn <BoxArrowUpRight className="w-3 h-3" />
          </a>
        )}
        {doc.original_filename && <span>File: {doc.original_filename}</span>}
        <label className="inline-flex items-center gap-1.5 ml-auto">
          Chuyên ngành
          <select
            value={doc.scope}
            onChange={(e) => void act(() => adminKnowledgeApi.updateDocument(doc.id, { scope: e.target.value as DocScope }))}
            className="px-2 py-1 rounded-lg border border-stone-200 bg-white text-xs"
          >
            {(Object.keys(SCOPE_LABEL) as DocScope[]).map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Các bài / mục đã nạp */}
      <div className="bg-white rounded-xl border border-stone-200/90 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-stone-100 text-xs">
          <input
            type="checkbox"
            checked={allChecked}
            disabled={doc.sections.length === 0}
            onChange={() => setSelected(allChecked ? new Set() : new Set(doc.sections.map((s) => s.key)))}
            className="w-3.5 h-3.5 accent-[#1E3F82]"
            aria-label="Chọn tất cả"
          />
          <span className="font-bold text-stone-700">{isOpenStax ? `${doc.sections.length} bài đã nạp` : 'Nội dung đã nạp'}</span>
          <div className="ml-auto flex gap-2">
            {isOpenStax && (
              <button
                type="button"
                disabled={busy || selected.size === 0}
                onClick={() => void startJob(() => adminKnowledgeApi.ingestOpenStax(doc.source_key, [...selected])).then((ok) => ok && setSelected(new Set()))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 font-bold text-stone-600 hover:text-[#1E3F82] disabled:opacity-40 cursor-pointer"
              >
                <ArrowRepeat className="w-3.5 h-3.5" /> Nạp lại
              </button>
            )}
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={() => void act(() => adminKnowledgeApi.removeSections(doc.id, [...selected]))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 font-bold text-stone-600 hover:text-rose-600 disabled:opacity-40 cursor-pointer"
            >
              <Trash className="w-3.5 h-3.5" /> Gỡ khỏi kho
            </button>
          </div>
        </div>
        {doc.sections.length === 0 ? (
          <p className="px-4 py-4 text-sm text-stone-500">Chưa có nội dung.</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {doc.sections.map((s) => (
              <li key={s.key} className="flex items-center gap-3 px-4 py-2 border-t first:border-t-0 border-stone-100 text-sm">
                <input type="checkbox" checked={selected.has(s.key)} onChange={() => toggle(s.key)} className="w-3.5 h-3.5 accent-[#1E3F82]" />
                <span className="flex-1 truncate text-stone-700">{s.title}</span>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-[#1E3F82]" aria-label="Mở trang">
                    <BoxArrowUpRight className="w-3 h-3" />
                  </a>
                )}
                <span className="text-xs text-stone-500 tabular-nums w-16 text-right">{s.chunks} đoạn</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isOpenStax && adding && doc.toc.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200/90 overflow-hidden">
          <TocPicker
            toc={doc.toc}
            ingested={new Set(doc.sections.map((s) => s.key))}
            defaultScope={doc.scope}
            busy={busy}
            onSubmit={(pages, scope) =>
              startJob(() => adminKnowledgeApi.ingestOpenStax(doc.source_key, pages, scope)).then((ok) => {
                if (ok) setAdding(false);
                return ok;
              })
            }
          />
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        {isOpenStax ? (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm font-bold text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82] cursor-pointer"
          >
            <PlusLg className="w-3.5 h-3.5" /> {adding ? 'Đóng mục lục' : 'Thêm chương'}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!confirmDelete) return setConfirmDelete(true);
            adminKnowledgeApi
              .deleteDocument(doc.id)
              .then(onDeleted)
              .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Không xóa được'));
          }}
          onBlur={() => setConfirmDelete(false)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-40 ${
            confirmDelete ? 'bg-rose-600 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:text-rose-600'
          }`}
        >
          <Trash className="w-3.5 h-3.5" /> {confirmDelete ? 'Bấm lần nữa để xóa hẳn' : 'Xóa tài liệu'}
        </button>
      </div>
    </div>
  );
}

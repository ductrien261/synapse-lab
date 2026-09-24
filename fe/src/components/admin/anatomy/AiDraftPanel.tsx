'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRepeat, CheckLg, ExclamationTriangleFill, Stars, XLg } from 'react-bootstrap-icons';
import { adminAnatomyApi, type AdminStructure, type DraftFields, type StructureDraft } from '@/lib/admin-anatomy';
import { DraftEditor, draftFields } from './DraftEditor';

/** Khung "AI viết nháp" cho 1 bộ phận trong trang soạn mô hình. */
export function AiDraftPanel({
  structure,
  onApplied,
  onDraftChange,
}: {
  structure: AdminStructure;
  /** đã duyệt -> nơi dùng tải lại nội dung bộ phận */
  onApplied: () => void;
  onDraftChange: (draft: StructureDraft | null) => void;
}) {
  const summary = structure.draft ?? null;
  const [draft, setDraft] = useState<StructureDraft | null>(null);
  const [fields, setFields] = useState<DraftFields | null>(null);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [working, setWorking] = useState<'' | 'writing' | 'approving'>('');
  const [error, setError] = useState('');

  // Có nháp (theo tóm tắt) -> tải nội dung đầy đủ
  const summaryId = summary?.id ?? null;
  useEffect(() => {
    if (summaryId === null) return;
    let cancelled = false;
    adminAnatomyApi
      .structureDraft(structure.id)
      .then((d) => {
        if (cancelled) return;
        setDraft(d);
        setFields(d ? draftFields(d) : null);
        setLoadedFor(structure.id);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [structure.id, summaryId]);

  const current = loadedFor === structure.id ? draft : null;
  const active = current && current.status !== 'applied' && current.status !== 'discarded' ? current : null;

  const write = async () => {
    setError('');
    setWorking('writing');
    try {
      const d = await adminAnatomyApi.writeDraft(structure.id);
      setDraft(d);
      setFields(draftFields(d));
      setLoadedFor(structure.id);
      onDraftChange(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI chưa viết được');
    } finally {
      setWorking('');
    }
  };

  const approve = async () => {
    if (!active || !fields) return;
    setError('');
    setWorking('approving');
    try {
      await adminAnatomyApi.approveDraft(active.id, fields);
      setDraft(null);
      onDraftChange(null);
      onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không duyệt được');
    } finally {
      setWorking('');
    }
  };

  const discard = async () => {
    if (!active) return;
    await adminAnatomyApi.discardDraft(active.id).catch(() => undefined);
    setDraft(null);
    onDraftChange(null);
  };

  if (working === 'writing') {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 px-4 py-3 flex items-center gap-3 text-sm text-violet-800">
        <span className="w-4 h-4 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
        AI đang tìm trong kho tài liệu và viết nháp… (khoảng 5–15 giây)
      </div>
    );
  }

  const errorBox = error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</div>;

  if (active?.status === 'pending' && fields) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50/30 p-4">
        <DraftEditor draft={active} fields={fields} onChange={setFields}>
          {errorBox}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={working !== ''}
              onClick={() => void approve()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              <CheckLg className="w-4 h-4" /> Duyệt & xuất bản
            </button>
            <button type="button" onClick={() => void write()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm font-bold text-stone-600 hover:text-[#1E3F82] cursor-pointer">
              <ArrowRepeat className="w-4 h-4" /> Viết lại
            </button>
            <button type="button" onClick={() => void discard()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-stone-500 hover:text-rose-600 cursor-pointer">
              <XLg className="w-3.5 h-3.5" /> Bỏ nháp
            </button>
          </div>
        </DraftEditor>
      </div>
    );
  }

  if (active && (active.status === 'no_source' || active.status === 'failed')) {
    const noSource = active.status === 'no_source';
    return (
      <div className={`rounded-2xl border px-4 py-3 flex flex-col gap-2 text-sm ${noSource ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
        <div className="flex items-start gap-2">
          <ExclamationTriangleFill className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {noSource ? 'Kho tài liệu chưa có đoạn nào về bộ phận này nên AI không viết (không tốn lượt AI). ' : `AI gặp lỗi: ${active.error} `}
            {noSource && (
              <Link href="/admin/documents" className="font-bold underline">
                Nạp thêm chương
              </Link>
            )}
          </span>
        </div>
        {errorBox}
        <button type="button" onClick={() => void write()} className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-current/20 font-bold cursor-pointer">
          <ArrowRepeat className="w-3.5 h-3.5" /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-violet-200 px-4 py-2.5">
        <span className="text-xs text-stone-500">AI có thể viết nháp từ kho tài liệu, kèm trích dẫn. Bạn duyệt trước khi học viên thấy.</span>
        <button
          type="button"
          onClick={() => void write()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
        >
          <Stars className="w-3.5 h-3.5" /> AI viết nháp
        </button>
      </div>
      {errorBox}
    </div>
  );
}

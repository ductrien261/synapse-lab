'use client';

import { useState } from 'react';
import { BoxArrowUpRight, ExclamationTriangleFill, Stars } from 'react-bootstrap-icons';
import type { DraftFields, StructureDraft } from '@/lib/admin-anatomy';

const FIELDS: { key: keyof DraftFields; label: string; rows: number }[] = [
  { key: 'definition', label: 'Định nghĩa / mô tả', rows: 3 },
  { key: 'function', label: 'Chức năng', rows: 3 },
  { key: 'clinical_note', label: 'Liên hệ lâm sàng', rows: 2 },
];

export function draftFields(d: StructureDraft): DraftFields {
  return { name_vi: d.name_vi, definition: d.definition, function: d.function, clinical_note: d.clinical_note };
}

/**
 * Nội dung bản nháp AI (sửa trực tiếp được) + danh sách nguồn trích dẫn.
 * Nút hành động do nơi dùng tự đặt (children).
 */
export function DraftEditor({
  draft,
  fields,
  onChange,
  showModels = false,
  children,
}: {
  draft: StructureDraft;
  fields: DraftFields;
  onChange: (fields: DraftFields) => void;
  showModels?: boolean;
  children?: React.ReactNode;
}) {
  const [openCite, setOpenCite] = useState<number | null>(null);
  const s = draft.structure;
  const replacing = Boolean(s.definition || s.function || s.clinical_note);

  const input = 'w-full px-3 py-2 rounded-xl border border-stone-200 text-sm leading-relaxed focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
          <Stars className="w-3 h-3" /> Nháp AI
        </span>
        <span className="text-sm font-bold text-stone-900">{s.name_en}</span>
        {s.latin_name && <span className="text-xs italic text-stone-500">{s.latin_name}</span>}
        {showModels && draft.models.length > 0 && (
          <span className="text-xs text-stone-500">· {draft.models.map((m) => m.title).join(', ')}</span>
        )}
      </div>

      {replacing && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 text-amber-800 text-xs px-3 py-2">
          <ExclamationTriangleFill className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Bộ phận này đã có nội dung; duyệt bản nháp sẽ thay nội dung cũ.
        </div>
      )}

      <label className="block">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Tên tiếng Việt</span>
        <input value={fields.name_vi} onChange={(e) => onChange({ ...fields, name_vi: e.target.value })} className={input} />
      </label>
      {FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">{f.label}</span>
          <textarea
            value={fields[f.key]}
            onChange={(e) => onChange({ ...fields, [f.key]: e.target.value })}
            rows={f.rows}
            placeholder="(tài liệu không đề cập)"
            className={`${input} resize-y`}
          />
        </label>
      ))}

      {draft.citations.length > 0 && (
        <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Nguồn</div>
          <ul className="flex flex-col gap-1">
            {draft.citations.map((c) => (
              <li key={c.n} className="text-xs text-stone-700">
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-[#1E3F82] shrink-0">[{c.n}]</span>
                  <button
                    type="button"
                    onClick={() => setOpenCite(openCite === c.n ? null : c.n)}
                    className="text-left hover:text-[#1E3F82] cursor-pointer flex-1"
                    title="Xem đoạn trích"
                  >
                    {c.heading || c.document_title}
                    {c.page_label && <span className="text-stone-400"> · {c.page_label}</span>}
                  </button>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-[#1E3F82] shrink-0" aria-label="Mở nguồn">
                      <BoxArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {openCite === c.n && (
                  <p className="mt-1 ml-6 p-2 rounded-lg bg-white border border-stone-200 text-stone-600 leading-relaxed">{c.excerpt}…</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {children}
    </div>
  );
}

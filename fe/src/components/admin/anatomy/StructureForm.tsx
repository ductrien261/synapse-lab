'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircleFill, ExclamationTriangleFill, Translate } from 'react-bootstrap-icons';
import { adminAnatomyApi, type AdminAnnotation, type AdminStructure } from '@/lib/admin-anatomy';
import { translateApi } from '@/lib/api';

type Fields = Pick<AdminStructure, 'name_vi' | 'latin_name' | 'definition' | 'function' | 'clinical_note' | 'status'>;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Form soạn nội dung cho một bộ phận. Nội dung thuộc về "cấu trúc" dùng chung,
 * nên sửa ở đây là sửa cho mọi mô hình có cùng cấu trúc. Tự lưu khi ngừng gõ.
 * Dùng key={structure.id} ở component cha để form nạp lại khi đổi bộ phận.
 */
export function StructureForm({
  annotation,
  latinSuggestions,
  onSaved,
}: {
  annotation: AdminAnnotation & { structure: AdminStructure };
  latinSuggestions: string[];
  onSaved: (structure: AdminStructure) => void;
}) {
  const s = annotation.structure;
  const [fields, setFields] = useState<Fields>({
    name_vi: s.name_vi,
    latin_name: s.latin_name,
    definition: s.definition,
    function: s.function,
    clinical_note: s.clinical_note,
    status: s.status,
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<Fields>>({});

  const flush = () => {
    const data = pending.current;
    pending.current = {};
    if (Object.keys(data).length === 0) return;
    setSaveState('saving');
    adminAnatomyApi
      .updateStructure(s.id, data)
      .then((updated) => {
        setSaveState('saved');
        onSaved(updated);
      })
      .catch(() => setSaveState('error'));
  };

  const change = (patch: Partial<Fields>, immediate = false) => {
    setFields((f) => ({ ...f, ...patch }));
    pending.current = { ...pending.current, ...patch };
    setSaveState('saving');
    if (timer.current) clearTimeout(timer.current);
    if (immediate) flush();
    else timer.current = setTimeout(flush, 900);
  };

  // Rời form (đổi bộ phận) mà còn thay đổi chưa gửi -> gửi luôn
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      const data = pending.current;
      if (Object.keys(data).length > 0) void adminAnatomyApi.updateStructure(s.id, data).then(onSaved).catch(() => undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const translateRaw = async () => {
    setTranslateError('');
    setTranslating(true);
    try {
      const { translated } = await translateApi.translate(annotation.raw_content, 'vi');
      change({ definition: fields.definition ? `${fields.definition}\n\n${translated}` : translated });
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Không dịch được');
    } finally {
      setTranslating(false);
    }
  };

  const shared = (s.model_count ?? 1) > 1;
  const listId = `latin-${s.id}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Trạng thái lưu + duyệt */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-stone-500 flex items-center gap-1.5 h-5">
          {saveState === 'saving' && 'Đang lưu...'}
          {saveState === 'saved' && (
            <>
              <CheckCircleFill className="w-3.5 h-3.5 text-emerald-500" /> Đã lưu
            </>
          )}
          {saveState === 'error' && <span className="text-rose-600">Chưa lưu được, kiểm tra kết nối.</span>}
        </div>
        <div className="inline-flex p-1 rounded-xl bg-stone-100 text-xs font-bold">
          <button
            type="button"
            onClick={() => change({ status: 'draft' }, true)}
            className={`px-3 py-1.5 rounded-lg cursor-pointer ${fields.status === 'draft' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
          >
            Nháp
          </button>
          <button
            type="button"
            onClick={() => change({ status: 'published' }, true)}
            className={`px-3 py-1.5 rounded-lg cursor-pointer ${fields.status === 'published' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-500'}`}
          >
            Đã duyệt
          </button>
        </div>
      </div>

      {shared && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-800">
          <ExclamationTriangleFill className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Cấu trúc “{s.name_en}” đang dùng chung cho {s.model_count} mô hình — sửa ở đây sẽ cập nhật cho tất cả.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên tiếng Việt">
          <input
            value={fields.name_vi}
            onChange={(e) => change({ name_vi: e.target.value })}
            placeholder="vd. Tâm thất trái"
            className={inputCls}
          />
        </Field>
        <Field label="Tên Latin (Terminologia Anatomica)">
          <input
            value={fields.latin_name}
            onChange={(e) => change({ latin_name: e.target.value })}
            list={listId}
            placeholder={latinSuggestions.length ? 'Chọn từ gợi ý hoặc gõ' : 'vd. Ventriculus sinister'}
            className={inputCls}
          />
          <datalist id={listId}>
            {latinSuggestions.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
      </div>

      {annotation.raw_content && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Mô tả gốc trên Sketchfab</span>
            <button
              type="button"
              onClick={() => void translateRaw()}
              disabled={translating}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-[11px] font-bold text-stone-600 hover:border-[#1E3F82]/40 hover:text-[#1E3F82] disabled:opacity-60 cursor-pointer"
            >
              <Translate className="w-3 h-3" /> {translating ? 'Đang dịch...' : 'Dịch và điền vào Định nghĩa'}
            </button>
          </div>
          <p className="text-sm text-stone-600 whitespace-pre-line">{annotation.raw_content}</p>
          {translateError && <p className="text-xs text-rose-600 mt-1">{translateError}</p>}
        </div>
      )}

      <Field label="Định nghĩa / mô tả">
        <textarea value={fields.definition} onChange={(e) => change({ definition: e.target.value })} rows={4} className={inputCls} />
      </Field>
      <Field label="Chức năng / sinh lý">
        <textarea value={fields.function} onChange={(e) => change({ function: e.target.value })} rows={3} className={inputCls} />
      </Field>
      <Field label="Liên hệ lâm sàng">
        <textarea value={fields.clinical_note} onChange={(e) => change({ clinical_note: e.target.value })} rows={3} className={inputCls} />
      </Field>
    </div>
  );
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm leading-relaxed focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

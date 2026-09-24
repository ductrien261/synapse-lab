'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircleFill, JournalText } from 'react-bootstrap-icons';
import { notesApi } from '@/lib/api';
import { partName, type PartItem } from './types';

const WHOLE = -1;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Ghi chú riêng của học viên: cho bộ phận đang chọn hoặc cho cả mô hình. Tự lưu khi ngừng gõ. */
export function NotesTab({
  modelUid,
  part,
  parts,
  onJump,
}: {
  modelUid: string;
  part: PartItem | null;
  parts: PartItem[];
  onJump: (index: number) => void;
}) {
  const [notes, setNotes] = useState<Map<number, string>>(new Map());
  const [loaded, setLoaded] = useState(false);
  // Người dùng bấm "Cả mô hình" khi đang ở bộ phận nào; chọn bộ phận khác thì tự quay về ghi chú bộ phận
  const [modelScopeAt, setModelScopeAt] = useState<number | null | undefined>(undefined);
  const scope: 'part' | 'model' = part && modelScopeAt !== part.index ? 'part' : 'model';
  const setScope = (next: 'part' | 'model') => setModelScopeAt(next === 'model' ? (part?.index ?? null) : undefined);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    notesApi
      .list('anatomy_model', modelUid)
      .then((list) => {
        if (!cancelled) setNotes(new Map(list.map((n) => [n.part_index, n.content])));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [modelUid]);

  const activeIndex = scope === 'part' && part ? part.index : WHOLE;
  const value = notes.get(activeIndex) ?? '';

  const onChange = (text: string) => {
    setNotes((prev) => new Map(prev).set(activeIndex, text));
    setSaveState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      notesApi
        .save({ kind: 'anatomy_model', object_key: modelUid, part_index: activeIndex, content: text })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 800);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const others = [...notes.entries()]
    .filter(([idx, text]) => idx !== activeIndex && text.trim())
    .sort(([a], [b]) => a - b);

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="inline-flex p-1 rounded-xl bg-stone-100 text-xs font-bold self-start">
        <ScopeButton active={scope === 'part'} disabled={!part} onClick={() => setScope('part')}>
          {part ? `Bộ phận (${part.index + 1})` : 'Bộ phận'}
        </ScopeButton>
        <ScopeButton active={scope === 'model'} onClick={() => setScope('model')}>
          Cả mô hình
        </ScopeButton>
      </div>

      <div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!loaded}
          rows={7}
          placeholder={
            scope === 'part' && part
              ? `Ghi chú của bạn về “${partName(part)}”...`
              : 'Ghi chú chung cho mô hình này...'
          }
          className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-sm leading-relaxed resize-y focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10 disabled:bg-stone-50"
        />
        <div className="mt-1.5 h-4 text-[11px] text-stone-400 flex items-center gap-1">
          {saveState === 'saving' && 'Đang lưu...'}
          {saveState === 'saved' && (
            <>
              <CheckCircleFill className="w-3 h-3 text-emerald-500" /> Đã lưu · chỉ mình bạn xem được
            </>
          )}
          {saveState === 'error' && <span className="text-rose-600">Chưa lưu được, kiểm tra kết nối.</span>}
        </div>
      </div>

      {others.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            <JournalText className="w-3.5 h-3.5" /> Ghi chú khác của bạn
          </div>
          <ul className="flex flex-col gap-1.5">
            {others.map(([idx, text]) => {
              const p = parts.find((x) => x.index === idx);
              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => (idx === WHOLE ? setScope('model') : onJump(idx))}
                    className="w-full text-left rounded-xl border border-stone-100 px-3 py-2 hover:border-[#1E3F82]/30 hover:bg-[#F4F7FC] transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-bold text-stone-700">
                      {idx === WHOLE ? 'Cả mô hình' : `(${idx + 1}) ${p ? partName(p) : ''}`}
                    </div>
                    <div className="text-xs text-stone-500 truncate">{text}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScopeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${
        active ? 'bg-white text-[#1E3F82] shadow-sm' : 'text-stone-500 hover:text-stone-800'
      }`}
    >
      {children}
    </button>
  );
}

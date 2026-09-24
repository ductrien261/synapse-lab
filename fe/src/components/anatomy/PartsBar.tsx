'use client';

import { partName, type PartItem } from './types';

/** Thanh ngang dưới khung 3D: bấm để chọn bộ phận. hideNames = đang làm thử thách, chỉ hiện số. */
export function PartsBar({
  parts,
  selected,
  onSelect,
  hideNames,
  loading,
}: {
  parts: PartItem[];
  selected: number | null;
  onSelect: (index: number) => void;
  hideNames?: boolean;
  loading?: boolean;
}) {
  if (loading && parts.length === 0) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-28 rounded-full bg-stone-100 animate-pulse" />
        ))}
      </div>
    );
  }
  if (parts.length === 0) {
    return <p className="text-sm text-stone-500">Mô hình này không có chú thích.</p>;
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]">
      {parts.map((p) => {
        const active = p.index === selected;
        return (
          <button
            key={p.index}
            type="button"
            onClick={() => onSelect(p.index)}
            title={hideNames ? undefined : partName(p)}
            className={`shrink-0 inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-sm transition-colors cursor-pointer ${
              active
                ? 'bg-[#1E3F82] border-[#1E3F82] text-white'
                : 'bg-white border-stone-200 text-stone-700 hover:border-[#1E3F82]/40'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                active ? 'bg-white text-[#1E3F82]' : 'bg-stone-100 text-stone-600'
              }`}
            >
              {p.index + 1}
            </span>
            {!hideNames && <span className="max-w-[160px] truncate font-medium">{partName(p)}</span>}
          </button>
        );
      })}
    </div>
  );
}

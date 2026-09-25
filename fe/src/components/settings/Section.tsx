import type { ReactNode } from 'react';

/** Khung một nhóm cài đặt: tiêu đề + các dòng (nhãn bên trái, điều khiển bên phải). */
export function SettingsSection({ title, description, children, tone = 'default' }: {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: 'default' | 'danger';
}) {
  return (
    <section className={`bg-white rounded-3xl border ${tone === 'danger' ? 'border-rose-200' : 'border-stone-200/90'}`}>
      <div className="px-6 pt-5 pb-3">
        <h2 className={`text-base font-bold ${tone === 'danger' ? 'text-rose-700' : 'text-stone-900'}`}>{title}</h2>
        {description && <p className="text-sm text-stone-500 mt-0.5">{description}</p>}
      </div>
      <div className="divide-y divide-stone-100">{children}</div>
    </section>
  );
}

export function SettingsRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="px-6 py-4 flex flex-col gap-2 md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-6 md:items-center">
      <div>
        <div className="text-sm font-semibold text-stone-800">{label}</div>
        {hint && <div className="text-xs text-stone-500 mt-0.5">{hint}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Nhóm nút chọn một (segmented). */
export function Segmented<T extends string>({ value, options, onChange, disabled }: {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={disabled}
          onClick={() => o.value !== value && onChange(o.value)}
          className={`px-3.5 py-2 rounded-xl border text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 ${
            o.value === value ? 'border-[#1E3F82] bg-[#E8F0FB] text-[#1E3F82]' : 'border-stone-200 text-stone-600 hover:border-[#1E3F82]/40'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

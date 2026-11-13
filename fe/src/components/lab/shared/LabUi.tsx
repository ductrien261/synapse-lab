'use client';

import type { ReactNode } from 'react';

export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-400">{k}</dt>
      <dd className="text-right font-semibold text-stone-700">{v}</dd>
    </div>
  );
}

export function Slider({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  decimals = 0,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  onChange: (v: number) => void;
}) {
  const shown = Number(value.toFixed(decimals));
  return (
    <label className="flex items-center gap-3 text-xs text-stone-500">
      <span className="w-16 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={shown} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-16 text-right font-semibold text-stone-700">
        {shown.toFixed(decimals)}
        {unit}
      </span>
    </label>
  );
}

export function Gauge({ label, value, limit, unit = 'N·m' }: { label: string; value: number; limit: number; unit?: string }) {
  const ratio = value / limit;
  const over = ratio > 1;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-stone-700">{label}</span>
        <span className={over ? 'font-bold text-red-700' : 'text-stone-500'}>
          {value.toFixed(2)} / {limit.toFixed(2)} {unit}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-stone-100">
        <div className={`h-2 rounded-full ${over ? 'bg-red-500' : ratio > 0.8 ? 'bg-amber-500' : 'bg-[#1E3F82]'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
    </div>
  );
}

export function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex gap-2 ${ok ? 'text-green-800' : 'text-stone-500'}`}>
      <span aria-hidden>{ok ? '✓' : '○'}</span>
      <span>{text}</span>
    </li>
  );
}

export function Card({ title, children, tone = 'plain' }: { title?: string; children: ReactNode; tone?: 'plain' | 'accent' }) {
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 ${tone === 'accent' ? 'border-[#1E3F82]/20 bg-[#EEF3FC]' : 'border-stone-200 bg-white'}`}>
      {title && <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">{title}</h2>}
      {children}
    </div>
  );
}

export function Notice({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <p className={`rounded-lg px-3 py-2 text-sm ${ok ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>{children}</p>;
}

export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-xl bg-[#1E3F82] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#163070] disabled:opacity-40">
      {children}
    </button>
  );
}

/** Ô nhập một con số kèm nút kiểm tra, dùng cho các bài tính toán. */
export function NumberGuess({ value, onChange, onCheck, placeholder }: { value: string; onChange: (v: string) => void; onCheck: () => void; placeholder: string }) {
  return (
    <div className="flex gap-2">
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm" />
      <button type="button" onClick={onCheck} className="rounded-lg bg-[#1E3F82] px-3 py-1.5 text-sm font-bold text-white">
        Kiểm tra
      </button>
    </div>
  );
}

/** Đọc số người học nhập, chấp nhận dấu phẩy thập phân. */
export function parseGuess(text: string): number | null {
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function closeTo(guess: number, expected: number, tolerance = 0.1): boolean {
  return Math.abs(guess - expected) / expected <= tolerance;
}

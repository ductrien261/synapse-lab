'use client';

import { useState } from 'react';

function ring(n: number) {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i !== j && ((i + 1) % n === j || (j + 1) % n === i) ? 1 : 0));
}

export function GraphInputEditor({ onApply, minVertices, maxVertices }: { minVertices: number; maxVertices: number; onApply: (matrix: number[][]) => void }) {
  const [count, setCount] = useState(String(Math.min(5, maxVertices)));
  const [matrix, setMatrix] = useState<number[][]>(() => ring(Math.min(5, maxVertices)));
  const [error, setError] = useState('');
  const changeCount = (value: string) => {
    setCount(value); setError('');
    const n = Number(value);
    if (Number.isInteger(n) && n >= minVertices && n <= maxVertices) setMatrix(ring(n));
  };
  const apply = () => {
    const n = Number(count);
    if (!Number.isInteger(n) || n < minVertices || n > maxVertices) { setError(`Nhập số đỉnh nguyên từ ${minVertices} đến ${maxVertices}.`); return; }
    onApply(matrix.map(row => [...row]));
    setError('');
  };
  return <div className="border-b border-stone-100 bg-stone-50/60 px-5 py-4">
    <div className="flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-stone-600">Số đỉnh<input type="number" min={minVertices} max={maxVertices} step={1} value={count} onChange={event => changeCount(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); apply(); } }} className="mt-2 block w-24 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" /></label><button type="button" onClick={apply} className="rounded-xl bg-[#1E3F82] px-4 py-2.5 text-xs font-bold text-white">Áp dụng & chạy lại</button></div>
    <fieldset className="mt-4"><legend className="text-xs font-semibold text-stone-600">Chọn cạnh nối giữa các đỉnh</legend><div className="mt-2 flex flex-wrap gap-2">{matrix.flatMap((row, i) => row.map((value, j) => j > i ? <label key={`${i}-${j}`} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${value ? 'border-[#1E3F82]/20 bg-[#E8F0FB] text-[#1E3F82]' : 'border-stone-200 bg-white text-stone-500'}`}><input type="checkbox" checked={value === 1} onChange={() => setMatrix(old => old.map((r, a) => r.map((v, b) => (a === i && b === j) || (a === j && b === i) ? 1 - v : v)))} />{i} — {j}</label> : null))}</div></fieldset>
    <p className="mt-3 text-[11px] leading-5 text-stone-500">Đồ thị vô hướng, bắt đầu ở đỉnh 0. Thay đổi chỉ có hiệu lực khi nhấn Áp dụng.</p>
    {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
  </div>;
}

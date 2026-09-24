'use client';

import { useState } from 'react';
import { formatTokens, formatUsd, type AiDaily } from '@/lib/ai';

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function shortNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}k`;
  return String(n);
}

/** Cột token theo ngày (vào + ra). Rê chuột lên cột để xem chi tiết. */
export function UsageChart({ data }: { data: AiDaily[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const values = data.map((d) => d.input_tokens + d.output_tokens);
  const max = niceMax(Math.max(0, ...values));
  const ticks = [max, max / 2, 0];
  const showEvery = data.length > 14 ? Math.ceil(data.length / 10) : 1;
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* trục y */}
        <div className="flex flex-col justify-between h-44 pb-5 text-[10.5px] text-stone-400 tabular-nums text-right w-9 shrink-0">
          {ticks.map((t) => (
            <span key={t}>{shortNumber(t)}</span>
          ))}
        </div>
        <div className="relative flex-1 h-44">
          {/* lưới */}
          <div className="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between pointer-events-none">
            {ticks.map((t) => (
              <div key={t} className={`border-t ${t === 0 ? 'border-stone-300' : 'border-stone-100'}`} />
            ))}
          </div>
          {/* cột */}
          <div className="absolute inset-x-0 top-0 bottom-5 flex items-end">
            {data.map((d, i) => {
              const v = values[i];
              const pct = (v / max) * 100;
              return (
                <div
                  key={d.date}
                  className="flex-1 h-full flex items-end justify-center px-[1px] cursor-default"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div
                    className={`w-full max-w-7 rounded-t-[4px] transition-colors ${hover === i ? 'bg-[#163070]' : 'bg-[#1E3F82]'}`}
                    style={{ height: v > 0 ? `max(${pct}%, 2px)` : 0 }}
                  />
                </div>
              );
            })}
          </div>
          {/* nhãn ngày */}
          <div className="absolute inset-x-0 bottom-0 h-5 flex">
            {data.map((d, i) => (
              <div key={d.date} className="flex-1 text-center text-[10.5px] text-stone-400 tabular-nums">
                {i % showEvery === 0 ? d.date.slice(8, 10) + '/' + d.date.slice(5, 7) : ''}
              </div>
            ))}
          </div>

          {h && hover !== null && (
            <div
              className="absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-white border border-stone-200 shadow-lg px-3 py-2 text-xs text-stone-700 whitespace-nowrap pointer-events-none"
              style={{ left: `${Math.min(88, Math.max(12, ((hover + 0.5) / data.length) * 100))}%` }}
            >
              <div className="font-bold text-stone-900">{new Date(h.date).toLocaleDateString('vi-VN')}</div>
              <div>{formatTokens(h.input_tokens + h.output_tokens)} token ({formatTokens(h.input_tokens)} vào · {formatTokens(h.output_tokens)} ra)</div>
              <div>
                {h.requests} lượt · {formatUsd(h.cost_usd)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

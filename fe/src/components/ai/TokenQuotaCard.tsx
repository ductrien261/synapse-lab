'use client';

import { Lightning } from 'react-bootstrap-icons';
import { formatTokens, useAiQuota, type AiQuota } from '@/lib/ai';

function tone(q: AiQuota) {
  const ratio = q.limit > 0 ? q.used / q.limit : 1;
  if (ratio >= 1) return { bar: 'bg-rose-500', text: 'text-rose-600' };
  if (ratio >= 0.8) return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-gradient-to-r from-[#1E3F82] to-[#5B8FD8]', text: 'text-[#1E3F82]' };
}

/** Thanh token AI trong ngày: dùng tới đâu trừ tới đó, 0h làm mới. */
export function TokenQuotaCard({ compact = false, bare = false }: { compact?: boolean; bare?: boolean }) {
  const quota = useAiQuota();

  if (!quota) {
    return <div className={`${compact ? 'h-10' : bare ? 'h-14' : 'h-28'} rounded-2xl bg-stone-100 animate-pulse`} />;
  }

  if (quota.unlimited) {
    if (bare) return <p className="text-sm text-stone-600">Quản trị viên không bị giới hạn · đã dùng {formatTokens(quota.used)} token hôm nay.</p>;
    return compact ? null : (
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <Lightning className="w-4 h-4 text-amber-500" /> Token AI hôm nay
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          Quản trị viên không bị giới hạn. Đã dùng {formatTokens(quota.used)} token hôm nay.
        </p>
      </section>
    );
  }

  const pct = quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 100;
  const t = tone(quota);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-stone-500" title="Token AI còn lại hôm nay (làm mới lúc 0h)">
        <Lightning className={`w-3.5 h-3.5 ${t.text}`} />
        <div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${100 - pct}%` }} />
        </div>
        <span className="tabular-nums">còn {formatTokens(quota.remaining)}</span>
      </div>
    );
  }

  if (bare) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-stone-600">
            Đã dùng <b className="text-stone-800 tabular-nums">{formatTokens(quota.used)}</b> / {formatTokens(quota.limit)}
          </span>
          <span className={`font-bold tabular-nums ${t.text}`}>còn {formatTokens(quota.remaining)}</span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-stone-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full transition-[width] duration-700 ${t.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-stone-500">Làm mới lúc 0h mỗi ngày. Câu trả lời có sẵn trong bộ nhớ đệm không tốn token.</p>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Lightning className={`w-4 h-4 ${t.text}`} /> Token AI hôm nay
          </h2>
          <p className="text-sm text-stone-500 mt-1">Làm mới lúc 0h mỗi ngày.</p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-extrabold tabular-nums ${t.text}`}>{formatTokens(quota.remaining)}</div>
          <div className="text-xs text-stone-500">còn lại / {formatTokens(quota.limit)}</div>
        </div>
      </div>
      <div className="mt-4 h-3 rounded-full bg-stone-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-[width] duration-700 ${t.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-stone-500">
        <span>Đã dùng {formatTokens(quota.used)} ({pct}%)</span>
        <span>Câu trả lời có sẵn trong bộ nhớ đệm không tốn token</span>
      </div>
    </section>
  );
}

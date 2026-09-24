'use client';

import { Fragment, useEffect, useState } from 'react';
import { BoxArrowUpRight, ChevronDown } from 'react-bootstrap-icons';
import { adminAiApi, FEATURE_LABEL, formatTokens, formatUsd, type AiRequestRow } from '@/lib/ai';

const STATUS: Record<AiRequestRow['status'], { label: string; cls: string }> = {
  ok: { label: 'Thành công', cls: 'bg-emerald-50 text-emerald-700' },
  cached: { label: 'Cache', cls: 'bg-sky-50 text-sky-700' },
  error: { label: 'Lỗi', cls: 'bg-rose-50 text-rose-700' },
  quota: { label: 'Hết lượt', cls: 'bg-amber-50 text-amber-700' },
};

/** Nhật ký từng lượt dùng AI, mở ra xem từng lần gọi model + link trace Langfuse. */
export function RequestLog() {
  const [feature, setFeature] = useState('');
  const [status, setStatus] = useState('');
  const [user, setUser] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ count: number; page_size: number; results: AiRequestRow[] } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminAiApi
      .requests({ feature, status, user: userQuery, page })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được nhật ký');
      });
    return () => {
      cancelled = true;
    };
  }, [feature, status, userQuery, page]);

  const pages = data ? Math.max(1, Math.ceil(data.count / data.page_size)) : 1;
  const field = 'px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={feature} onChange={(e) => { setFeature(e.target.value); setPage(1); }} className={field} aria-label="Tính năng">
          <option value="">Mọi tính năng</option>
          {Object.entries(FEATURE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={field} aria-label="Trạng thái">
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setUserQuery(user.trim());
            setPage(1);
          }}
        >
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Tìm theo email / tên" className={field} />
        </form>
        {data && <span className="ml-auto text-xs text-stone-500">{formatTokens(data.count)} lượt</span>}
      </div>

      {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div>}

      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="text-[11px] uppercase tracking-wider text-stone-500 bg-stone-50/60">
            <tr>
              <th className="text-left font-bold px-4 py-2.5">Thời gian</th>
              <th className="text-left font-bold px-3 py-2.5">Người dùng</th>
              <th className="text-left font-bold px-3 py-2.5">Tính năng</th>
              <th className="text-left font-bold px-3 py-2.5">Trạng thái</th>
              <th className="text-right font-bold px-3 py-2.5">Token vào/ra</th>
              <th className="text-right font-bold px-3 py-2.5">Chi phí</th>
              <th className="text-right font-bold px-3 py-2.5">Độ trễ</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {data === null ? (
              <tr>
                <td colSpan={8} className="px-4 py-6"><div className="h-24 rounded-xl bg-stone-100 animate-pulse" /></td>
              </tr>
            ) : data.results.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-stone-500">Chưa có lượt nào.</td>
              </tr>
            ) : (
              data.results.map((r) => {
                const isOpen = open === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className={`border-t border-stone-100 cursor-pointer hover:bg-stone-50 ${isOpen ? 'bg-[#F4F7FC]' : ''}`} onClick={() => setOpen(isOpen ? null : r.id)}>
                      <td className="px-4 py-2 text-xs text-stone-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-2 truncate max-w-[180px]">{r.user_email || <span className="text-stone-400">—</span>}</td>
                      <td className="px-3 py-2">{FEATURE_LABEL[r.feature] ?? r.feature}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                        {!r.counted && r.status === 'ok' && <span className="ml-1 text-[10.5px] text-stone-400">không trừ</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatTokens(r.input_tokens)} / {formatTokens(r.output_tokens)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatUsd(Number(r.cost_usd))}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-stone-500">{r.latency_ms ? `${(r.latency_ms / 1000).toFixed(1)}s` : '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <ChevronDown className={`w-3 h-3 text-stone-400 inline transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-[#F4F7FC]">
                        <td colSpan={8} className="px-4 pb-4">
                          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mb-2">
                            {r.models_used.length > 0 && <span>Model: {r.models_used.join(', ')}</span>}
                            {r.embed_tokens > 0 && <span>Embedding: {formatTokens(r.embed_tokens)} token</span>}
                            {r.trace_url ? (
                              <a href={r.trace_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-[#1E3F82] hover:underline">
                                Mở trace Langfuse <BoxArrowUpRight className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-stone-400">Không có trace (chưa bật Langfuse)</span>
                            )}
                          </div>
                          {r.error && <div className="rounded-lg bg-rose-50 text-rose-700 text-xs px-3 py-2 mb-2">{r.error}</div>}
                          {r.steps.length > 0 && (
                            <table className="w-full text-xs bg-white rounded-xl overflow-hidden border border-stone-200">
                              <thead className="text-stone-500">
                                <tr>
                                  <th className="text-left font-semibold px-3 py-1.5">Bước</th>
                                  <th className="text-left font-semibold px-3 py-1.5">Model</th>
                                  <th className="text-right font-semibold px-3 py-1.5">Vào</th>
                                  <th className="text-right font-semibold px-3 py-1.5">Ra</th>
                                  <th className="text-right font-semibold px-3 py-1.5">Độ trễ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.steps.map((s, i) => (
                                  <tr key={i} className={`border-t border-stone-100 ${s.status === 'error' ? 'text-rose-600' : ''}`}>
                                    <td className="px-3 py-1.5 font-mono">{s.step}</td>
                                    <td className="px-3 py-1.5">{s.provider}/{s.model}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatTokens(s.input_tokens)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{s.kind === 'chat' ? formatTokens(s.output_tokens) : '—'}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{(s.latency_ms / 1000).toFixed(1)}s</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white disabled:opacity-40 cursor-pointer">
            Trước
          </button>
          <span className="text-stone-500 tabular-nums">
            {page} / {pages}
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white disabled:opacity-40 cursor-pointer">
            Sau
          </button>
        </div>
      )}
    </div>
  );
}

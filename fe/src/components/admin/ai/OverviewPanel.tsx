'use client';

import { useEffect, useState } from 'react';
import { CheckCircleFill, ExclamationTriangleFill, PencilSquare, XCircleFill } from 'react-bootstrap-icons';
import { adminAiApi, FEATURE_LABEL, formatTokens, formatUsd, type AiOverview, type AiUserRow } from '@/lib/ai';
import { UsageChart } from './UsageChart';

const RANGES = [
  { days: 1, label: 'Hôm nay' },
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
];

export function OverviewPanel({ onGoPrices }: { onGoPrices: () => void }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AiOverview | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminAiApi
      .overview(days)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được số liệu');
      });
    return () => {
      cancelled = true;
    };
  }, [days, reload]);

  if (error) return <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div>;
  if (!data) return <div className="h-96 rounded-3xl bg-stone-200/60 animate-pulse" />;

  const t = data.totals;
  const s = data.service;

  return (
    <div className="flex flex-col gap-4">
      {/* Tình trạng service AI */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl bg-white border border-stone-200/90 px-4 py-3 text-xs">
        <span className="font-bold text-stone-700">Service AI</span>
        {s ? (
          <>
            <Flag ok label="Đang chạy" />
            <Flag ok={s.llm} label={`LLM ${s.model}`} />
            <Flag ok={s.embedding} label="Embedding (Gemini)" />
            <Flag ok={s.knowledge_db} label="Kho giáo trình" />
            <Flag ok={s.langfuse} label="Langfuse" optional />
          </>
        ) : (
          <Flag ok={false} label="Không kết nối được (docker compose up -d ai)" />
        )}
      </div>

      {data.missing_prices.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <ExclamationTriangleFill className="w-4 h-4" />
          Chưa có giá cho: {data.missing_prices.map((m) => `${m.provider}/${m.model}`).join(', ')} — chi phí đang tính là $0.
          <button type="button" onClick={onGoPrices} className="font-bold underline cursor-pointer">
            Nhập giá
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="inline-flex p-1 rounded-xl bg-white border border-stone-200/90 text-sm font-bold">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${days === r.days ? 'bg-[#1E3F82] text-white' : 'text-stone-500 hover:text-stone-800'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Kpi label="Lượt dùng AI" value={formatTokens(t.requests)} hint={`${t.llm_calls} lần gọi model`} />
        <Kpi label="Token vào / ra" value={formatTokens(t.tokens)} hint={`${formatTokens(t.input_tokens)} vào · ${formatTokens(t.output_tokens)} ra`} />
        <Kpi label="Chi phí" value={formatUsd(t.cost_usd)} tone="text-[#1E3F82]" />
        <Kpi label="Độ trễ TB" value={`${(t.avg_latency_ms / 1000).toFixed(1)}s`} />
        <Kpi
          label="Lỗi / cache"
          value={`${(t.error_rate * 100).toFixed(1)}%`}
          tone={t.error_rate > 0.05 ? 'text-rose-600' : 'text-stone-900'}
          hint={`${t.errors} lỗi · ${t.cached} lấy từ cache · ${t.quota_blocked} hết lượt`}
        />
      </div>

      <section className="bg-white rounded-2xl border border-stone-200/90 p-5">
        <h2 className="text-sm font-bold text-stone-900 mb-4">Token theo ngày</h2>
        <UsageChart data={data.daily} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <section className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden">
          <h2 className="text-sm font-bold text-stone-900 px-5 py-3 border-b border-stone-100">Theo tính năng</h2>
          {data.by_feature.length === 0 ? (
            <p className="px-5 py-6 text-sm text-stone-500">Chưa có lượt dùng nào.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="text-left font-bold px-5 py-2">Tính năng</th>
                  <th className="text-right font-bold px-3 py-2">Lượt</th>
                  <th className="text-right font-bold px-3 py-2">Token</th>
                  <th className="text-right font-bold px-5 py-2">Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {data.by_feature.map((f) => (
                  <tr key={f.feature} className="border-t border-stone-100">
                    <td className="px-5 py-2 font-semibold text-stone-800">
                      {FEATURE_LABEL[f.feature] ?? f.feature}
                      {(f.errors > 0 || f.cached > 0) && (
                        <span className="block text-[11px] font-normal text-stone-400">
                          {f.cached > 0 && `${f.cached} cache`} {f.errors > 0 && <span className="text-rose-500">· {f.errors} lỗi</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTokens(f.requests)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTokens(f.input_tokens + f.output_tokens)}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{formatUsd(f.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden">
          <h2 className="text-sm font-bold text-stone-900 px-5 py-3 border-b border-stone-100">Người dùng nhiều nhất</h2>
          {data.top_users.length === 0 ? (
            <p className="px-5 py-6 text-sm text-stone-500">Chưa có dữ liệu.</p>
          ) : (
            <ul>
              {data.top_users.map((u) => (
                <UserRow key={u.id} user={u} onChanged={() => setReload((n) => n + 1)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function UserRow({ user, onChanged }: { user: AiUserRow; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(user.daily_limit));
  const [error, setError] = useState('');

  const save = async (limit: number | null) => {
    setError('');
    try {
      await adminAiApi.setUserQuota(user.id, limit);
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được');
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-2.5 border-t first:border-t-0 border-stone-100 text-sm">
      <div className="flex-1 min-w-[160px]">
        <div className="font-semibold text-stone-800 truncate">{user.name || user.email}</div>
        <div className="text-[11px] text-stone-500">
          {user.requests} lượt · {formatTokens(user.tokens)} token · {formatUsd(user.cost_usd)}
        </div>
      </div>
      {user.role === 'admin' ? (
        <span className="text-[11px] text-stone-400">Admin · không giới hạn</span>
      ) : editing ? (
        <div className="flex items-center gap-1.5">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
            className="w-24 px-2 py-1 rounded-lg border border-stone-200 text-xs tabular-nums"
            aria-label="Hạn mức token/ngày"
          />
          <button type="button" onClick={() => void save(Number(value || 0))} className="px-2 py-1 rounded-lg bg-[#1E3F82] text-white text-xs font-bold cursor-pointer">
            Lưu
          </button>
          {user.custom_limit && (
            <button type="button" onClick={() => void save(null)} className="px-2 py-1 text-xs text-stone-500 hover:text-stone-800 cursor-pointer">
              Về mặc định
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-[#1E3F82] cursor-pointer"
          title="Đổi hạn mức riêng cho người này"
        >
          {formatTokens(user.daily_limit)}/ngày{user.custom_limit && ' (riêng)'} <PencilSquare className="w-3 h-3" />
        </button>
      )}
      {error && <span className="w-full text-xs text-rose-600">{error}</span>}
    </li>
  );
}

function Kpi({ label, value, hint, tone = 'text-stone-900' }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 px-4 py-3">
      <div className={`text-2xl font-extrabold tabular-nums ${tone}`}>{value}</div>
      <div className="text-xs font-semibold text-stone-500 mt-0.5">{label}</div>
      {hint && <div className="text-[11px] text-stone-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function Flag({ ok, label, optional = false }: { ok: boolean; label: string; optional?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 ${ok ? 'text-emerald-700' : optional ? 'text-stone-400' : 'text-rose-600'}`}>
      {ok ? <CheckCircleFill className="w-3.5 h-3.5" /> : <XCircleFill className="w-3.5 h-3.5" />}
      {label}
      {!ok && optional && ' (tắt)'}
    </span>
  );
}

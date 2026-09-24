'use client';

import { useEffect, useState } from 'react';
import { PlusLg, Trash } from 'react-bootstrap-icons';
import { adminAiApi, formatTokens, type AiSettings, type ModelPrice } from '@/lib/ai';

export function SettingsPanel() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [limit, setLimit] = useState('');
  const [prices, setPrices] = useState<ModelPrice[] | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminAiApi.settings(), adminAiApi.prices()])
      .then(([s, p]) => {
        if (cancelled) return;
        setSettings(s);
        setLimit(String(s.default_daily_tokens));
        setPrices(p);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được cài đặt');
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(ok);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được');
    }
  };

  if (!settings || !prices) {
    return error ? <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div> : <div className="h-64 rounded-3xl bg-stone-200/60 animate-pulse" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {message && <div className="rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-2.5">{message}</div>}
      {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div>}

      <section className="bg-white rounded-2xl border border-stone-200/90 p-5 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-stone-900">Hạn mức & kiểm chứng</h2>
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span className="w-56 text-stone-700">Hạn mức mặc định mỗi người</span>
          <input
            value={limit}
            onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))}
            className="w-32 px-3 py-2 rounded-xl border border-stone-200 text-sm tabular-nums"
          />
          <span className="text-stone-500">token / ngày</span>
          <button
            type="button"
            disabled={!limit || Number(limit) === settings.default_daily_tokens}
            onClick={() => void act(() => adminAiApi.updateSettings({ default_daily_tokens: Number(limit) }), 'Đã lưu hạn mức mặc định.')}
            className="px-3 py-2 rounded-xl bg-[#1E3F82] text-white text-sm font-bold disabled:opacity-40 cursor-pointer"
          >
            Lưu
          </button>
        </label>
        <p className="text-xs text-stone-500 -mt-2">
          Khoảng {formatTokens(Math.round(Number(limit || 0) / 3500))} câu hỏi gia sư / ngày. Chỉnh riêng từng người ở tab Tổng quan. Admin không bị giới hạn.
        </p>
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={settings.llm_judge_enabled}
            onChange={(e) => void act(() => adminAiApi.updateSettings({ llm_judge_enabled: e.target.checked }), 'Đã lưu.')}
            className="w-4 h-4 mt-0.5 accent-[#1E3F82]"
          />
          <span>
            <span className="font-semibold text-stone-800">Bật “AI chấm lại”</span>
            <span className="block text-xs text-stone-500">
              Ngoài kiểm chứng bằng quy tắc (miễn phí), gọi thêm 1 lần AI để soát câu trả lời có bịa ngoài giáo trình không. Chính xác hơn nhưng tốn gấp ~1,3 lần token.
            </span>
          </span>
        </label>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100">
          <h2 className="text-sm font-bold text-stone-900">Bảng giá model</h2>
          <p className="text-xs text-stone-500 mt-0.5">USD cho mỗi 1 triệu token, lấy theo trang giá của nhà cung cấp. Đổi giá chỉ áp dụng cho các lượt sau.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-stone-500">
            <tr>
              <th className="text-left font-bold px-5 py-2">Nhà cung cấp</th>
              <th className="text-left font-bold px-3 py-2">Model</th>
              <th className="text-right font-bold px-3 py-2">Vào ($/1M)</th>
              <th className="text-right font-bold px-3 py-2">Ra ($/1M)</th>
              <th className="px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <PriceRow key={`${p.id}-${p.updated_at}`} price={p} onSave={(d) => act(() => adminAiApi.updatePrice(p.id, d), 'Đã lưu giá.')} onDelete={() => act(() => adminAiApi.deletePrice(p.id), 'Đã xóa giá.')} />
            ))}
            <NewPriceRow onCreate={(d) => act(() => adminAiApi.createPrice(d), 'Đã thêm giá.')} />
          </tbody>
        </table>
      </section>
    </div>
  );
}

type PriceInput = Omit<ModelPrice, 'id' | 'updated_at'>;
const cell = 'w-full px-2 py-1.5 rounded-lg border border-stone-200 text-sm';

function PriceRow({ price, onSave, onDelete }: { price: ModelPrice; onSave: (d: Partial<PriceInput>) => void; onDelete: () => void }) {
  const [input, setInput] = useState(price.input_per_million);
  const [output, setOutput] = useState(price.output_per_million);
  const dirty = input !== price.input_per_million || output !== price.output_per_million;
  return (
    <tr className="border-t border-stone-100">
      <td className="px-5 py-2 text-stone-700">{price.provider}</td>
      <td className="px-3 py-2 font-mono text-xs text-stone-700">{price.model}</td>
      <td className="px-3 py-2 w-28"><input value={input} onChange={(e) => setInput(e.target.value)} className={`${cell} text-right tabular-nums`} /></td>
      <td className="px-3 py-2 w-28"><input value={output} onChange={(e) => setOutput(e.target.value)} className={`${cell} text-right tabular-nums`} /></td>
      <td className="px-5 py-2 text-right whitespace-nowrap">
        {dirty && (
          <button type="button" onClick={() => onSave({ input_per_million: input, output_per_million: output })} className="px-2.5 py-1 rounded-lg bg-[#1E3F82] text-white text-xs font-bold cursor-pointer mr-2">
            Lưu
          </button>
        )}
        <button type="button" onClick={onDelete} className="text-stone-400 hover:text-rose-600 cursor-pointer" aria-label="Xóa">
          <Trash className="w-3.5 h-3.5 inline" />
        </button>
      </td>
    </tr>
  );
}

function NewPriceRow({ onCreate }: { onCreate: (d: PriceInput) => void }) {
  const [d, setD] = useState<PriceInput>({ provider: 'groq', model: '', input_per_million: '', output_per_million: '' });
  return (
    <tr className="border-t border-stone-100 bg-stone-50/60">
      <td className="px-5 py-2 w-36">
        <select value={d.provider} onChange={(e) => setD({ ...d, provider: e.target.value })} className={cell}>
          <option value="groq">groq</option>
          <option value="gemini">gemini</option>
        </select>
      </td>
      <td className="px-3 py-2"><input value={d.model} onChange={(e) => setD({ ...d, model: e.target.value })} placeholder="vd. qwen/qwen3.8-27b" className={`${cell} font-mono text-xs`} /></td>
      <td className="px-3 py-2"><input value={d.input_per_million} onChange={(e) => setD({ ...d, input_per_million: e.target.value })} placeholder="0.00" className={`${cell} text-right`} /></td>
      <td className="px-3 py-2"><input value={d.output_per_million} onChange={(e) => setD({ ...d, output_per_million: e.target.value })} placeholder="0.00" className={`${cell} text-right`} /></td>
      <td className="px-5 py-2 text-right">
        <button
          type="button"
          disabled={!d.model.trim()}
          onClick={() => {
            onCreate({ ...d, model: d.model.trim(), input_per_million: d.input_per_million || '0', output_per_million: d.output_per_million || '0' });
            setD({ ...d, model: '', input_per_million: '', output_per_million: '' });
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1E3F82] text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
        >
          <PlusLg className="w-3 h-3" /> Thêm
        </button>
      </td>
    </tr>
  );
}

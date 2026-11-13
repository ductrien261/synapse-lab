'use client';

import { useMemo, useState } from 'react';
import type { Wire, WiringApi } from '@/lib/lab/wiring';
import { Card, Notice, PrimaryButton } from './LabUi';

/** Trạng thái đi dây của một bài. Giữ ở component bài để dây không mất khi người học chuyển bước. */
export function useWiring(W: WiringApi) {
  const [wires, setWires] = useState<Wire[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [hint, setHint] = useState('');
  const status = useMemo(() => W.status(wires), [W, wires]);

  const pick = (id: string) => {
    if (pending === null) {
      setPending(id);
      setMsg(null);
      return;
    }
    if (pending === id) {
      setPending(null);
      return;
    }
    const r = W.addWire(wires, pending, id);
    setPending(null);
    if (r.note) {
      setMsg({ ok: false, text: r.note });
      return;
    }
    const check = W.checkWire({ a: pending, b: id });
    setWires(r.wires);
    setHint('');
    if (!check.ok) {
      setMsg({ ok: false, text: check.reason });
      return;
    }
    const net = W.terminalById(id)!.net;
    const before = W.netProgress(wires).find((p) => p.net.id === net)!;
    const after = W.netProgress(r.wires).find((p) => p.net.id === net)!;
    const def = W.nets.find((n) => n.id === net)!;
    setMsg({ ok: true, text: !before.complete && after.complete ? `Mạch "${def.name}" đã nối đủ. ${def.done}` : `Đã nối ${W.labelOf(pending)} với ${W.labelOf(id)}.` });
  };

  const remove = (i: number) => {
    setWires((w) => w.filter((_, j) => j !== i));
    setMsg(null);
    setHint('');
  };
  const clear = () => {
    setWires([]);
    setPending(null);
    setMsg(null);
    setHint('');
  };
  const reset = () => {
    setPending(null);
    setMsg(null);
    setHint('');
  };

  return { W, wires, pending, setPending, hover, setHover, msg, hint, showHint: () => setHint(W.nextHint(wires)), status, pick, remove, clear, reset };
}

export type Wiring = ReturnType<typeof useWiring>;

/** Cột trái: các chân của từng linh kiện, bấm để chọn chân (thay cho việc bấm chấm trong hình). */
export function TerminalList({ w }: { w: Wiring }) {
  const used = new Set(w.wires.flatMap((x) => [x.a, x.b]));
  const groups = Array.from(new Set(w.W.terminals.map((t) => t.partName)));
  return (
    <>
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">Chân đấu dây</h2>
      <div className="mt-3 flex flex-col gap-3">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1 text-xs font-bold text-[#0F2258]">{g}</p>
            <ul className="flex flex-col gap-1">
              {w.W.terminals
                .filter((t) => t.partName === g)
                .map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      aria-pressed={w.pending === t.id}
                      data-terminal={t.id}
                      onClick={() => w.pick(t.id)}
                      onMouseEnter={() => w.setHover(t.id)}
                      onMouseLeave={() => w.setHover(null)}
                      onFocus={() => w.setHover(t.id)}
                      onBlur={() => w.setHover(null)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
                        w.pending === t.id ? 'bg-amber-100 text-amber-900' : 'text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${used.has(t.id) ? 'bg-green-600' : 'bg-slate-700'}`} aria-hidden />
                      <span className="flex-1">{t.label}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}

interface PanelProps {
  w: Wiring;
  onNext: () => void;
  /** Chữ nút sang bước sau khi mạch đã đủ */
  nextLabel?: string;
  /** Câu mở đầu hướng dẫn cách chơi */
  intro?: string;
  /** Giải thích hiện khi mạch đã đủ và đúng */
  doneText: string;
}

/** Cột phải: hướng dẫn, mô tả chân đang xem, danh sách dây, tiến độ các mạch. */
export function WiringPanel({ w, onNext, nextLabel = 'Sang bước tính toán', intro, doneText }: PanelProps) {
  const info = w.W.terminalById(w.pending ?? w.hover ?? '');
  return (
    <>
      <Card tone="accent">
        <h2 className="text-sm font-bold text-[#0F2258]">Đi dây điện</h2>
        <p className="text-sm text-stone-700">
          {intro ?? `Bấm một chân, rồi bấm chân cần nối tới để kéo một dây. Nối đủ ${w.status.netsTotal} mạch thì mạch mới hoạt động. Đọc mô tả của từng chân để biết nó nhận gì và đưa đi đâu. Muốn gỡ dây, bấm vào dây trong hình hoặc bấm "Gỡ" ở danh sách dây.`}
        </p>
        <div className="min-h-[7.5rem] rounded-lg bg-white px-3 py-2 text-sm">
          {info ? (
            <>
              <p className="font-semibold text-[#1E3F82]">{w.W.labelOf(info.id)}</p>
              <p className="text-stone-600">{info.desc}</p>
              {w.pending && <p className="mt-1 text-xs font-semibold text-amber-700">Đang chọn chân này. Bấm chân cần nối tới, hoặc bấm lại để bỏ chọn.</p>}
            </>
          ) : (
            <p className="text-stone-500">Rê chuột vào một chân (hoặc bấm vào nó) để xem chân đó làm gì.</p>
          )}
        </div>
        {w.msg && <Notice ok={w.msg.ok}>{w.msg.text}</Notice>}
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-[#1E3F82]/20" aria-label="Tiến độ đi dây">
            <div className="h-1.5 rounded-full bg-[#1E3F82] transition-all" style={{ width: `${(w.status.netsDone / w.status.netsTotal) * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-stone-600">
            {w.status.netsDone}/{w.status.netsTotal} mạch
          </span>
        </div>
        {w.status.complete ? (
          <>
            <Notice ok>{doneText}</Notice>
            <PrimaryButton onClick={onNext}>{nextLabel}</PrimaryButton>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <button type="button" onClick={w.showHint} className="text-sm font-semibold text-[#1E3F82]">
              Xem gợi ý
            </button>
            {w.wires.length > 0 && (
              <button type="button" onClick={w.clear} className="text-sm font-semibold text-stone-500">
                Gỡ hết dây
              </button>
            )}
          </div>
        )}
        {w.hint && !w.status.complete && <p className="rounded-lg bg-white px-3 py-2 text-sm text-stone-600">{w.hint}</p>}
      </Card>

      <Card title={`Dây đã nối (${w.wires.length})`}>
        {w.wires.length === 0 ? (
          <p className="text-sm text-stone-500">Chưa có dây nào.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {w.wires.map((x, i) => {
              const c = w.W.checkWire(x);
              return (
                <li key={`${x.a}~${x.b}`} className={`rounded-lg border px-2.5 py-1.5 text-xs ${c.ok ? 'border-stone-200 bg-white text-stone-700' : 'border-red-200 bg-red-50 text-red-800'}`}>
                  <div className="flex items-start gap-2">
                    <span className="flex-1 leading-snug">
                      {w.W.labelOf(x.a)} <span aria-hidden>→</span> {w.W.labelOf(x.b)}
                    </span>
                    <button type="button" onClick={() => w.remove(i)} className="shrink-0 font-semibold text-stone-500 hover:text-stone-800">
                      Gỡ
                    </button>
                  </div>
                  {!c.ok && <p className="mt-1 leading-snug">{c.reason}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Các mạch cần nối">
        <ul className="flex flex-col gap-1.5">
          {w.status.progress.map((p) => (
            <li key={p.net.id} className="flex items-center gap-2 text-sm">
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${p.complete ? 'bg-green-600' : 'bg-stone-300'}`} aria-hidden>
                {p.complete ? '✓' : ''}
              </span>
              <span className={`flex-1 ${p.complete ? 'text-stone-800' : 'text-stone-500'}`}>{p.net.name}</span>
              <span className="text-xs text-stone-400">
                {p.connected}/{p.total}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

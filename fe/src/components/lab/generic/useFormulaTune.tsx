'use client';

import { useState } from 'react';
import { activeLimits, computeOutputs, formulaDefaults, sweep } from '@/lib/lab/package/formula';
import type { FormulaTune } from '@/lib/lab/package/types';
import { Card, Notice, Row, Slider } from '../shared/LabUi';
import { WiringGate, type TuneArgs, type TuneKit } from './tuneKit';

const W = 800;
const H = 280;
const L = 64;
const R = 760;
const T = 28;
const B = 226;

function Chart({ cfg, values, out }: { cfg: FormulaTune; values: Record<string, number>; out: Record<string, number> }) {
  const inp = cfg.inputs.find((i) => i.name === cfg.chart.xInput)!;
  const pts = sweep(cfg, values);
  const ys = pts.map((p) => p.y);
  const lo = Math.min(...ys, 0);
  const hi = Math.max(...ys, lo + 1e-9);
  const x = (v: number) => L + ((v - inp.min) / (inp.max - inp.min)) * (R - L);
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.x).toFixed(1)} ${y(p.y).toFixed(1)}`).join(' ');
  const cur = out[cfg.chart.yOutput];
  const cx = x(values[inp.name]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="min-h-0 flex-[2]" role="img" aria-label={`Đồ thị ${cfg.chart.yLabel} theo ${cfg.chart.xLabel}`}>
      <rect x={L} y={T} width={R - L} height={B - T} fill="#F8FAFC" stroke="#CBD5E1" />
      {line && <path d={line} fill="none" stroke="#1E3F82" strokeWidth={2.5} strokeLinejoin="round" />}
      {Number.isFinite(cur) && (
        <>
          <line x1={cx} y1={T} x2={cx} y2={B} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="6 5" />
          <circle cx={cx} cy={y(cur)} r={5} fill="#EF4444" />
        </>
      )}
      <text x={L - 6} y={T + 12} textAnchor="end" fill="#64748B" fontSize={12}>
        {hi.toPrecision(3)}
      </text>
      <text x={L - 6} y={B} textAnchor="end" fill="#64748B" fontSize={12}>
        {lo.toPrecision(3)}
      </text>
      <text x={L} y={B + 18} fill="#64748B" fontSize={12}>
        {inp.min}
      </text>
      <text x={R} y={B + 18} textAnchor="end" fill="#64748B" fontSize={12}>
        {inp.max}
      </text>
      <text x={(L + R) / 2} y={H - 10} textAnchor="middle" fill="#64748B" fontSize={13}>
        {cfg.chart.xLabel}
      </text>
      <text x={L} y={T - 10} fill="#334155" fontSize={13} fontWeight={600}>
        {cfg.chart.yLabel}
      </text>
    </svg>
  );
}

/** Mẫu "công thức": chỉnh các đại lượng, mã tính kết quả bằng công thức khai báo trong bài và vẽ đường cong. */
export function useFormulaTune(cfg: FormulaTune | null, { active, wired, wiringProgress, onGoWire, scene }: TuneArgs): TuneKit {
  const [values, setValues] = useState<Record<string, number>>(() => (cfg ? formulaDefaults(cfg) : {}));
  const reset = () => cfg && setValues(formulaDefaults(cfg));
  const out = cfg ? computeOutputs(cfg, values) : {};

  const viewport = cfg ? (
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-[3]">{scene}</div>
      <Chart cfg={cfg} values={values} out={out} />
    </div>
  ) : null;

  const warnings = cfg ? activeLimits(cfg, out) : [];
  const panel =
    !active || !cfg ? null : !wired ? (
      <WiringGate progress={wiringProgress} onGoWire={onGoWire} />
    ) : (
      <>
        <Card tone="accent">
          <h2 className="text-sm font-bold text-[#0F2258]">{cfg.title}</h2>
          <p className="text-sm text-stone-700">{cfg.intro}</p>
          <div className="flex flex-col gap-1">
            {cfg.inputs.map((i) => (
              <Slider key={i.name} label={i.label} unit={i.unit} value={values[i.name]} min={i.min} max={i.max} step={i.step} onChange={(v) => setValues((cur) => ({ ...cur, [i.name]: v }))} />
            ))}
          </div>
          <button type="button" onClick={reset} className="self-start rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700">
            Đặt lại
          </button>
        </Card>
        <Card title="Kết quả">
          <dl className="flex flex-col gap-1.5 text-sm">
            {cfg.outputs.map((o) => (
              <Row key={o.id} k={o.label} v={Number.isFinite(out[o.id]) ? `${out[o.id].toFixed(o.digits)}${o.unit ? ` ${o.unit}` : ''}` : 'không tính được'} />
            ))}
          </dl>
          {warnings.map((w) => (
            <Notice key={w} ok={false}>
              {w}
            </Notice>
          ))}
        </Card>
      </>
    );

  const getState = () => ({
    values,
    results: Object.fromEntries((cfg?.outputs ?? []).map((o) => [o.label, Number.isFinite(out[o.id]) ? Number(out[o.id].toFixed(o.digits)) : null])),
    warnings,
    wiring_complete: wired,
  });

  return { viewport, panel, getState, reset, stop: () => {} };
}

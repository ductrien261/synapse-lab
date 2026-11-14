'use client';

import { useEffect, useRef, useState } from 'react';
import { ARENA, CAR_RADIUS, DEFAULT_VEHICLE_PARAMS, OBSTACLES, SENSOR_RANGE, initialVehicle, stepVehicle, type VehicleParams, type VehicleState } from '@/lib/lab/package/sim-vehicle';
import type { VehicleTune } from '@/lib/lab/package/types';
import { Card, Notice, PrimaryButton, Row, Slider } from '../shared/LabUi';
import { WiringGate, type TuneArgs, type TuneKit } from './tuneKit';

const SPEEDS = [1, 2, 4];
const TRAIL = 600;
const S = 100;

/** Mẫu "xe trong sân": chỉnh tốc độ, ngưỡng phát hiện, tốc độ quay và chu kỳ đo, xem xe có né được vật cản không. */
export function useVehicleTune(cfg: VehicleTune | null, { active, wired, wiringProgress, onGoWire }: TuneArgs): TuneKit {
  const [params, setParams] = useState<VehicleParams>(DEFAULT_VEHICLE_PARAMS);
  const [sim, setSim] = useState<VehicleState>(initialVehicle);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const simRef = useRef(sim);
  const paramsRef = useRef(params);
  const speedRef = useRef(speed);

  useEffect(() => {
    paramsRef.current = params;
    speedRef.current = speed;
  }, [params, speed]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      acc += Math.min(0.1, (now - last) / 1000) * speedRef.current;
      last = now;
      let s = simRef.current;
      const added: [number, number][] = [];
      while (acc >= 0.02) {
        s = stepVehicle(s, paramsRef.current, 0.02);
        added.push([s.x, s.y]);
        acc -= 0.02;
      }
      if (added.length) {
        simRef.current = s;
        setSim(s);
        setTrail((tr) => [...tr, ...added.filter((_, i) => i % 5 === 0)].slice(-TRAIL));
        if (s.crashed) setRunning(false);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const reset = () => {
    const s = initialVehicle();
    simRef.current = s;
    setSim(s);
    setTrail([]);
    setRunning(false);
  };
  const patch = (p: Partial<VehicleParams>) => setParams((cur) => ({ ...cur, ...p }));

  const rayLen = Math.min(sim.lastRange, SENSOR_RANGE);
  const viewport = (
    <div className="relative flex h-full w-full items-center justify-center bg-[#F1F5F9] p-3">
      <svg viewBox={`-10 -10 ${ARENA.w * S + 20} ${ARENA.h * S + 20}`} className="h-full w-full" role="img" aria-label="Sân thử xe nhìn từ trên xuống">
        <rect x={0} y={0} width={ARENA.w * S} height={ARENA.h * S} fill="#FFFFFF" stroke="#94A3B8" strokeWidth={2} />
        {OBSTACLES.map((o) => (
          <circle key={`${o.x}-${o.y}`} cx={o.x * S} cy={o.y * S} r={o.r * S} fill="#94A3B8" />
        ))}
        {trail.length > 1 && <polyline points={trail.map(([x, y]) => `${(x * S).toFixed(1)},${(y * S).toFixed(1)}`).join(' ')} fill="none" stroke="#93C5FD" strokeWidth={2} />}
        <line x1={sim.x * S} y1={sim.y * S} x2={(sim.x + Math.cos(sim.th) * rayLen) * S} y2={(sim.y + Math.sin(sim.th) * rayLen) * S} stroke={sim.turning ? '#EF4444' : '#22C55E'} strokeWidth={1.5} strokeDasharray="4 3" />
        <circle cx={sim.x * S} cy={sim.y * S} r={CAR_RADIUS * S} fill={sim.crashed ? '#DC2626' : '#1E3F82'} />
        <line x1={sim.x * S} y1={sim.y * S} x2={(sim.x + Math.cos(sim.th) * CAR_RADIUS) * S} y2={(sim.y + Math.sin(sim.th) * CAR_RADIUS) * S} stroke="#FFFFFF" strokeWidth={3} />
      </svg>
      {sim.crashed && <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm">Đã va chạm</div>}
    </div>
  );

  const panel =
    !active ? null : !wired ? (
      <WiringGate progress={wiringProgress} onGoWire={onGoWire} />
    ) : (
      <>
        <Card tone="accent">
          <h2 className="text-sm font-bold text-[#0F2258]">{cfg?.title}</h2>
          <p className="text-sm text-stone-700">{cfg?.intro}</p>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => (sim.crashed ? undefined : setRunning((r) => !r))}>{running ? 'Tạm dừng' : sim.t === 0 ? 'Chạy' : 'Tiếp tục'}</PrimaryButton>
            <button type="button" onClick={reset} className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700">
              Làm lại
            </button>
          </div>
          <div className="flex gap-2" role="group" aria-label="Tốc độ mô phỏng">
            {SPEEDS.map((v) => (
              <button key={v} type="button" aria-pressed={speed === v} onClick={() => setSpeed(v)} className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${speed === v ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-stone-200 bg-white text-stone-600'}`}>
                {v}×
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <Slider label="Tốc độ" unit=" m/s" value={params.speed} min={0.1} max={1} step={0.05} decimals={2} onChange={(v) => patch({ speed: v })} />
            <Slider label="Ngưỡng né" unit=" m" value={params.threshold} min={0.1} max={1} step={0.05} decimals={2} onChange={(v) => patch({ threshold: v })} />
            <Slider label="Tốc độ quay" unit="°/s" value={params.turnDeg} min={30} max={360} step={10} onChange={(v) => patch({ turnDeg: v })} />
            <Slider label="Chu kỳ đo" unit=" s" value={params.period} min={0.05} max={0.5} step={0.05} decimals={2} onChange={(v) => patch({ period: v })} />
          </div>
          <p className="text-xs text-stone-400">Cảm biến đo khoảng cách phía trước mỗi chu kỳ. Gần hơn ngưỡng né thì xe quay tại chỗ cho đến khi đường thoáng. Quãng đường xe đi được giữa hai lần đo là tốc độ nhân chu kỳ đo.</p>
        </Card>
        <Card title="Kết quả">
          <dl className="flex flex-col gap-1.5 text-sm">
            <Row k="Thời gian" v={`${sim.t.toFixed(1)} s`} />
            <Row k="Quãng đường" v={`${sim.distance.toFixed(2)} m`} />
            <Row k="Số lần né" v={`${sim.avoids}`} />
            <Row k="Khoảng cách đo gần nhất" v={`${sim.lastRange.toFixed(2)} m`} />
            <Row k="Tình trạng" v={sim.crashed ? 'đã va chạm' : sim.turning ? 'đang quay để né' : running ? 'đang chạy thẳng' : 'chưa chạy'} />
          </dl>
          {sim.crashed && <Notice ok={false}>Xe đã đâm vào vật cản. Thử tăng ngưỡng né, giảm tốc độ hoặc rút ngắn chu kỳ đo để xe kịp quay.</Notice>}
        </Card>
      </>
    );

  const getState = () => ({
    params,
    time_s: Number(sim.t.toFixed(2)),
    distance_m: Number(sim.distance.toFixed(2)),
    avoid_count: sim.avoids,
    last_range_m: Number(sim.lastRange.toFixed(2)),
    crashed: sim.crashed,
    turning: sim.turning,
    metres_travelled_between_pings: Number((params.speed * params.period).toFixed(3)),
    wiring_complete: wired,
  });

  return { viewport, panel, getState, reset, stop: () => setRunning(false) };
}

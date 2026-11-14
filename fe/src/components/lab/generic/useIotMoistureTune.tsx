'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_IOT_PARAMS, IOT, initialIot, iotSimulationState, stepIot, type IotParams, type IotState } from '@/lib/lab/iot-spec';
import { TuneScene } from '../iot/IotScenes';
import { Card, Notice, PrimaryButton, Row, Slider } from '../shared/LabUi';
import { WiringGate, type TuneArgs, type TuneKit } from './tuneKit';

const HORIZON = 720;
const SPEEDS = [10, 30, 100];

const clock = (t: number) => {
  const day = Math.floor(t / 1440) + 1;
  const h = Math.floor((t % 1440) / 60);
  const m = t % 60;
  return `Ngày ${day}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Mẫu thử tự do "độ ẩm đất": mô phỏng theo thời gian, chỉnh ngưỡng bật, độ trễ, chu kỳ lấy mẫu và nhiễu. */
export function useIotMoistureTune({ active, wired, wiringProgress, onGoWire }: TuneArgs): TuneKit {
  const [params, setParams] = useState<IotParams>(DEFAULT_IOT_PARAMS);
  const [sim, setSim] = useState<IotState>(initialIot);
  const [history, setHistory] = useState<number[]>([initialIot().moisture]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(30);
  const simRef = useRef<IotState>(sim);
  const paramsRef = useRef<IotParams>(params);
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
      const added: number[] = [];
      while (acc >= 1) {
        s = stepIot(s, paramsRef.current);
        added.push(s.moisture);
        acc -= 1;
      }
      if (added.length) {
        simRef.current = s;
        setSim(s);
        setHistory((h) => [...h, ...added].slice(-HORIZON));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const reset = () => {
    const s = initialIot();
    simRef.current = s;
    setSim(s);
    setHistory([s.moisture]);
    setRunning(false);
  };
  const stop = () => setRunning(false);
  const patch = (p: Partial<IotParams>) => setParams((cur) => ({ ...cur, ...p }));
  const healthyPct = sim.t === 0 ? 100 : Math.round((sim.minutesHealthy / sim.t) * 100);

  const viewport = <TuneScene params={params} sim={sim} history={history} />;

  const panel = !active ? null : !wired ? (
    <WiringGate progress={wiringProgress} onGoWire={onGoWire} />
  ) : (
    <>
      <Card>
        <div className="flex gap-2">
          <PrimaryButton onClick={() => setRunning((r) => !r)}>{running ? 'Tạm dừng' : sim.t === 0 ? 'Chạy' : 'Tiếp tục'}</PrimaryButton>
          <button type="button" onClick={reset} className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700">
            Làm lại
          </button>
        </div>
        <div className="flex gap-2" role="group" aria-label="Tốc độ mô phỏng">
          {SPEEDS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={speed === v}
              onClick={() => setSpeed(v)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${speed === v ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-stone-200 bg-white text-stone-600'}`}
            >
              {v} phút/giây
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <Slider label="Ngưỡng bật" unit="%" value={params.threshold} min={10} max={80} step={5} onChange={(v) => patch({ threshold: v })} />
          <Slider label="Độ trễ" unit="%" value={params.hysteresis} min={0} max={40} step={5} onChange={(v) => patch({ hysteresis: v })} />
          <Slider label="Lấy mẫu" unit=" phút" value={params.interval} min={1} max={180} step={1} onChange={(v) => patch({ interval: v })} />
          <Slider label="Nhiễu" unit="%" value={params.noise} min={0} max={10} step={1} onChange={(v) => patch({ noise: v })} />
        </div>
        <p className="text-xs text-stone-400">Bơm bật khi số đo dưới ngưỡng bật và tắt khi vượt ngưỡng bật cộng độ trễ. Vùng xanh trên biểu đồ là khoảng độ ẩm cây khỏe ({IOT.healthyLow} đến {IOT.healthyHigh}%).</p>
      </Card>
      <Card title="Kết quả">
        <dl className="flex flex-col gap-1.5 text-sm">
          <Row k="Thời gian" v={clock(sim.t)} />
          <Row k="Cây khỏe" v={`${healthyPct}% thời gian`} />
          <Row k="Nước đã dùng" v={`${(sim.waterMl / 1000).toFixed(2)} L`} />
          <Row k="Rơ-le đóng ngắt" v={`${sim.switches} lần`} />
          <Row k="Số lần đọc mỗi ngày" v={`${Math.round(1440 / params.interval)}`} />
        </dl>
        {sim.moisture > IOT.healthyHigh && <Notice ok={false}>Đất đang quá ướt. Thử giảm độ trễ hoặc rút ngắn chu kỳ lấy mẫu để bơm tắt kịp.</Notice>}
        {sim.moisture < IOT.healthyLow && sim.t > 0 && <Notice ok={false}>Đất đang quá khô. Thử tăng ngưỡng bật bơm.</Notice>}
      </Card>
    </>
  );

  const getState = () => ({ ...iotSimulationState(params, sim), wiring_complete: wired });

  return { viewport, panel, getState, reset, stop };
}

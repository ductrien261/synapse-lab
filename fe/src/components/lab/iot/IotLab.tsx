'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_IOT_PARAMS,
  IOT,
  IOT_PARTS,
  adcVolts,
  initialIot,
  iotSimulationState,
  pumpSeconds,
  rawToMoisture,
  stepIot,
  type IotParams,
  type IotState,
} from '@/lib/lab/iot-spec';
import { IOT_WIRING } from '@/lib/lab/iot-wiring';
import { BuildPanel, LearnPanel, PartList, PreviewPanel, useAssembly, type Stage, type StageDef } from '../shared/assembly';
import { LabAssistant } from '../shared/LabAssistant';
import { LabLayout } from '../shared/LabLayout';
import { OverviewBox } from '../shared/OverviewBox';
import { TerminalList, WiringPanel, useWiring } from '../shared/WiringKit';
import { Card, NumberGuess, Notice, PrimaryButton, Row, Slider, closeTo, parseGuess } from '../shared/LabUi';
import { IotDiagram, IotWiringDiagram, TuneScene } from './IotScenes';

const IOT_STAGES: StageDef[] = [
  { key: 'learn', label: '1. Tìm hiểu' },
  { key: 'preview', label: '2. Xem quy trình' },
  { key: 'build', label: '3. Tự lắp ráp' },
  { key: 'wire', label: '4. Đi dây' },
  { key: 'design', label: '5. Tính toán' },
  { key: 'tune', label: '6. Thử tự do' },
];

/** Thứ tự danh sách khi tự lắp ráp: xáo trộn để người học tự suy luận. */
const SHUFFLED = [3, 0, 5, 2, 4, 1];
const CALC_STEPS = ['Đổi số đo ra điện áp', 'Đổi số đo ra độ ẩm', 'Tính thời gian bơm'];
const HORIZON = 720;
const SPEEDS = [10, 30, 100];

const clock = (t: number) => {
  const day = Math.floor(t / 1440) + 1;
  const h = Math.floor((t % 1440) / 60);
  const m = t % 60;
  return `Ngày ${day}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export function IotLab() {
  const [stage, setStage] = useState<Stage>('learn');
  const a = useAssembly(IOT_PARTS, stage, SHUFFLED);
  const wiring = useWiring(IOT_WIRING);
  const wired = wiring.status.complete;

  // Bước tính toán
  const [calc, setCalc] = useState(0);
  const [guess, setGuess] = useState('');
  const [calcMsg, setCalcMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [calcOk, setCalcOk] = useState(false);
  const [raw, setRaw] = useState(2000);
  const [rawMoist, setRawMoist] = useState(2100);
  const [ml, setMl] = useState(150);

  // Thử tự do
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

  const resetRun = () => {
    const s = initialIot();
    simRef.current = s;
    setSim(s);
    setHistory([s.moisture]);
    setRunning(false);
  };

  const startCalc = (step: number) => {
    setCalc(step);
    setCalcMsg(null);
    setCalcOk(false);
    setGuess('');
  };

  const goStage = (s: Stage) => {
    a.enter(s);
    wiring.reset();
    setStage(s);
    if (s === 'design') startCalc(0);
    if (s === 'tune') resetRun();
    else setRunning(false);
  };

  const check = () => {
    const g = parseGuess(guess);
    if (g === null) {
      setCalcMsg({ ok: false, text: 'Hãy nhập một số dương, ví dụ 1.6.' });
      return;
    }
    if (calc === 0) {
      const exp = adcVolts(raw);
      if (closeTo(g, exp)) {
        setCalcOk(true);
        setCalcMsg({ ok: true, text: `Đúng. ${raw} chia ${IOT.adcMax} nhân ${IOT.vref} V ≈ ${exp.toFixed(2)} V. ADC 12 bit chia dải 0 đến ${IOT.vref} V thành ${IOT.adcMax + 1} mức.` });
      } else {
        setCalcMsg({ ok: false, text: `Chưa khớp. Số đo chia cho giá trị lớn nhất của ADC (${IOT.adcMax}), rồi nhân điện áp tham chiếu (${IOT.vref} V).` });
      }
    } else if (calc === 1) {
      const exp = rawToMoisture(rawMoist);
      if (Math.abs(g - exp) <= 3) {
        setCalcOk(true);
        setCalcMsg({ ok: true, text: `Đúng. (${IOT.rawDry} − ${rawMoist}) / (${IOT.rawDry} − ${IOT.rawWet}) × 100 ≈ ${exp.toFixed(0)}%. Số đo càng cao thì đất càng khô, nên phải lấy mốc khô trừ đi số đo.` });
      } else {
        setCalcMsg({ ok: false, text: `Chưa khớp (sai số cho phép 3%). Cảm biến đo ${IOT.rawDry} khi khô (0%) và ${IOT.rawWet} khi ướt (100%). Hãy nội suy tuyến tính giữa hai mốc này.` });
      }
    } else {
      const exp = pumpSeconds(ml);
      if (closeTo(g, exp)) {
        setCalcOk(true);
        setCalcMsg({ ok: true, text: `Đúng. ${ml} mL chia ${IOT.pumpFlow} mL mỗi phút, nhân 60 giây ≈ ${Math.round(exp)} giây. Đây là thời gian rơ-le giữ đóng cho mỗi lần tưới.` });
      } else {
        setCalcMsg({ ok: false, text: `Chưa khớp. Bơm ${IOT.pumpFlow} mL mỗi phút, tức ${IOT.pumpFlow / 60} mL mỗi giây. Thời gian = thể tích chia lưu lượng.` });
      }
    }
  };

  const patch = (p: Partial<IotParams>) => setParams((cur) => ({ ...cur, ...p }));
  const learning = stage === 'learn' || stage === 'preview' || stage === 'build';

  let viewport;
  if (stage === 'wire') {
    viewport = <IotWiringDiagram parts={IOT_PARTS} wires={wiring.wires} pending={wiring.pending} hover={wiring.hover} onPick={wiring.pick} onHover={wiring.setHover} onRemoveWire={wiring.remove} onMiss={() => wiring.setPending(null)} />;
  } else if (stage === 'tune') {
    viewport = <TuneScene params={params} sim={sim} history={history} />;
  } else if (stage === 'design') {
    const focus = calc === 0 ? 'mcu' : calc === 1 ? 'sensor' : 'pump';
    viewport = <IotDiagram parts={IOT_PARTS} installed={IOT_PARTS.length} focus={focus} guides={false} />;
  } else {
    viewport = <IotDiagram parts={IOT_PARTS} installed={a.installed} focus={a.focus} guides={stage !== 'learn'} onPick={a.pick} onMiss={stage === 'learn' ? () => a.setSelected(null) : undefined} />;
  }

  const getState = (): Record<string, unknown> => {
    if (stage === 'wire') return IOT_WIRING.state(wiring.wires);
    if (stage === 'tune') return { ...iotSimulationState(params, sim), wiring_complete: wired };
    if (stage === 'design') {
      const given =
        calc === 0 ? { adc_raw: raw, adc_max: IOT.adcMax, vref_v: IOT.vref } : calc === 1 ? { adc_raw: rawMoist, raw_dry: IOT.rawDry, raw_wet: IOT.rawWet } : { volume_ml: ml, pump_flow_ml_per_min: IOT.pumpFlow };
      return { exercise: CALC_STEPS[calc], given_values: given };
    }
    return { stage, parts: IOT_PARTS.map((p) => p.name) };
  };

  const healthyPct = sim.t === 0 ? 100 : Math.round((sim.minutesHealthy / sim.t) * 100);

  const side = (
    <>
      {stage === 'learn' && <LearnPanel parts={IOT_PARTS} a={a} onNext={() => goStage('preview')} />}
      {stage === 'preview' && <PreviewPanel parts={IOT_PARTS} a={a} onStart={() => goStage('build')} />}
      {stage === 'build' && <BuildPanel parts={IOT_PARTS} a={a} doneText="Hệ thống đã có cảm biến, ESP32, rơ-le, bơm, Wi-Fi và bảng điều khiển. Nhưng chúng chưa có điện và chưa nối với nhau: giờ bạn đi dây." doneLabel="Sang bước đi dây" onDone={() => goStage('wire')} />}
      {stage === 'wire' && (
        <WiringPanel
          w={wiring}
          onNext={() => goStage('design')}
          doneText="Mạch đã đủ và đúng. Cảm biến báo độ ẩm về chân ADC, ESP32 ra lệnh qua GPIO cho rơ-le, rơ-le đóng ngắt điện 5 V cấp cho bơm. Hệ thống đã sẵn sàng."
        />
      )}

      {stage === 'design' && (
        <Card tone="accent">
          <div className="flex gap-1.5" aria-label="Tiến độ">
            {CALC_STEPS.map((n, i) => (
              <span key={n} className={`h-1.5 flex-1 rounded-full ${i <= calc ? 'bg-[#1E3F82]' : 'bg-[#1E3F82]/20'}`} />
            ))}
          </div>
          <h2 className="text-sm font-bold text-[#0F2258]">
            Bài {calc + 1}/{CALC_STEPS.length}: {CALC_STEPS[calc]}
          </h2>

          {calc === 0 && (
            <>
              <p className="text-sm text-stone-700">
                ESP32 đọc được số <b>{raw}</b> từ cảm biến (ADC 12 bit, tối đa {IOT.adcMax}, tham chiếu {IOT.vref} V). Điện áp thực tế ở chân cảm biến là bao nhiêu volt?
              </p>
              <Slider label="Số đo" unit="" value={raw} min={0} max={4095} step={50} onChange={(v) => { setRaw(v === 0 ? 50 : v); setCalcMsg(null); setCalcOk(false); }} />
              <NumberGuess value={guess} onChange={setGuess} onCheck={check} placeholder="Điện áp (V)" />
            </>
          )}
          {calc === 1 && (
            <>
              <p className="text-sm text-stone-700">
                Cảm biến này đo <b>{IOT.rawDry}</b> khi đất khô hẳn (0%) và <b>{IOT.rawWet}</b> khi ngâm nước (100%). Số đo hiện tại là <b>{rawMoist}</b>. Độ ẩm đất là bao nhiêu phần trăm?
              </p>
              <Slider label="Số đo" unit="" value={rawMoist} min={1300} max={2900} step={50} onChange={(v) => { setRawMoist(v); setCalcMsg(null); setCalcOk(false); }} />
              <NumberGuess value={guess} onChange={setGuess} onCheck={check} placeholder="Độ ẩm (%)" />
            </>
          )}
          {calc === 2 && (
            <>
              <p className="text-sm text-stone-700">
                Mỗi lần tưới cần <b>{ml} mL</b> nước. Bơm có lưu lượng <b>{IOT.pumpFlow} mL mỗi phút</b>. Rơ-le phải giữ bơm chạy bao nhiêu giây?
              </p>
              <Slider label="Lượng nước" unit=" mL" value={ml} min={50} max={300} step={10} onChange={(v) => { setMl(v); setCalcMsg(null); setCalcOk(false); }} />
              <NumberGuess value={guess} onChange={setGuess} onCheck={check} placeholder="Thời gian (giây)" />
            </>
          )}

          {calcMsg && <Notice ok={calcMsg.ok}>{calcMsg.text}</Notice>}
          <div className="flex gap-2">
            {calc > 0 && (
              <button type="button" onClick={() => startCalc(calc - 1)} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700">
                Bài trước
              </button>
            )}
            {calc < CALC_STEPS.length - 1 ? (
              <button type="button" disabled={!calcOk} onClick={() => startCalc(calc + 1)} className="flex-1 rounded-lg bg-[#1E3F82] px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40">
                Bài tiếp theo
              </button>
            ) : (
              <button type="button" disabled={!calcOk} onClick={() => goStage('tune')} className="flex-1 rounded-lg bg-[#1E3F82] px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40">
                Sang thử tự do
              </button>
            )}
          </div>
        </Card>
      )}

      {stage === 'tune' && !wired && (
        <Card tone="accent">
          <Notice ok={false}>Hệ thống chưa có điện vì chưa đi dây xong ({wiring.status.netsDone}/{wiring.status.netsTotal} mạch). Hãy đi dây rồi quay lại đây để chạy.</Notice>
          <PrimaryButton onClick={() => goStage('wire')}>Đến bước đi dây</PrimaryButton>
        </Card>
      )}

      {stage === 'tune' && (
        <>
          <Card>
            <div className="flex gap-2">
              <PrimaryButton disabled={!wired} onClick={() => setRunning((r) => (wired ? !r : false))}>{running ? 'Tạm dừng' : sim.t === 0 ? 'Chạy' : 'Tiếp tục'}</PrimaryButton>
              <button type="button" onClick={resetRun} className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700">
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
      )}

      {(stage === 'wire' || stage === 'design' || stage === 'tune') && <LabAssistant lab="iot" stage={stage === 'design' ? `calc-${calc + 1}` : stage} getState={getState} canHint={stage === 'design' || stage === 'wire'} />}
    </>
  );

  return (
    <LabLayout
      title="Hệ thống tưới cây thông minh"
      subtitle="Theo dõi dữ liệu đi từ cảm biến tới màn hình, tự lắp, tính các con số rồi chỉnh quy tắc tưới."
      stage={stage}
      stages={IOT_STAGES}
      onStage={goStage}
      list={stage === 'wire' ? <TerminalList w={wiring} /> : <PartList parts={IOT_PARTS} a={a} stage={learning ? stage : 'learn'} />}
      viewport={viewport}
      side={side}
      overlay={
        stage === 'learn'
          ? (pos) => (
              <OverviewBox
                className={pos}
                title="Hệ thống tưới cây hoạt động thế nào?"
                what="Tự tưới cây khi đất khô, dừng khi đủ ẩm, và cho người dùng theo dõi số liệu từ xa."
                steps={[
                  'Cảm biến cắm trong đất đo độ ẩm và đổi nó thành một điện áp.',
                  'Vi điều khiển ESP32 đọc điện áp đó (ADC), đổi ra phần trăm độ ẩm rồi so với ngưỡng bật bơm.',
                  'Đất khô hơn ngưỡng thì ESP32 bật rơ-le. Rơ-le đóng mạch điện cho máy bơm, nước chảy vào chậu.',
                  'Bơm chạy cho đến khi độ ẩm vượt ngưỡng tắt (ngưỡng bật cộng độ trễ). Độ trễ giúp bơm không bật tắt liên tục.',
                  'Module Wi-Fi gửi số liệu lên bảng điều khiển để người dùng xem độ ẩm và lịch sử tưới.',
                ]}
              />
            )
          : undefined
      }
    />
  );
}

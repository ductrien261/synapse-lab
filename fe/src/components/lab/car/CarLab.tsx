'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CAR,
  CAR_PARTS,
  DEFAULT_CAR_PARAMS,
  TRACKS,
  carSimulationState,
  initialCar,
  maxSpeed,
  runtimeMinutes,
  stepCar,
  turnRate,
  type CarParams,
  type CarState,
  type Pt,
} from '@/lib/lab/car-spec';
import { BuildPanel, LearnPanel, PartList, PreviewPanel, useAssembly, type Stage } from '../shared/assembly';
import { LabAssistant } from '../shared/LabAssistant';
import { LabLayout } from '../shared/LabLayout';
import { OverviewBox } from '../shared/OverviewBox';
import { Card, NumberGuess, Notice, PrimaryButton, Row, Slider, closeTo, parseGuess } from '../shared/LabUi';
import { ArcScene, CarDiagram, TrackScene } from './CarScenes';
import { ScanDemo, ScanLive } from './ScanView';

/** Thứ tự danh sách khi tự lắp ráp: xáo trộn để người học tự suy luận. */
const SHUFFLED = [6, 2, 8, 0, 4, 7, 1, 5, 3];
const CALC_STEPS = ['Tính tốc độ xe', 'Tính vòng quay', 'Chọn pin'];
const TARGET_MINUTES = 240;

export function CarLab() {
  const [stage, setStage] = useState<Stage>('learn');
  const a = useAssembly(CAR_PARTS, stage, SHUFFLED);

  // Bước tính toán
  const [calc, setCalc] = useState(0);
  const [guess, setGuess] = useState('');
  const [calcMsg, setCalcMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [calcOk, setCalcOk] = useState(false);
  const [wheelMm, setWheelMm] = useState(65);
  const [rpm, setRpm] = useState(200);
  const [vL, setVL] = useState(0.2);
  const [vR, setVR] = useState(0.3);
  const [cells, setCells] = useState(1);

  // Thử tự do
  const [params, setParams] = useState<CarParams>(DEFAULT_CAR_PARAMS);
  const [sim, setSim] = useState<CarState>(() => initialCar(TRACKS[0].points));
  const [trail, setTrail] = useState<Pt[]>([]);
  const [running, setRunning] = useState(false);
  const [trackId, setTrackId] = useState(TRACKS[0].id);
  /** Vòng nhanh nhất theo từng đường đua */
  const [bests, setBests] = useState<Record<string, number>>({});
  const simRef = useRef<CarState>(sim);
  const paramsRef = useRef<CarParams>(params);
  const track = TRACKS.find((t) => t.id === trackId) ?? TRACKS[0];
  const trackRef = useRef(track);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);
  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const dt = 1 / 120;
    const loop = (now: number) => {
      acc += Math.min(0.05, (now - last) / 1000);
      last = now;
      let s = simRef.current;
      while (acc >= dt && s.status === 'running') {
        s = stepCar(s, paramsRef.current, dt, trackRef.current.points);
        acc -= dt;
      }
      simRef.current = s;
      setSim(s);
      setTrail((t) => {
        const p = { x: s.x, y: s.y };
        return t.length > 900 ? [...t.slice(-899), p] : [...t, p];
      });
      if (s.status !== 'running') {
        setRunning(false);
        if (s.status === 'finished' && s.lapTime !== null) {
          const id = trackRef.current.id;
          const lap = s.lapTime;
          setBests((b) => ({ ...b, [id]: b[id] === undefined ? lap : Math.min(b[id], lap) }));
        }
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const resetRun = (points = trackRef.current.points) => {
    const s = initialCar(points);
    simRef.current = s;
    setSim(s);
    setTrail([]);
    setRunning(false);
  };

  const changeTrack = (id: string) => {
    const t = TRACKS.find((x) => x.id === id) ?? TRACKS[0];
    trackRef.current = t;
    setTrackId(id);
    resetRun(t.points);
  };

  const toggleRun = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (simRef.current.status === 'finished' || simRef.current.status === 'lost') resetRun();
    simRef.current = { ...simRef.current, status: 'running' };
    setSim(simRef.current);
    setRunning(true);
  };

  const startCalc = (step: number) => {
    setCalc(step);
    setCalcMsg(null);
    setCalcOk(false);
    setGuess('');
  };

  const goStage = (s: Stage) => {
    a.enter(s);
    setStage(s);
    if (s === 'design') startCalc(0);
    if (s === 'tune') resetRun();
    else setRunning(false);
  };

  const check = () => {
    const g = parseGuess(guess);
    if (g === null) {
      setCalcMsg({ ok: false, text: 'Hãy nhập một số dương, ví dụ 0.5.' });
      return;
    }
    if (calc === 0) {
      const exp = maxSpeed(wheelMm / 1000, rpm);
      if (closeTo(g, exp)) {
        setCalcOk(true);
        setCalcMsg({ ok: true, text: `Đúng. Mỗi vòng bánh đi được một chu vi π × ${(wheelMm / 1000).toFixed(3)} m, nhân ${rpm} vòng mỗi phút rồi chia 60 giây, ra ≈ ${exp.toFixed(2)} m/s. Bánh lớn hơn hoặc motor quay nhanh hơn thì xe nhanh hơn.` });
      } else {
        setCalcMsg({ ok: false, text: 'Chưa khớp. Đổi mm ra mét. Quãng đường mỗi vòng là chu vi bánh (π × đường kính), rồi nhân số vòng mỗi giây (vòng mỗi phút chia 60).' });
      }
    } else if (calc === 1) {
      const w = Math.abs(turnRate(vL, vR));
      if (w === 0) {
        setCalcMsg({ ok: false, text: 'Hai bánh đang cùng tốc độ nên xe đi thẳng. Hãy chỉnh cho hai bánh chạy khác nhau.' });
        return;
      }
      if (closeTo(g, w)) {
        setCalcOk(true);
        const r = (vL + vR) / 2 / w;
        setCalcMsg({ ok: true, text: `Đúng. ω = (v phải − v trái) / khoảng cách hai bánh = ${w.toFixed(2)} rad/s. Xe vạch ra vòng tròn có bán kính ≈ ${r.toFixed(2)} m (tốc độ trung bình chia ω).` });
      } else {
        setCalcMsg({ ok: false, text: `Chưa khớp. Lấy hiệu hai tốc độ bánh chia cho khoảng cách hai bánh (${CAR.track} m). Đơn vị là rad/s.` });
      }
    } else {
      const exp = runtimeMinutes(cells);
      if (!closeTo(g, exp)) {
        setCalcMsg({ ok: false, text: `Chưa khớp. Thời gian = dung lượng chia dòng tiêu thụ. Dòng tổng = 2 motor × ${CAR.motorAmp} A + mạch ${CAR.logicAmp} A. Mỗi cell ${CAR.cellMah} mAh. Đổi giờ ra phút.` });
      } else if (exp >= TARGET_MINUTES) {
        setCalcOk(true);
        setCalcMsg({ ok: true, text: `Đúng và đạt mục tiêu: ${cells} cell chạy được ≈ ${Math.round(exp)} phút (từ ${TARGET_MINUTES} phút trở lên). Thêm cell thì pin lâu hơn nhưng xe nặng hơn.` });
      } else {
        setCalcMsg({ ok: false, text: `Tính đúng: ${Math.round(exp)} phút, nhưng chưa đạt mục tiêu ${TARGET_MINUTES} phút. Hãy thêm cell pin rồi tính lại.` });
      }
    }
  };

  const patch = (p: Partial<CarParams>) => setParams((cur) => ({ ...cur, ...p }));
  const learning = stage === 'learn' || stage === 'preview' || stage === 'build';

  // Khung tương tác
  let viewport;
  if (stage === 'tune') {
    viewport = <TrackScene parts={CAR_PARTS} sim={sim} trail={trail} track={track.points} />;
  } else if (stage === 'design' && calc === 1) {
    viewport = <ArcScene parts={CAR_PARTS} vLeft={vL} vRight={vR} />;
  } else if (stage === 'design') {
    const focus = calc === 0 ? 'wheels' : 'battery';
    viewport = <CarDiagram parts={CAR_PARTS} installed={CAR_PARTS.length} focus={focus} guides={false} />;
  } else {
    viewport = <CarDiagram parts={CAR_PARTS} installed={a.installed} focus={a.focus} guides={stage !== 'learn'} onPick={a.pick} onMiss={stage === 'learn' ? () => a.setSelected(null) : undefined} />;
  }

  const statusText: Record<CarState['status'], string> = {
    ready: 'Sẵn sàng',
    running: 'Đang chạy',
    lost: 'Xe mất vạch hoặc đi sai đường',
    finished: 'Hoàn thành một vòng',
  };

  const getState = (): Record<string, unknown> => {
    if (stage === 'tune') return carSimulationState(params, sim, track);
    if (stage === 'design') {
      const given =
        calc === 0 ? { wheel_diameter_mm: wheelMm, motor_rpm: rpm } : calc === 1 ? { v_left_m_s: vL, v_right_m_s: vR, track_m: CAR.track } : { cells, cell_mah: CAR.cellMah, motor_amp: CAR.motorAmp, logic_amp: CAR.logicAmp, target_minutes: TARGET_MINUTES };
      return { exercise: CALC_STEPS[calc], given_values: given };
    }
    return { stage, parts: CAR_PARTS.map((p) => p.name) };
  };

  const side = (
    <>
      {stage === 'learn' && (
        <>
          <LearnPanel parts={CAR_PARTS} a={a} onNext={() => goStage('preview')} />
          <ScanDemo />
        </>
      )}
      {stage === 'preview' && <PreviewPanel parts={CAR_PARTS} a={a} onStart={() => goStage('build')} />}
      {stage === 'build' && <BuildPanel parts={CAR_PARTS} a={a} doneText="Xe đã đủ khung, motor, bánh, pin, công tắc, mạch ổn áp, mạch điều khiển motor, mạch điều khiển và cảm biến. Giờ bạn tính các thông số của nó." onDone={() => goStage('design')} />}

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
                Motor quay <b>{rpm}</b> vòng/phút, bánh đường kính <b>{wheelMm} mm</b>. Xe đi được bao nhiêu mét mỗi giây khi chạy hết tốc độ? Gợi ý: v = π × d × n / 60.
              </p>
              <Slider label="Bánh" unit=" mm" value={wheelMm} min={40} max={100} step={5} onChange={(v) => { setWheelMm(v); setCalcMsg(null); setCalcOk(false); }} />
              <Slider label="Motor" unit=" rpm" value={rpm} min={100} max={300} step={10} onChange={(v) => { setRpm(v); setCalcMsg(null); setCalcOk(false); }} />
              <NumberGuess value={guess} onChange={setGuess} onCheck={check} placeholder="Tốc độ (m/s)" />
            </>
          )}
          {calc === 1 && (
            <>
              <p className="text-sm text-stone-700">
                Bánh trái chạy <b>{vL.toFixed(2)} m/s</b>, bánh phải <b>{vR.toFixed(2)} m/s</b>, hai bánh cách nhau <b>{CAR.track * 100} cm</b>. Xe quay với tốc độ góc bao nhiêu rad/s? Hình bên cho thấy đường đi.
              </p>
              <Slider label="Bánh trái" unit=" m/s" decimals={2} value={vL} min={0.1} max={0.6} step={0.05} onChange={(v) => { setVL(v); setCalcMsg(null); setCalcOk(false); }} />
              <Slider label="Bánh phải" unit=" m/s" decimals={2} value={vR} min={0.1} max={0.6} step={0.05} onChange={(v) => { setVR(v); setCalcMsg(null); setCalcOk(false); }} />
              <NumberGuess value={guess} onChange={setGuess} onCheck={check} placeholder="Tốc độ góc (rad/s)" />
            </>
          )}
          {calc === 2 && (
            <>
              <p className="text-sm text-stone-700">
                Xe cần chạy ít nhất <b>{TARGET_MINUTES / 60} giờ</b>. Mỗi motor ăn {CAR.motorAmp} A, mạch điều khiển {CAR.logicAmp} A, mỗi cell pin {CAR.cellMah} mAh. Chọn số cell rồi tính xe chạy được bao nhiêu phút.
              </p>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={cells === n}
                    onClick={() => { setCells(n); setCalcMsg(null); setCalcOk(false); }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${cells === n ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-stone-200 bg-white text-stone-600'}`}
                  >
                    {n} cell
                  </button>
                ))}
              </div>
              <NumberGuess value={guess} onChange={setGuess} onCheck={check} placeholder="Thời gian chạy (phút)" />
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

      {stage === 'tune' && (
        <>
          <Card title="Chọn đường đua">
            <div className="grid grid-cols-2 gap-2">
              {TRACKS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={t.id === trackId}
                  onClick={() => changeTrack(t.id)}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${t.id === trackId ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-stone-200 bg-white text-stone-600'}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-500">{track.blurb}</p>
          </Card>
          <Card>
            <div className="flex gap-2">
              <PrimaryButton onClick={toggleRun}>{running ? 'Tạm dừng' : sim.status === 'ready' ? 'Chạy' : sim.status === 'running' ? 'Tiếp tục' : 'Chạy lại'}</PrimaryButton>
              <button type="button" onClick={() => resetRun()} className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700">
                Về vạch xuất phát
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <Slider label="Tốc độ" unit=" m/s" decimals={2} value={params.speed} min={0.1} max={0.65} step={0.05} onChange={(v) => patch({ speed: v })} />
              <Slider label="Kp" unit="" decimals={1} value={params.kp} min={0} max={10} step={0.5} onChange={(v) => patch({ kp: v })} />
              <Slider label="Kd" unit="" decimals={1} value={params.kd} min={0} max={10} step={0.5} onChange={(v) => patch({ kd: v })} />
            </div>
            <p className="text-xs text-stone-400">Kp quyết định xe bẻ lái mạnh đến đâu khi lệch vạch. Kd làm xe bớt lắc. Tốc độ cao cần Kp lớn hơn.</p>
          </Card>
          <Card title="Kết quả chuyến chạy">
            <dl className="flex flex-col gap-1.5 text-sm">
              <Row k="Trạng thái" v={statusText[sim.status]} />
              <Row k="Thời gian" v={`${sim.t.toFixed(1)} s`} />
              <Row k="Hoàn thành" v={`${Math.round(Math.max(0, Math.min(1, sim.progress / track.points.length)) * 100)}%`} />
              <Row k="Lệch vạch lớn nhất" v={`${(sim.maxOff * 100).toFixed(1)} cm`} />
              <Row k="Vòng nhanh nhất (đường này)" v={bests[trackId] === undefined ? 'Chưa có' : `${bests[trackId].toFixed(1)} s`} />
            </dl>
            {sim.status === 'lost' && <Notice ok={false}>Xe không bám được vạch. Thử tăng Kp hoặc giảm tốc độ rồi chạy lại.</Notice>}
            {sim.status === 'finished' && <Notice ok>Xe chạy hết một vòng trong {sim.lapTime?.toFixed(1)} giây. Thử tăng tốc độ để tìm vòng nhanh hơn mà vẫn bám vạch.</Notice>}
          </Card>
          <ScanLive sim={sim} track={track.points} kp={params.kp} />
        </>
      )}

      {(stage === 'design' || stage === 'tune') && <LabAssistant lab="car" stage={stage === 'design' ? `calc-${calc + 1}` : 'tune'} getState={getState} canHint={stage === 'design'} />}
    </>
  );

  return (
    <LabLayout
      title="Xe tự hành bám vạch"
      subtitle="Tìm hiểu các bộ phận, xem quy trình lắp, tự lắp, tính thông số rồi chỉnh bộ điều khiển để xe chạy hết đường đua."
      stage={stage}
      onStage={goStage}
      list={learning ? <PartList parts={CAR_PARTS} a={a} stage={stage} /> : <PartList parts={CAR_PARTS} a={a} stage="learn" />}
      viewport={viewport}
      side={side}
      overlay={
        stage === 'learn'
          ? (pos) => (
              <OverviewBox
                className={pos}
                title="Xe dò vạch hoạt động thế nào?"
                what="Xe tự chạy bám theo một vạch đen trên nền sáng mà không cần ai điều khiển."
                steps={[
                  'Năm cảm biến hồng ngoại ở mũi xe nhìn xuống đất. Mắt nào nằm trên vạch đen thì báo "có vạch".',
                  'Mạch điều khiển (ESP32) xem mắt nào đang thấy vạch để biết vạch lệch trái hay phải và lệch bao nhiêu. Con số đó gọi là sai số e.',
                  'Nó tính lệnh bẻ lái = Kp × e (cộng thành phần Kd cho đỡ lắc). Bánh bên này chạy chậm đi, bánh bên kia nhanh lên, xe quẹo về phía vạch.',
                  'Mạch điều khiển motor nhận tín hiệu PWM rồi cấp dòng lớn cho hai motor quay bánh. Pin qua công tắc và mạch ổn áp cấp điện cho tất cả.',
                  'Vòng lặp này chạy hàng trăm lần mỗi giây nên xe liên tục được kéo về giữa vạch.',
                ]}
              />
            )
          : undefined
      }
    />
  );
}

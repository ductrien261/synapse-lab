'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { DEFAULT_PARAMS, LIMITS, PARTS, SUPPLY, type ArmParams, type PartId, type SupplyKey } from '@/lib/lab/arm-spec';
import { applyPose, horizontalPose, inverse, loadModel, simulationState, tipPosition, torques, type Model, type Vec3 } from '@/lib/lab/so101-model';
import { ARM_WIRING } from '@/lib/lab/arm-wiring';
import { LabAssistant } from '../shared/LabAssistant';
import { Check, Gauge, Row, Slider } from '../shared/LabUi';
import { OverviewBox } from '../shared/OverviewBox';
import { TerminalList, WiringPanel, useWiring } from '../shared/WiringKit';

// Cảnh 3D chỉ chạy trên trình duyệt
const ArmScene = dynamic(() => import('./ArmScene'), { ssr: false });

type Phase = 'learn' | 'preview' | 'build' | 'wire' | 'design' | 'tune';
const PHASES: { key: Phase; label: string }[] = [
  { key: 'learn', label: '1. Tìm hiểu' },
  { key: 'preview', label: '2. Xem quy trình' },
  { key: 'build', label: '3. Tự lắp ráp' },
  { key: 'wire', label: '4. Đi dây' },
  { key: 'design', label: '5. Tính toán' },
  { key: 'tune', label: '6. Thử tự do' },
];

const CALC_STEPS = ['Ước tính moment', 'Chọn động cơ', 'Tối ưu tư thế'];

/** Mục tiêu từng bước lắp, mô tả theo chức năng để người học tự suy ra bộ phận cần chọn. */
const BUILD_GOALS: Record<PartId, string> = {
  base: 'Tạo chỗ đứng vững chắc, có sẵn motor để xoay cả cánh tay, để nó không bị đổ.',
  turntable: 'Gắn phần xoay được quanh trục thẳng đứng, mang theo motor để nâng hạ cánh tay.',
  upper: 'Thêm đoạn dài đầu tiên để nâng hạ phần phía trước, tại khớp vai.',
  forearm: 'Thêm đoạn thứ hai để gập duỗi, đổi khoảng cách từ đầu tay tới đế.',
  wrist: 'Thêm khớp nhỏ ở cuối để giữ hướng của đầu tay.',
  gripper: 'Gắn thứ cuối cùng để gắp được vật.',
};

/** Thứ tự hiển thị danh sách khi lắp ráp: xáo trộn để người học tự suy luận, không chép theo thứ tự. */
const SHUFFLED = [3, 0, 5, 2, 1, 4];

export function ArmLab() {
  const [model, setModel] = useState<Model | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [phase, setPhase] = useState<Phase>('learn');
  const [installed, setInstalled] = useState(PARTS.length);
  const [selected, setSelected] = useState<PartId | null>(null);
  const [params, setParams] = useState<ArmParams>(DEFAULT_PARAMS);
  const [ikOn, setIkOn] = useState(false);
  const [target, setTarget] = useState<Vec3>({ x: 0.2, y: 0.08, z: 0 });
  const [reachable, setReachable] = useState(true);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [full, setFull] = useState(false);
  const [hidePanels, setHidePanels] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [calc, setCalc] = useState(0);
  const [guess, setGuess] = useState('');
  const [calcMsg, setCalcMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [calcOk, setCalcOk] = useState(false);
  const [flat, setFlat] = useState<{ params: ArmParams; reach: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const wiring = useWiring(ARM_WIRING);
  const wired = wiring.status.complete;

  useEffect(() => {
    let alive = true;
    loadModel()
      .then((m) => alive && setModel(m))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  // Toàn màn hình: dùng Fullscreen API khi có, đồng thời bố cục tự phủ kín khung nhìn nên vẫn chạy khi API bị chặn
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    const onFs = () => !document.fullscreenElement && setFull(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [full]);

  const toggleFull = () => {
    if (full) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      setFull(false);
    } else {
      setFull(true);
      rootRef.current?.requestFullscreen?.().catch(() => undefined);
    }
  };

  // Tự chạy phần xem quy trình lắp
  useEffect(() => {
    if (!playing || phase !== 'preview') return;
    const id = setInterval(() => {
      setInstalled((n) => {
        if (n >= PARTS.length) {
          setPlaying(false);
          return n;
        }
        return n + 1;
      });
    }, 1800);
    return () => clearInterval(id);
  }, [playing, phase]);

  // Số liệu hiển thị lấy thẳng từ mô hình sau khi đặt tư thế
  const readout = useMemo(() => {
    if (!model) return null;
    applyPose(model.robot, params);
    return { tip: tipPosition(model.robot), t: torques(model.robot, params) };
  }, [model, params]);

  const startCalc = (step: number, base?: ArmParams) => {
    const f = base ?? flat?.params ?? params;
    setCalc(step);
    setCalcMsg(null);
    setCalcOk(false);
    setGuess('');
    if (step === 0) setParams({ ...f, payload: 0.3, supply: 'v74' });
    if (step === 1) setParams({ ...f, payload: 0.5, supply: 'v74' });
    if (step === 2) setParams({ ...f, payload: 0.5, supply: 'v74' });
  };

  const goPhase = (p: Phase) => {
    wiring.reset();
    if (p === 'wire') setParams(DEFAULT_PARAMS);
    setPhase(p);
    setFeedback(null);
    setShowHint(false);
    setSelected(null);
    setPlaying(false);
    setInstalled(p === 'build' || p === 'preview' ? 0 : PARTS.length);
    if (p !== 'tune') setIkOn(false);
    if (p === 'design' && model) {
      const h = horizontalPose(model.robot, params);
      setFlat(h);
      startCalc(0, h.params);
    }
  };

  const reach = flat?.reach ?? 0.3;

  const checkGuess = () => {
    if (!readout) return;
    const g = Number(guess.replace(',', '.'));
    const exp = params.payload * 9.81 * reach;
    if (!Number.isFinite(g) || g <= 0) {
      setCalcMsg({ ok: false, text: 'Hãy nhập một số dương, ví dụ 0.8.' });
      return;
    }
    if (Math.abs(g - exp) / exp <= 0.1) {
      setCalcOk(true);
      setCalcMsg({
        ok: true,
        text: `Đúng. ${params.payload} kg × 9,81 × ${reach.toFixed(2)} m ≈ ${exp.toFixed(2)} N·m. Mô phỏng cho ${readout.t.lift.toFixed(2)} N·m ở vai, cao hơn ${(readout.t.lift - exp).toFixed(2)} N·m vì còn phải gánh trọng lượng của chính cánh tay.`,
      });
    } else {
      setCalcMsg({ ok: false, text: 'Chưa khớp. Nhớ đổi gam ra kg và cm ra m, rồi lấy khối lượng × 9,81 × cánh tay đòn (khoảng cách từ trục vai tới đầu tay).' });
    }
  };

  const checkMotor = () => {
    if (!readout) return;
    const { lift, limit } = readout.t;
    const pct = Math.round((lift / limit) * 100);
    if (lift <= limit * 0.8) {
      setCalcOk(true);
      setCalcMsg({ ok: true, text: `Vai chịu ${lift.toFixed(2)} N·m, bằng ${pct}% giới hạn ${limit.toFixed(2)} N·m. Còn dư an toàn.` });
    } else if (lift <= limit) {
      setCalcMsg({ ok: false, text: `Vai chịu ${pct}% giới hạn. Còn chạy được nhưng quá sát, động cơ nóng và dễ trượt. Hãy chọn nguồn mạnh hơn để còn dư dưới 80%.` });
    } else {
      setCalcMsg({ ok: false, text: `Vai cần ${lift.toFixed(2)} N·m nhưng động cơ chỉ chịu tối đa ${limit.toFixed(2)} N·m. Động cơ sẽ bị quá tải.` });
    }
  };

  const onPart = (id: PartId) => {
    if (phase === 'preview') return;
    if (phase !== 'build') {
      setSelected(id);
      return;
    }
    const idx = PARTS.findIndex((p) => p.id === id);
    if (idx < installed) {
      setSelected(id);
      return;
    }
    if (idx === installed) {
      setInstalled(installed + 1);
      setSelected(id);
      setShowHint(false);
      setFeedback({ ok: true, text: `Đúng rồi. ${PARTS[idx].name}: ${PARTS[idx].role}` });
      return;
    }
    setSelected(null);
    setFeedback({
      ok: false,
      text: `Chưa lắp được "${PARTS[idx].name}" lúc này, vì nó gắn vào "${PARTS[idx - 1].name}" mà bộ phận đó chưa có. Hãy xem lại mục tiêu của bước này.`,
    });
  };

  const patch = (p: Partial<ArmParams>) => setParams((cur) => ({ ...cur, ...p }));

  const moveTarget = (t: Partial<Vec3>) => {
    if (!model) return;
    const nt = { ...target, ...t };
    setTarget(nt);
    const r = inverse(model.robot, params, nt);
    setParams(r.params);
    setReachable(r.reachable);
  };

  const toggleIk = (on: boolean) => {
    setIkOn(on);
    if (on && model) {
      const r = inverse(model.robot, params, target);
      setParams(r.params);
      setReachable(r.reachable);
    }
  };

  const listOrder = phase === 'build' ? SHUFFLED : PARTS.map((_, i) => i);
  const sel = PARTS.find((p) => p.id === selected) ?? null;
  const done = installed === PARTS.length;
  const t = readout?.t;
  const tip = readout?.tip;
  const overloaded = t ? t.lift > t.limit || t.elbow > t.limit || t.flex > t.limit : false;
  // Khi xem quy trình, bộ phận vừa được lắp là bộ phận được chú ý
  const focus: PartId | null = phase === 'preview' ? (installed > 0 ? PARTS[installed - 1].id : null) : selected;
  const floatCls = 'rounded-2xl border border-stone-200 bg-white/95 shadow-xl backdrop-blur';
  const optimizeOk = t && tip ? { torque: t.lift <= t.limit * 0.6, forward: tip.x >= 0.12, height: tip.y >= 0.05 } : null;

  return (
    <div ref={rootRef} className={full ? 'fixed inset-0 z-[60] bg-[#F7F9FD]' : 'flex flex-col gap-4'}>
      <div className={full ? `${floatCls} absolute left-3 right-16 top-3 z-20 flex flex-wrap items-center justify-between gap-2 px-4 py-2` : 'flex flex-wrap items-end justify-between gap-3'}>
        <div>
          <h1 className={`${full ? 'text-lg' : 'text-2xl'} font-bold tracking-tight text-[#0F2258]`}>Cánh tay robot</h1>
          {!full && <p className="text-sm text-stone-500">Tìm hiểu từng bộ phận, xem quy trình, tự lắp ráp, đi dây, tính toán rồi thử nghiệm.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Giai đoạn học">
          {PHASES.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={phase === p.key}
              onClick={() => goPhase(p.key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                phase === p.key ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-[#1E3F82]/40'
              }`}
            >
              {p.label}
            </button>
          ))}
          {full && (
            <button type="button" onClick={() => setHidePanels((h) => !h)} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-600 hover:border-[#1E3F82]/40">
              {hidePanels ? 'Hiện bảng' : 'Ẩn bảng'}
            </button>
          )}
        </div>
      </div>

      <div className={full ? 'absolute inset-0' : 'grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)_310px]'}>
        {/* Trái: danh sách bộ phận */}
        <aside className={full ? `${floatCls} absolute left-3 top-20 z-10 max-h-[calc(100%-6rem)] w-56 overflow-y-auto p-4 ${hidePanels ? 'hidden' : ''}` : 'max-h-[calc(100svh-14rem)] min-h-0 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 lg:order-1'}>
          {phase === 'wire' ? (
            <TerminalList w={wiring} />
          ) : (
            <>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">{phase === 'build' ? 'Linh kiện trên giá' : 'Danh sách bộ phận'}</h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {listOrder.map((i) => {
              const p = PARTS[i];
              const placed = i < installed;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onPart(p.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      selected === p.id ? 'bg-[#EEF3FC] text-[#1E3F82]' : 'text-stone-700 hover:bg-stone-50'
                    } ${phase === 'build' && placed ? 'opacity-40' : ''}`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
                    <span className="flex-1">{p.name}</span>
                    {phase === 'build' && placed && <span className="text-xs text-green-700">Đã lắp</span>}
                  </button>
                </li>
              );
            })}
          </ul>
            </>
          )}
        </aside>

        {/* Giữa: khung 3D */}
        <section className={full ? 'absolute inset-0' : 'relative min-w-0 lg:order-2'}>
          <div className={full ? 'h-full w-full overflow-hidden bg-[#F7F9FD]' : 'h-[420px] overflow-hidden rounded-2xl border border-stone-200 bg-[#F7F9FD] lg:h-[calc(100svh-14rem)] lg:min-h-[460px]'}>
            {loadError ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-stone-500">Không tải được mô hình 3D. Hãy tải lại trang.</div>
            ) : !model ? (
              <div className="flex h-full items-center justify-center text-sm text-stone-400">Đang tải mô hình 3D…</div>
            ) : (
              <ArmScene model={model} params={params} installed={installed} selected={focus} dim={phase !== 'build'} onPart={onPart} target={phase === 'tune' && ikOn ? target : null} view={phase === 'build' || phase === 'preview' ? 'build' : phase === 'wire' ? 'wire' : 'show'} wiring={phase === 'wire' ? { wires: wiring.wires, pending: wiring.pending, hover: wiring.hover, onPick: wiring.pick, onHover: wiring.setHover, onRemoveWire: wiring.remove } : null} />
            )}
          </div>
          {phase === 'learn' && (
            <OverviewBox
              className={full && !hidePanels ? 'left-[15.5rem] bottom-3' : 'left-3 bottom-3'}
              title="Cánh tay robot hoạt động thế nào?"
              what="Cánh tay đưa bàn kẹp tới đúng vị trí bằng cách xoay từng khớp tới một góc."
              steps={[
                'Mỗi khớp có một servo (motor kèm mạch tự giữ góc). Servo nhận góc đặt rồi tự quay tới đúng góc đó.',
                'Các đoạn tay nối tiếp nhau từ đế tới bàn kẹp, nên góc của các khớp cộng dồn lại và quyết định vị trí đầu kẹp.',
                'Bo mạch điều khiển ở đế gửi lệnh góc cho tất cả servo cùng lúc qua một đường truyền chung.',
                'Khi tay vươn xa hoặc nâng vật, khớp phía dưới chịu mô-men lớn (khối lượng × khoảng cách). Quá giới hạn của servo thì tay sụp xuống.',
                'Muốn đưa đầu kẹp tới một điểm, ta tính ngược xem mỗi khớp cần quay bao nhiêu độ.',
              ]}
            />
          )}
          <button
            type="button"
            onClick={toggleFull}
            aria-label={full ? 'Thu nhỏ' : 'Phóng to toàn màn hình'}
            title={full ? 'Thu nhỏ (Esc)' : 'Phóng to toàn màn hình'}
            className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white/90 text-stone-600 shadow-sm backdrop-blur hover:border-[#1E3F82]/40 hover:text-[#1E3F82]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {full ? <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4" /> : <path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4" />}
            </svg>
          </button>
          <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs text-stone-400">Kéo để xoay góc nhìn, cuộn để phóng to. Bấm vào bộ phận để chọn.</p>
        </section>

        {/* Phải: nội dung theo giai đoạn */}
        <aside className={full ? `absolute right-3 top-20 z-10 flex max-h-[calc(100%-6rem)] w-80 flex-col gap-3 overflow-y-auto ${hidePanels ? 'hidden' : ''}` : 'flex max-h-[calc(100svh-14rem)] min-h-0 flex-col gap-4 overflow-y-auto lg:order-3'}>
          {phase === 'learn' && (
            <>
              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                {sel ? (
                  <>
                    <h2 className="text-lg font-bold text-[#0F2258]">{sel.name}</h2>
                    <p className="mt-1 text-sm text-stone-600">{sel.role}</p>
                    <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                      <Row k="Loại khớp" v={sel.joint} />
                      <Row k="Bậc tự do" v={sel.dof} />
                      <Row k="Khối lượng" v={`${sel.massG} g`} />
                    </dl>
                    <ul className="mt-3 list-disc pl-5 text-sm text-stone-600">
                      {sel.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-stone-500">Bấm vào một bộ phận trong khung 3D hoặc trong danh sách để xem chức năng của nó.</p>
                )}
              </div>
              <button type="button" onClick={() => goPhase('preview')} className="rounded-xl bg-[#1E3F82] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#163070]">
                Xem quy trình lắp ráp
              </button>
            </>
          )}

          {phase === 'build' && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#1E3F82]/20 bg-[#EEF3FC] p-4">
              <div className="flex gap-1.5" aria-label="Tiến độ lắp ráp">
                {PARTS.map((p, i) => (
                  <span key={p.id} className={`h-1.5 flex-1 rounded-full ${i < installed ? 'bg-[#1E3F82]' : 'bg-[#1E3F82]/20'}`} />
                ))}
              </div>
              {!done ? (
                <>
                  <h2 className="text-sm font-bold text-[#0F2258]">
                    Bước {installed + 1}/{PARTS.length}
                  </h2>
                  <p className="text-sm text-stone-700">{BUILD_GOALS[PARTS[installed].id]}</p>
                  <p className="text-sm text-stone-500">Chọn đúng linh kiện trên giá, trong khung 3D hoặc trong danh sách.</p>
                  {showHint ? (
                    <p className="rounded-lg bg-white px-3 py-2 text-sm text-stone-600">{PARTS[installed].hint}</p>
                  ) : (
                    <button type="button" onClick={() => setShowHint(true)} className="self-start text-sm font-semibold text-[#1E3F82]">
                      Xem gợi ý
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-sm font-bold text-green-800">Lắp xong cánh tay</h2>
                  <p className="text-sm text-stone-700">Cánh tay có 6 bậc tự do: xoay đế, vai, khuỷu, gập cổ tay, xoay cổ tay và kẹp. Nhưng các servo chưa có điện và chưa nhận lệnh: giờ bạn đi dây.</p>
                  <button type="button" onClick={() => goPhase('wire')} className="rounded-xl bg-[#1E3F82] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#163070]">
                    Sang bước đi dây
                  </button>
                </>
              )}
              {feedback && <p className={`rounded-lg px-3 py-2 text-sm ${feedback.ok ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>{feedback.text}</p>}
            </div>
          )}

          {phase === 'wire' && (
            <WiringPanel
              w={wiring}
              onNext={() => goPhase('design')}
              intro="Bấm một chân rồi bấm chân cần nối tới để kéo dây. Các servo nối tiếp nhau thành chuỗi nên không cần nối từng servo về bo mạch. Muốn gỡ dây, bấm vào dây trong hình hoặc bấm Gỡ ở danh sách dây."
              doneText="Mạch đã đủ và đúng. Bộ nguồn cấp điện cho bo mạch, máy tính gửi lệnh qua USB, bo mạch đẩy điện và tín hiệu xuống chuỗi sáu servo. Cánh tay đã sẵn sàng nhận lệnh."
            />
          )}

          {phase === 'tune' && !wired && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#1E3F82]/20 bg-[#EEF3FC] p-4">
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Cánh tay chưa có điện vì chưa đi dây xong ({wiring.status.netsDone}/{wiring.status.netsTotal} mạch). Hãy đi dây rồi quay lại đây để điều khiển.</p>
              <button type="button" onClick={() => goPhase('wire')} className="rounded-xl bg-[#1E3F82] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#163070]">
                Đến bước đi dây
              </button>
            </div>
          )}

          {phase === 'preview' && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#1E3F82]/20 bg-[#EEF3FC] p-4">
              <h2 className="text-sm font-bold text-[#0F2258]">Quy trình lắp ráp</h2>
              <p className="text-sm text-stone-600">Xem trước thứ tự lắp để lát nữa tự làm. Bộ phận vừa lắp sẽ nổi bật, phần còn lại mờ đi.</p>
              <ol className="flex flex-col gap-1">
                {PARTS.map((p, i) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPlaying(false);
                        setInstalled(i + 1);
                      }}
                      className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${installed === i + 1 ? 'bg-white font-semibold text-[#1E3F82]' : i < installed ? 'text-stone-500' : 'text-stone-400'}`}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: p.color }}>
                        {i + 1}
                      </span>
                      <span className="flex-1">{p.name}</span>
                    </button>
                  </li>
                ))}
              </ol>
              {installed > 0 && <p className="rounded-lg bg-white px-3 py-2 text-sm text-stone-600">{BUILD_GOALS[PARTS[installed - 1].id]}</p>}
              <div className="flex gap-2">
                <button type="button" disabled={installed === 0} onClick={() => { setPlaying(false); setInstalled((n) => Math.max(0, n - 1)); }} className="flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm font-semibold text-stone-700 disabled:opacity-40">
                  Lùi
                </button>
                <button type="button" onClick={() => { if (installed >= PARTS.length) setInstalled(0); setPlaying((p) => !p); }} className="flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm font-semibold text-stone-700">
                  {playing ? 'Dừng' : 'Tự chạy'}
                </button>
                <button type="button" disabled={installed >= PARTS.length} onClick={() => { setPlaying(false); setInstalled((n) => Math.min(PARTS.length, n + 1)); }} className="flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm font-semibold text-stone-700 disabled:opacity-40">
                  Tiếp
                </button>
              </div>
              <button type="button" onClick={() => goPhase('build')} className="rounded-xl bg-[#1E3F82] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#163070]">
                Tôi đã nắm, tự lắp thử
              </button>
            </div>
          )}

          {phase === 'design' && (
            <>
              <div className="flex flex-col gap-3 rounded-2xl border border-[#1E3F82]/20 bg-[#EEF3FC] p-4">
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
                      Tay đang duỗi ngang, đầu tay cách trục vai <b>{(reach * 100).toFixed(0)} cm</b>. Vật gắp nặng bao nhiêu thì động cơ vai phải gồng bấy nhiêu. Dùng công thức <b>moment = khối lượng × 9,81 × cánh tay đòn</b> để ước tính, rồi nhập kết quả (N·m).
                    </p>
                    <Slider label="Vật gắp" unit="g" value={params.payload * 1000} min={100} max={500} step={50} onChange={(v) => { patch({ payload: v / 1000 }); setCalcMsg(null); setCalcOk(false); }} />
                    <div className="flex gap-2">
                      <input value={guess} onChange={(e) => setGuess(e.target.value)} inputMode="decimal" placeholder="Ước tính (N·m)" aria-label="Moment ước tính" className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm" />
                      <button type="button" onClick={checkGuess} className="rounded-lg bg-[#1E3F82] px-3 py-1.5 text-sm font-bold text-white">
                        Kiểm tra
                      </button>
                    </div>
                  </>
                )}

                {calc === 1 && (
                  <>
                    <p className="text-sm text-stone-700">
                      Giờ vật gắp nặng <b>500 g</b>. Moment vai mô phỏng được là <b>{t ? t.lift.toFixed(2) : '…'} N·m</b>. Hãy chọn nguồn cho động cơ sao cho vai chỉ dùng <b>tối đa 80%</b> sức chịu, để còn dư an toàn.
                    </p>
                    <div className="flex gap-2">
                      {(Object.entries(SUPPLY) as [SupplyKey, (typeof SUPPLY)[SupplyKey]][]).map(([k, sp]) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={params.supply === k}
                          onClick={() => { patch({ supply: k }); setCalcMsg(null); setCalcOk(false); }}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${params.supply === k ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-stone-200 bg-white text-stone-600'}`}
                        >
                          {sp.label}
                          <br />
                          {sp.kgcm} kg·cm
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={checkMotor} className="rounded-lg bg-[#1E3F82] px-3 py-1.5 text-sm font-bold text-white">
                      Kiểm tra lựa chọn
                    </button>
                  </>
                )}

                {calc === 2 && (
                  <>
                    <p className="text-sm text-stone-700">Giữ nguồn 7,4 V và vật 500 g. Hãy tự chỉnh các khớp để đạt cả ba điều kiện bên dưới. Gợi ý: gập khuỷu để kéo vật lại gần trục vai.</p>
                    <ul className="flex flex-col gap-1 text-sm">
                      {optimizeOk && t && tip && (
                        <>
                          <Check ok={optimizeOk.torque} text={`Moment vai dưới 60% giới hạn (${((t.lift / t.limit) * 100).toFixed(0)}%)`} />
                          <Check ok={optimizeOk.forward} text={`Đầu tay ra phía trước ít nhất 12 cm (${Math.round(tip.x * 100)} cm)`} />
                          <Check ok={optimizeOk.height} text={`Đầu tay cao hơn mặt bàn ít nhất 5 cm (${Math.round(tip.y * 100)} cm)`} />
                        </>
                      )}
                    </ul>
                    <div className="flex flex-col gap-1">
                      <Slider label="Vai" unit="°" value={params.lift} min={LIMITS.lift[0]} max={LIMITS.lift[1]} onChange={(v) => patch({ lift: v })} />
                      <Slider label="Khuỷu" unit="°" value={params.elbow} min={LIMITS.elbow[0]} max={LIMITS.elbow[1]} onChange={(v) => patch({ elbow: v })} />
                      <Slider label="Gập tay" unit="°" value={params.flex} min={LIMITS.flex[0]} max={LIMITS.flex[1]} onChange={(v) => patch({ flex: v })} />
                    </div>
                    {optimizeOk && optimizeOk.torque && optimizeOk.forward && optimizeOk.height && (
                      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Đạt cả ba điều kiện. Gập khuỷu làm cánh tay đòn ngắn lại nên moment giảm mà vẫn gắp được.</p>
                    )}
                  </>
                )}

                {calcMsg && <p className={`rounded-lg px-3 py-2 text-sm ${calcMsg.ok ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>{calcMsg.text}</p>}

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
                    <button type="button" onClick={() => goPhase('tune')} className="flex-1 rounded-lg bg-[#1E3F82] px-3 py-1.5 text-sm font-bold text-white">
                      Sang thử tự do
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">Moment vai so với giới hạn</h2>
                {t && <div className="mt-3"><Gauge label="Vai" value={t.lift} limit={t.limit} /></div>}
              </div>
            </>
          )}

          {phase === 'tune' && wired && (
            <>
              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex gap-2" role="group" aria-label="Cách điều khiển">
                  {[
                    { on: false, label: 'Chỉnh từng khớp' },
                    { on: true, label: 'Chọn điểm đích' },
                  ].map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      aria-pressed={ikOn === o.on}
                      onClick={() => toggleIk(o.on)}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${ikOn === o.on ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-stone-200 text-stone-600'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {ikOn ? (
                  <div className="mt-3 flex flex-col gap-1">
                    <Slider label="Tiến" unit="cm" value={target.x * 100} min={-30} max={35} onChange={(v) => moveTarget({ x: v / 100 })} />
                    <Slider label="Ngang" unit="cm" value={target.z * 100} min={-30} max={30} onChange={(v) => moveTarget({ z: v / 100 })} />
                    <Slider label="Cao" unit="cm" value={target.y * 100} min={0} max={40} onChange={(v) => moveTarget({ y: v / 100 })} />
                    {!reachable && <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Điểm này nằm ngoài tầm với hoặc vượt giới hạn khớp. Cánh tay chỉ tới gần nhất có thể.</p>}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-1">
                    <Slider label="Xoay đế" unit="°" value={params.pan} min={LIMITS.pan[0]} max={LIMITS.pan[1]} onChange={(v) => patch({ pan: v })} />
                    <Slider label="Vai" unit="°" value={params.lift} min={LIMITS.lift[0]} max={LIMITS.lift[1]} onChange={(v) => patch({ lift: v })} />
                    <Slider label="Khuỷu" unit="°" value={params.elbow} min={LIMITS.elbow[0]} max={LIMITS.elbow[1]} onChange={(v) => patch({ elbow: v })} />
                    <Slider label="Gập tay" unit="°" value={params.flex} min={LIMITS.flex[0]} max={LIMITS.flex[1]} onChange={(v) => patch({ flex: v })} />
                    <Slider label="Xoay tay" unit="°" value={params.roll} min={LIMITS.roll[0]} max={LIMITS.roll[1]} onChange={(v) => patch({ roll: v })} />
                  </div>
                )}
                <Slider label="Mở kẹp" unit="%" value={params.grip * 100} min={0} max={100} onChange={(v) => patch({ grip: v / 100 })} />
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">Thiết kế</h2>
                <div className="mt-2 flex flex-col gap-1">
                  <Slider label="Vật gắp" unit="g" value={params.payload * 1000} min={0} max={500} step={10} onChange={(v) => patch({ payload: v / 1000 })} />
                  <label className="mt-1 flex items-center gap-3 text-xs text-stone-500">
                    <span className="w-16">Động cơ</span>
                    <select value={params.supply} onChange={(e) => patch({ supply: e.target.value as SupplyKey })} className="flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-sm text-stone-700">
                      {Object.entries(SUPPLY).map(([k, s]) => (
                        <option key={k} value={k}>
                          {s.label} ({s.kgcm} kg·cm)
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">Moment động cơ phải chịu</h2>
                {t && tip && (
                  <>
                    <div className="mt-3 flex flex-col gap-3">
                      <Gauge label="Vai" value={t.lift} limit={t.limit} />
                      <Gauge label="Khuỷu" value={t.elbow} limit={t.limit} />
                      <Gauge label="Gập tay" value={t.flex} limit={t.limit} />
                    </div>
                    {overloaded && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">Có động cơ quá tải ở tư thế này. Thử gập khuỷu cho tay gọn lại, bỏ bớt vật gắp hoặc đổi sang động cơ mạnh hơn.</p>}
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-stone-500">
                      <Row k="Tiến" v={`${Math.round(tip.x * 100)} cm`} />
                      <Row k="Ngang" v={`${Math.round(tip.z * 100)} cm`} />
                      <Row k="Độ cao" v={`${Math.round(tip.y * 100)} cm`} />
                    </dl>
                  </>
                )}
              </div>
            </>
          )}
          {(phase === 'wire' || phase === 'design' || phase === 'tune') && model && (
            <LabAssistant
              lab="arm"
              stage={phase === 'design' ? `calc-${calc + 1}` : phase}
              canHint={phase === 'design' || phase === 'wire'}
              getState={() =>
                phase === 'wire'
                  ? ARM_WIRING.state(wiring.wires)
                  : phase === 'design'
                  ? { exercise: `Bài ${calc + 1}`, given_values: { payload_kg: params.payload, reach_m: Number(reach.toFixed(2)), supply: params.supply } }
                  : simulationState(model.robot, params)
              }
            />
          )}
        </aside>
      </div>
    </div>
  );
}

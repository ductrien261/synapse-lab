'use client';

import { useMemo, useState } from 'react';
import { buildWiring, checkExercise, exerciseDefaults, exerciseState, toAsmParts } from '@/lib/lab/package/build';
import { fill } from '@/lib/lab/package/expr';
import { validatePackage } from '@/lib/lab/package/validate';
import type { LabPackage } from '@/lib/lab/package/types';
import { BuildPanel, LearnPanel, PartList, PreviewPanel, useAssembly, type Stage, type StageDef } from '../shared/assembly';
import { LabAssistant } from '../shared/LabAssistant';
import { LabLayout } from '../shared/LabLayout';
import { Card, NumberGuess, Notice, Slider, parseGuess } from '../shared/LabUi';
import { OverviewBox } from '../shared/OverviewBox';
import { TerminalList, WiringPanel, useWiring } from '../shared/WiringKit';
import { GenericDiagram, GenericWiringDiagram } from './GenericScene';
import { useIotMoistureTune } from './useIotMoistureTune';

const STAGES: StageDef[] = [
  { key: 'learn', label: '1. Tìm hiểu' },
  { key: 'preview', label: '2. Xem quy trình' },
  { key: 'build', label: '3. Tự lắp ráp' },
  { key: 'wire', label: '4. Đi dây' },
  { key: 'design', label: '5. Tính toán' },
  { key: 'tune', label: '6. Thử tự do' },
];

/** Trợ lý AI hiện chỉ biết ngữ cảnh của ba bài viết tay; gói bài dùng ngữ cảnh gần nhất theo mẫu mô phỏng. */
const ASSISTANT_LAB = { 'iot-moisture': 'iot' } as const;

/** Màn hình chung: dựng đủ sáu bước của một bài thực hành từ gói JSON. */
export function GenericLab({ pkg }: { pkg: LabPackage }) {
  const errors = useMemo(() => validatePackage(pkg), [pkg]);
  if (errors.length > 0) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Notice ok={false}>Gói bài thực hành không hợp lệ:</Notice>
        <ul className="mt-3 list-disc pl-5 text-sm text-stone-700">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }
  return <LabBody pkg={pkg} />;
}

function LabBody({ pkg }: { pkg: LabPackage }) {
  const [stage, setStage] = useState<Stage>('learn');
  const parts = useMemo(() => toAsmParts(pkg), [pkg]);
  const W = useMemo(() => buildWiring(pkg), [pkg]);
  const a = useAssembly(parts, stage, pkg.buildOrder);
  const wiring = useWiring(W);
  const wired = wiring.status.complete;

  // Bước tính toán
  const [calc, setCalc] = useState(0);
  const ex = pkg.exercises[calc];
  const [values, setValues] = useState<Record<string, number>>(() => exerciseDefaults(pkg.exercises[0]));
  const [guess, setGuess] = useState('');
  const [calcMsg, setCalcMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [calcOk, setCalcOk] = useState(false);

  const tune = useIotMoistureTune({ active: stage === 'tune', wired, wiringProgress: `${wiring.status.netsDone}/${wiring.status.netsTotal} mạch`, onGoWire: () => goStage('wire') });

  const startCalc = (step: number) => {
    setCalc(step);
    setValues(exerciseDefaults(pkg.exercises[step]));
    setCalcMsg(null);
    setCalcOk(false);
    setGuess('');
  };

  const goStage = (s: Stage) => {
    a.enter(s);
    wiring.reset();
    setStage(s);
    if (s === 'design') startCalc(0);
    if (s === 'tune') tune.reset();
    else tune.stop();
  };

  const check = () => {
    const g = parseGuess(guess);
    if (g === null) {
      setCalcMsg({ ok: false, text: 'Hãy nhập một số dương, ví dụ 1.6.' });
      return;
    }
    const r = checkExercise(ex, values, g);
    setCalcOk(r.ok);
    setCalcMsg(r);
  };

  const setValue = (name: string, v: number) => {
    setValues((cur) => ({ ...cur, [name]: v }));
    setCalcMsg(null);
    setCalcOk(false);
  };

  const learning = stage === 'learn' || stage === 'preview' || stage === 'build';

  let viewport;
  if (stage === 'wire') {
    viewport = <GenericWiringDiagram pkg={pkg} W={W} wires={wiring.wires} pending={wiring.pending} hover={wiring.hover} onPick={wiring.pick} onHover={wiring.setHover} onRemoveWire={wiring.remove} onMiss={() => wiring.setPending(null)} />;
  } else if (stage === 'tune') {
    viewport = tune.viewport;
  } else if (stage === 'design') {
    viewport = <GenericDiagram pkg={pkg} installed={pkg.parts.length} focus={ex.focus} guides={false} />;
  } else {
    viewport = <GenericDiagram pkg={pkg} installed={a.installed} focus={a.focus} guides={stage !== 'learn'} onPick={a.pick} onMiss={stage === 'learn' ? () => a.setSelected(null) : undefined} />;
  }

  const getState = (): Record<string, unknown> => {
    if (stage === 'wire') return W.state(wiring.wires);
    if (stage === 'tune') return tune.getState();
    if (stage === 'design') return exerciseState(ex, values);
    return { stage, parts: pkg.parts.map((p) => p.name) };
  };

  const side = (
    <>
      {stage === 'learn' && <LearnPanel parts={parts} a={a} onNext={() => goStage('preview')} />}
      {stage === 'preview' && <PreviewPanel parts={parts} a={a} onStart={() => goStage('build')} />}
      {stage === 'build' && <BuildPanel parts={parts} a={a} doneText={pkg.texts.buildDone} doneLabel={pkg.texts.buildDoneLabel} onDone={() => goStage('wire')} />}
      {stage === 'wire' && <WiringPanel w={wiring} onNext={() => goStage('design')} doneText={pkg.wiring.doneText} />}

      {stage === 'design' && (
        <Card tone="accent">
          <div className="flex gap-1.5" aria-label="Tiến độ">
            {pkg.exercises.map((e, i) => (
              <span key={e.title} className={`h-1.5 flex-1 rounded-full ${i <= calc ? 'bg-[#1E3F82]' : 'bg-[#1E3F82]/20'}`} />
            ))}
          </div>
          <h2 className="text-sm font-bold text-[#0F2258]">
            Bài {calc + 1}/{pkg.exercises.length}: {ex.title}
          </h2>
          <p className="text-sm text-stone-700">{fill(ex.prompt, { ...ex.constants, ...values })}</p>
          {ex.inputs.map((inp) => (
            <Slider key={inp.name} label={inp.label} unit={inp.unit} value={values[inp.name]} min={inp.min} max={inp.max} step={inp.step} onChange={(v) => setValue(inp.name, v)} />
          ))}
          <NumberGuess value={guess} onChange={setGuess} onCheck={check} placeholder={ex.placeholder} />
          {calcMsg && <Notice ok={calcMsg.ok}>{calcMsg.text}</Notice>}
          <div className="flex gap-2">
            {calc > 0 && (
              <button type="button" onClick={() => startCalc(calc - 1)} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700">
                Bài trước
              </button>
            )}
            {calc < pkg.exercises.length - 1 ? (
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

      {stage === 'tune' && tune.panel}

      {(stage === 'wire' || stage === 'design' || stage === 'tune') && (
        <LabAssistant lab={ASSISTANT_LAB[pkg.tune.template]} stage={stage === 'design' ? `calc-${calc + 1}` : stage} getState={getState} canHint={stage === 'design' || stage === 'wire'} />
      )}
    </>
  );

  return (
    <LabLayout
      title={pkg.title}
      subtitle={pkg.subtitle}
      stage={stage}
      stages={STAGES}
      onStage={goStage}
      list={stage === 'wire' ? <TerminalList w={wiring} /> : <PartList parts={parts} a={a} stage={learning ? stage : 'learn'} />}
      viewport={viewport}
      side={side}
      overlay={stage === 'learn' ? (pos) => <OverviewBox className={pos} title={pkg.overview.title} what={pkg.overview.what} steps={pkg.overview.steps} /> : undefined}
    />
  );
}

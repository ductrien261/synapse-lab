'use client';

import { useEffect, useState } from 'react';
import { Card, Notice, PrimaryButton, Row } from './LabUi';

export type Stage = 'learn' | 'preview' | 'build' | 'wire' | 'design' | 'tune';

export interface StageDef {
  key: Stage;
  label: string;
}

export const STAGES: StageDef[] = [
  { key: 'learn', label: '1. Tìm hiểu' },
  { key: 'preview', label: '2. Xem quy trình' },
  { key: 'build', label: '3. Tự lắp ráp' },
  { key: 'design', label: '4. Tính toán' },
  { key: 'tune', label: '5. Thử tự do' },
];

/** Một bộ phận của thiết bị, đủ thông tin để học, xem quy trình và tự lắp. */
export interface AsmPart {
  id: string;
  name: string;
  role: string;
  color: string;
  /** Mục tiêu bước lắp, mô tả theo chức năng để người học tự suy ra bộ phận */
  goal: string;
  hint: string;
  facts: { k: string; v: string }[];
  details: string[];
}

/** Trạng thái dùng chung cho ba giai đoạn tìm hiểu, xem quy trình và tự lắp ráp. */
export function useAssembly(parts: AsmPart[], stage: Stage, shuffled: number[]) {
  const [installed, setInstalled] = useState(parts.length);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || stage !== 'preview') return;
    const id = setInterval(() => {
      setInstalled((n) => {
        if (n >= parts.length) {
          setPlaying(false);
          return n;
        }
        return n + 1;
      });
    }, 1800);
    return () => clearInterval(id);
  }, [playing, stage, parts.length]);

  /** Gọi khi đổi giai đoạn */
  const enter = (s: Stage) => {
    setSelected(null);
    setFeedback(null);
    setShowHint(false);
    setPlaying(false);
    setInstalled(s === 'build' || s === 'preview' ? 0 : parts.length);
  };

  /** Người học chọn một bộ phận (trong danh sách hoặc trong hình) */
  const pick = (id: string) => {
    if (stage === 'preview') return;
    if (stage !== 'build') {
      setSelected(id);
      return;
    }
    const idx = parts.findIndex((p) => p.id === id);
    if (idx < installed) {
      setSelected(id);
      return;
    }
    if (idx === installed) {
      setInstalled(installed + 1);
      setSelected(id);
      setShowHint(false);
      setFeedback({ ok: true, text: `Đúng rồi. ${parts[idx].name}: ${parts[idx].role}` });
      return;
    }
    setSelected(null);
    setFeedback({ ok: false, text: `Chưa lắp được "${parts[idx].name}" lúc này, vì nó gắn vào "${parts[idx - 1].name}" mà bộ phận đó chưa có. Hãy xem lại mục tiêu của bước này.` });
  };

  /** Bộ phận được chú ý: khi xem quy trình là bộ phận vừa lắp */
  const focus: string | null = stage === 'preview' ? (installed > 0 ? parts[installed - 1].id : null) : selected;
  const order = stage === 'build' ? shuffled : parts.map((_, i) => i);

  return { installed, setInstalled, selected, setSelected, feedback, showHint, setShowHint, playing, setPlaying, enter, pick, focus, order };
}

export type Assembly = ReturnType<typeof useAssembly>;

interface PanelProps {
  parts: AsmPart[];
  a: Assembly;
}

export function PartList({ parts, a, stage }: PanelProps & { stage: Stage }) {
  return (
    <>
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">{stage === 'build' ? 'Linh kiện trên giá' : 'Danh sách bộ phận'}</h2>
      <ul className="mt-3 flex flex-col gap-1.5">
        {a.order.map((i) => {
          const p = parts[i];
          const placed = i < a.installed;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => a.pick(p.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  a.selected === p.id ? 'bg-[#EEF3FC] text-[#1E3F82]' : 'text-stone-700 hover:bg-stone-50'
                } ${stage === 'build' && placed ? 'opacity-40' : ''}`}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
                <span className="flex-1">{p.name}</span>
                {stage === 'build' && placed && <span className="text-xs text-green-700">Đã lắp</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function LearnPanel({ parts, a, onNext }: PanelProps & { onNext: () => void }) {
  const sel = parts.find((p) => p.id === a.selected) ?? null;
  return (
    <>
      <Card>
        {sel ? (
          <>
            <h2 className="text-lg font-bold text-[#0F2258]">{sel.name}</h2>
            <p className="text-sm text-stone-600">{sel.role}</p>
            <dl className="flex flex-col gap-1.5 text-sm">
              {sel.facts.map((f) => (
                <Row key={f.k} k={f.k} v={f.v} />
              ))}
            </dl>
            <ul className="list-disc pl-5 text-sm text-stone-600">
              {sel.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-stone-500">Bấm vào một bộ phận trong khung tương tác hoặc trong danh sách để xem chức năng của nó.</p>
        )}
      </Card>
      <PrimaryButton onClick={onNext}>Xem quy trình lắp ráp</PrimaryButton>
    </>
  );
}

export function PreviewPanel({ parts, a, onStart }: PanelProps & { onStart: () => void }) {
  const btn = 'flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm font-semibold text-stone-700 disabled:opacity-40';
  return (
    <Card tone="accent">
      <h2 className="text-sm font-bold text-[#0F2258]">Quy trình lắp ráp</h2>
      <p className="text-sm text-stone-600">Xem trước thứ tự lắp để lát nữa tự làm. Bộ phận vừa lắp sẽ nổi bật, phần còn lại mờ đi.</p>
      <ol className="flex flex-col gap-1">
        {parts.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => {
                a.setPlaying(false);
                a.setInstalled(i + 1);
              }}
              className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${a.installed === i + 1 ? 'bg-white font-semibold text-[#1E3F82]' : i < a.installed ? 'text-stone-500' : 'text-stone-400'}`}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: p.color }}>
                {i + 1}
              </span>
              <span className="flex-1">{p.name}</span>
            </button>
          </li>
        ))}
      </ol>
      {a.installed > 0 && <p className="rounded-lg bg-white px-3 py-2 text-sm text-stone-600">{parts[a.installed - 1].goal}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={a.installed === 0}
          onClick={() => {
            a.setPlaying(false);
            a.setInstalled((n) => Math.max(0, n - 1));
          }}
          className={btn}
        >
          Lùi
        </button>
        <button
          type="button"
          onClick={() => {
            if (a.installed >= parts.length) a.setInstalled(0);
            a.setPlaying((p) => !p);
          }}
          className={btn}
        >
          {a.playing ? 'Dừng' : 'Tự chạy'}
        </button>
        <button
          type="button"
          disabled={a.installed >= parts.length}
          onClick={() => {
            a.setPlaying(false);
            a.setInstalled((n) => Math.min(parts.length, n + 1));
          }}
          className={btn}
        >
          Tiếp
        </button>
      </div>
      <PrimaryButton onClick={onStart}>Tôi đã nắm, tự lắp thử</PrimaryButton>
    </Card>
  );
}

export function BuildPanel({ parts, a, doneText, onDone, doneLabel = 'Sang bước tính toán' }: PanelProps & { doneText: string; onDone: () => void; doneLabel?: string }) {
  const done = a.installed === parts.length;
  return (
    <Card tone="accent">
      <div className="flex gap-1.5" aria-label="Tiến độ lắp ráp">
        {parts.map((p, i) => (
          <span key={p.id} className={`h-1.5 flex-1 rounded-full ${i < a.installed ? 'bg-[#1E3F82]' : 'bg-[#1E3F82]/20'}`} />
        ))}
      </div>
      {!done ? (
        <>
          <h2 className="text-sm font-bold text-[#0F2258]">
            Bước {a.installed + 1}/{parts.length}
          </h2>
          <p className="text-sm text-stone-700">{parts[a.installed].goal}</p>
          <p className="text-sm text-stone-500">Chọn đúng linh kiện trong khung tương tác hoặc trong danh sách.</p>
          {a.showHint ? (
            <p className="rounded-lg bg-white px-3 py-2 text-sm text-stone-600">{parts[a.installed].hint}</p>
          ) : (
            <button type="button" onClick={() => a.setShowHint(true)} className="self-start text-sm font-semibold text-[#1E3F82]">
              Xem gợi ý
            </button>
          )}
        </>
      ) : (
        <>
          <h2 className="text-sm font-bold text-green-800">Lắp xong</h2>
          <p className="text-sm text-stone-700">{doneText}</p>
          <PrimaryButton onClick={onDone}>{doneLabel}</PrimaryButton>
        </>
      )}
      {a.feedback && <Notice ok={a.feedback.ok}>{a.feedback.text}</Notice>}
    </Card>
  );
}

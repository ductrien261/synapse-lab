'use client';

import { useEffect, useMemo, useState } from 'react';
import { track } from '@/lib/analytics';
import { ArrowCounterclockwise, PauseFill, PlayFill, Shuffle, SkipBackwardFill, SkipForwardFill } from 'react-bootstrap-icons';

// Mô phỏng sắp xếp chạy thật trên trình duyệt: mỗi bước là một khung hình kèm dòng mã và diễn giải.

type AlgoKey = 'bubble' | 'insertion';

interface Frame {
  arr: number[];
  compare: number[];
  swap: boolean;
  sorted: number[];
  line: number;
  text: string;
}

const CODE: Record<AlgoKey, { name: string; lines: string[] }> = {
  bubble: {
    name: 'Sắp xếp nổi bọt',
    lines: ['for i in range(n - 1):', '    for j in range(n - 1 - i):', '        if a[j] > a[j + 1]:', '            a[j], a[j + 1] = a[j + 1], a[j]'],
  },
  insertion: {
    name: 'Sắp xếp chèn',
    lines: ['for i in range(1, n):', '    j = i', '    while j > 0 and a[j - 1] > a[j]:', '        a[j - 1], a[j] = a[j], a[j - 1]', '        j -= 1'],
  },
};

const INITIAL = [42, 18, 77, 30, 64, 11, 55, 90, 25, 70];

function bubbleFrames(input: number[]): Frame[] {
  const a = [...input];
  const n = a.length;
  const sorted: number[] = [];
  const frames: Frame[] = [{ arr: [...a], compare: [], swap: false, sorted: [], line: 0, text: 'Bắt đầu: duyệt mảng và đẩy phần tử lớn nhất về cuối sau mỗi lượt.' }];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      frames.push({ arr: [...a], compare: [j, j + 1], swap: false, sorted: [...sorted], line: 2, text: `So sánh ${a[j]} và ${a[j + 1]}.` });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        frames.push({ arr: [...a], compare: [j, j + 1], swap: true, sorted: [...sorted], line: 3, text: `${a[j + 1]} lớn hơn ${a[j]} nên đổi chỗ hai phần tử.` });
      }
    }
    sorted.push(n - 1 - i);
    frames.push({ arr: [...a], compare: [], swap: false, sorted: [...sorted], line: 0, text: `Kết thúc lượt ${i + 1}: ${a[n - 1 - i]} đã về đúng vị trí.` });
  }
  frames.push({ arr: [...a], compare: [], swap: false, sorted: a.map((_, k) => k), line: 0, text: 'Hoàn tất: mảng đã được sắp xếp tăng dần.' });
  return frames;
}

function insertionFrames(input: number[]): Frame[] {
  const a = [...input];
  const n = a.length;
  const frames: Frame[] = [{ arr: [...a], compare: [], swap: false, sorted: [0], line: 0, text: 'Bắt đầu: phần đầu mảng luôn được giữ ở trạng thái đã sắp xếp.' }];
  for (let i = 1; i < n; i++) {
    const prefix = Array.from({ length: i }, (_, k) => k);
    frames.push({ arr: [...a], compare: [i], swap: false, sorted: prefix, line: 1, text: `Lấy ${a[i]} để chèn vào phần đã sắp xếp.` });
    let j = i;
    while (j > 0) {
      frames.push({ arr: [...a], compare: [j - 1, j], swap: false, sorted: prefix, line: 2, text: `So sánh ${a[j - 1]} và ${a[j]}.` });
      if (a[j - 1] <= a[j]) break;
      [a[j - 1], a[j]] = [a[j], a[j - 1]];
      frames.push({ arr: [...a], compare: [j - 1, j], swap: true, sorted: prefix, line: 3, text: `${a[j]} lớn hơn ${a[j - 1]} nên dịch sang phải.` });
      j--;
    }
  }
  frames.push({ arr: [...a], compare: [], swap: false, sorted: a.map((_, k) => k), line: 0, text: 'Hoàn tất: mảng đã được sắp xếp tăng dần.' });
  return frames;
}

const SPEEDS = [
  { label: '0.5×', ms: 1100 },
  { label: '1×', ms: 600 },
  { label: '2×', ms: 280 },
];

export function SortDemo({ compact = false }: { compact?: boolean }) {
  const [algo, setAlgo] = useState<AlgoKey>('bubble');
  const [data, setData] = useState(INITIAL);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const frames = useMemo(() => (algo === 'bubble' ? bubbleFrames(data) : insertionFrames(data)), [algo, data]);
  const last = frames.length - 1;
  const frame = frames[Math.min(index, last)];
  const max = Math.max(...data);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((i) => {
        if (i >= last) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, SPEEDS[speed].ms);
    return () => window.clearInterval(timer);
  }, [playing, speed, last]);

  const restart = (next?: Partial<{ algo: AlgoKey; data: number[] }>) => {
    if (next?.algo) setAlgo(next.algo);
    if (next?.data) setData(next.data);
    setIndex(0);
    setPlaying(false);
  };

  const shuffle = () => restart({ data: Array.from({ length: INITIAL.length }, () => 8 + Math.floor(Math.random() * 90)) });

  const barColor = (k: number) => {
    if (frame.compare.includes(k)) return frame.swap ? 'bg-rose-500' : 'bg-amber-400';
    if (frame.sorted.includes(k)) return 'bg-[#1E3F82]';
    return 'bg-[#B9CFEE]';
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm font-semibold" role="tablist" aria-label="Chọn giải thuật">
          {(Object.keys(CODE) as AlgoKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={algo === key}
              onClick={() => restart({ algo: key })}
              className={`rounded-md px-3 py-1.5 transition-colors ${algo === key ? 'bg-white text-[#1E3F82] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {CODE[key].name}
            </button>
          ))}
        </div>
        <span className="text-sm tabular-nums text-slate-500">
          Bước {index + 1}/{frames.length}
        </span>
      </div>

      <div className={`grid gap-0 ${compact ? '' : 'lg:grid-cols-[1.4fr_1fr]'}`}>
        <div className="p-5">
          <div className="flex h-52 items-end gap-2" aria-hidden>
            {frame.arr.map((v, k) => (
              <div key={k} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-xs font-semibold tabular-nums text-slate-500">{v}</span>
                <div className={`w-full rounded-t-md transition-all duration-300 ${barColor(k)}`} style={{ height: `${(v / max) * 170}px` }} />
              </div>
            ))}
          </div>
          <p className="mt-4 min-h-[48px] text-[15px] leading-relaxed text-slate-700" aria-live="polite">
            {frame.text}
          </p>
        </div>
        {!compact && (
          <div className="border-t border-slate-100 bg-[#0B1A44] p-5 font-mono text-[13px] leading-7 text-white/65 lg:border-l lg:border-t-0">
            {CODE[algo].lines.map((line, k) => (
              <div key={k} className={`-mx-2 whitespace-pre rounded px-2 ${frame.line === k ? 'bg-amber-400/20 text-white' : ''}`}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
        <ControlButton label="Bước trước" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
          <SkipBackwardFill className="h-4 w-4" />
        </ControlButton>
        <button
          type="button"
          onClick={() => {
            if (index >= last) restart();
            else {
              if (!playing) track('sort_demo_played', { algo });
              setPlaying((p) => !p);
            }
          }}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1E3F82] px-5 text-sm font-semibold text-white hover:bg-[#163070]"
        >
          {playing ? <PauseFill className="h-4 w-4" /> : <PlayFill className="h-4 w-4" />}
          {playing ? 'Tạm dừng' : index >= last ? 'Chạy lại' : 'Chạy'}
        </button>
        <ControlButton label="Bước tiếp" onClick={() => setIndex((i) => Math.min(last, i + 1))}>
          <SkipForwardFill className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Về đầu" onClick={() => restart()}>
          <ArrowCounterclockwise className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Dữ liệu ngẫu nhiên" onClick={shuffle}>
          <Shuffle className="h-4 w-4" />
        </ControlButton>
        <div className="ml-auto inline-flex rounded-lg border border-slate-200 p-0.5 text-sm font-semibold" aria-label="Tốc độ">
          {SPEEDS.map((s, k) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setSpeed(k)}
              aria-pressed={speed === k}
              className={`rounded-md px-2.5 py-1.5 ${speed === k ? 'bg-[#E8F0FB] text-[#1E3F82]' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-[#1E3F82] hover:text-[#1E3F82]"
    >
      {children}
    </button>
  );
}

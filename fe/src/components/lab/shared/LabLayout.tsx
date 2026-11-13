'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { STAGES, type Stage } from './assembly';

interface Props {
  title: string;
  subtitle: string;
  stage: Stage;
  onStage: (s: Stage) => void;
  /** Cột trái: danh sách bộ phận */
  list: ReactNode;
  /** Khung tương tác ở giữa (SVG hoặc 3D) */
  viewport: ReactNode;
  /** Cột phải: nội dung theo giai đoạn */
  side: ReactNode;
  /** Hộp nổi trong khung tương tác (nhận lớp CSS vị trí, đã tránh bảng bên trái khi toàn màn hình) */
  overlay?: (position: string) => ReactNode;
}

/**
 * Bố cục chung cho các bài thí nghiệm: ba cột, vừa chiều cao màn hình,
 * và chế độ toàn màn hình (khung tương tác phủ kín, các bảng thành hộp nổi).
 */
export function LabLayout({ title, subtitle, stage, onStage, list, viewport, side, overlay }: Props) {
  const [full, setFull] = useState(false);
  const [hidePanels, setHidePanels] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const floatCls = 'rounded-2xl border border-stone-200 bg-white/95 shadow-xl backdrop-blur';

  return (
    <div ref={rootRef} className={full ? 'fixed inset-0 z-[60] bg-[#F7F9FD]' : 'flex flex-col gap-4'}>
      <div className={full ? `${floatCls} absolute left-3 right-16 top-3 z-20 flex flex-wrap items-center justify-between gap-2 px-4 py-2` : 'flex flex-wrap items-end justify-between gap-3'}>
        <div>
          <h1 className={`${full ? 'text-lg' : 'text-2xl'} font-bold tracking-tight text-[#0F2258]`}>{title}</h1>
          {!full && <p className="text-sm text-stone-500">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Giai đoạn học">
          {STAGES.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={stage === p.key}
              onClick={() => onStage(p.key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                stage === p.key ? 'border-[#1E3F82] bg-[#1E3F82] text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-[#1E3F82]/40'
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
        <aside className={full ? `${floatCls} absolute left-3 top-20 z-10 max-h-[calc(100%-6rem)] w-56 overflow-y-auto p-4 ${hidePanels ? 'hidden' : ''}` : 'max-h-[calc(100svh-14rem)] min-h-0 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 lg:order-1'}>{list}</aside>

        <section className={full ? 'absolute inset-0' : 'relative min-w-0 lg:order-2'}>
          <div className={full ? 'h-full w-full overflow-hidden bg-[#F7F9FD]' : 'h-[420px] overflow-hidden rounded-2xl border border-stone-200 bg-[#F7F9FD] lg:h-[calc(100svh-14rem)] lg:min-h-[460px]'}>{viewport}</div>
          {overlay?.(full && !hidePanels ? 'left-[15.5rem] bottom-3' : 'left-3 bottom-3')}
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
        </section>

        <aside className={full ? `absolute right-3 top-20 z-10 flex max-h-[calc(100%-6rem)] w-80 flex-col gap-3 overflow-y-auto ${hidePanels ? 'hidden' : ''}` : 'flex max-h-[calc(100svh-14rem)] min-h-0 flex-col gap-4 overflow-y-auto lg:order-3'}>{side}</aside>
      </div>
    </div>
  );
}

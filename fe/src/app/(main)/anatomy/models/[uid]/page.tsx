'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  ArrowCounterclockwise,
  ArrowLeft,
  ArrowsFullscreen,
  BoxArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Controller,
  InfoCircle,
  JournalText,
  Robot,
} from 'react-bootstrap-icons';
import { anatomyApi, modelTitle, type AnatomyModelDetail } from '@/lib/anatomy-catalog';
import { useSketchfabViewer } from '@/lib/sketchfab';
import { addRecent } from '@/lib/recent';
import { InfoTab } from '@/components/anatomy/PartPanel';
import { PartsBar } from '@/components/anatomy/PartsBar';
import { NotesTab } from '@/components/anatomy/NotesTab';
import { QuizTab } from '@/components/anatomy/QuizTab';
import { AskAiTab } from '@/components/anatomy/AskAiTab';
import { TranslatableText } from '@/components/anatomy/TranslatableText';
import { partName, type PartItem } from '@/components/anatomy/types';

export default function AnatomyModelPage() {
  const { uid } = useParams<{ uid: string }>();
  const [model, setModel] = useState<AnatomyModelDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    anatomyApi
      .model(uid)
      .then((data) => {
        if (cancelled) return;
        setModel(data);
        addRecent({
          track: 'med',
          href: `/anatomy/models/${uid}`,
          title: modelTitle(data),
          subtitle: data.system_detail?.name_vi ?? 'Giải phẫu 3D',
          group: data.system ?? '',
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được mô hình');
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-sm font-semibold text-stone-700">{error}</p>
        <Link href="/anatomy" className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-[#1E3F82] text-white">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="aspect-[4/3] lg:aspect-auto lg:h-[640px] rounded-3xl bg-stone-200/70 animate-pulse" />
        <div className="h-[640px] rounded-3xl bg-stone-200/70 animate-pulse" />
      </div>
    );
  }

  return <ModelViewer model={model} />;
}

type TabKey = 'info' | 'notes' | 'quiz' | 'ai';

const TABS: { key: TabKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: 'info', label: 'Thông tin', icon: InfoCircle },
  { key: 'notes', label: 'Ghi chú', icon: JournalText },
  { key: 'quiz', label: 'Tương tác', icon: Controller },
  { key: 'ai', label: 'Hỏi AI', icon: Robot },
];

function ModelViewer({ model }: { model: AnatomyModelDetail }) {
  const { iframeRef, status, annotations: viewerAnnotations, selected, select, recenter, onPick } =
    useSketchfabViewer(model.sketchfab_uid);
  const [tab, setTab] = useState<TabKey>('info');
  const [quizActive, setQuizActive] = useState(false);
  const frameBox = useRef<HTMLDivElement>(null);

  // Số thứ tự lấy theo Sketchfab; nội dung tiếng Việt lấy từ database (khớp theo index)
  const parts: PartItem[] = useMemo(() => {
    const fromDb = new Map(model.annotations.map((a) => [a.index, a]));
    const source =
      viewerAnnotations.length > 0
        ? viewerAnnotations.map((v) => ({ index: v.index, label: v.name, rawContent: v.content }))
        : model.annotations.map((a) => ({ index: a.index, label: a.label, rawContent: '' }));
    return source.map((p) => ({ ...p, structure: fromDb.get(p.index)?.structure ?? null }));
  }, [model.annotations, viewerAnnotations]);

  const position = selected !== null ? parts.findIndex((p) => p.index === selected) : -1;
  const current = position >= 0 ? parts[position] : null;
  const system = model.system_detail;

  const step = (delta: number) => {
    if (parts.length === 0) return;
    const next = position < 0 ? (delta > 0 ? 0 : parts.length - 1) : (position + delta + parts.length) % parts.length;
    select(parts[next].index);
  };

  const fullscreen = () => {
    const el = frameBox.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  // Đang làm thử thách thì không lộ tên bộ phận ở tiêu đề
  const headerTitle = quizActive ? 'Thử thách nhận diện' : current ? partName(current) : 'Chưa chọn bộ phận';

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Tiêu đề */}
      <div className="flex flex-col gap-2">
        <Link
          href={system ? `/anatomy?system=${system.slug}` : '/anatomy'}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-[#1E3F82] w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {system ? system.name_vi : 'Phòng giải phẫu'}
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">{modelTitle(model)}</h1>
        {model.title_vi && <p className="text-sm text-stone-500 -mt-1">{model.title}</p>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
        {/* Cột trái: khung 3D + thanh bộ phận */}
        <div className="flex flex-col gap-3 min-w-0">
          <div
            ref={frameBox}
            className="relative rounded-3xl overflow-hidden bg-[#0B1224] aspect-[4/3] lg:aspect-auto lg:h-[600px] shadow-[0_8px_32px_rgba(15,34,88,0.15)]"
          >
            <iframe
              ref={iframeRef}
              title={modelTitle(model)}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen; xr-spatial-tracking"
              allowFullScreen
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <ToolButton label="Về góc nhìn ban đầu" onClick={recenter} disabled={status !== 'ready'}>
                <ArrowCounterclockwise className="w-4 h-4" />
              </ToolButton>
              <ToolButton label="Toàn màn hình" onClick={fullscreen}>
                <ArrowsFullscreen className="w-3.5 h-3.5" />
              </ToolButton>
            </div>
            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-3 text-white/70">
                  <div className="w-8 h-8 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Đang tải mô hình 3D...</span>
                </div>
              </div>
            )}
            {status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center text-center p-6">
                <div className="text-white/80 text-sm">
                  Không tải được mô hình.{' '}
                  <a href={model.sketchfab_url} target="_blank" rel="noreferrer" className="underline">
                    Mở trên Sketchfab
                  </a>
                </div>
              </div>
            )}
          </div>

          <PartsBar
            parts={parts}
            selected={selected}
            onSelect={select}
            hideNames={quizActive}
            loading={status === 'loading'}
          />
        </div>

        {/* Cột phải: bảng thông tin */}
        <aside className="bg-white rounded-3xl border border-stone-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col lg:h-[654px] overflow-hidden">
          {/* Bộ phận đang chọn + trước/sau */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-stone-100">
            <NavButton label="Bộ phận trước" onClick={() => step(-1)} disabled={parts.length === 0 || quizActive}>
              <ChevronLeft className="w-4 h-4" />
            </NavButton>
            <div className="flex-1 min-w-0 flex items-center gap-2 justify-center">
              {current && !quizActive && (
                <span className="w-6 h-6 rounded-full bg-[#1E3F82] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {current.index + 1}
                </span>
              )}
              <span className={`truncate text-sm font-bold ${current || quizActive ? 'text-stone-900' : 'text-stone-400'}`}>
                {headerTitle}
              </span>
            </div>
            <NavButton label="Bộ phận sau" onClick={() => step(1)} disabled={parts.length === 0 || quizActive}>
              <ChevronRight className="w-4 h-4" />
            </NavButton>
          </div>

          {/* Tab */}
          <div className="grid grid-cols-4 gap-1 p-1.5 mx-3 mt-3 rounded-2xl bg-stone-100" role="tablist">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                  tab === key ? 'bg-white text-[#1E3F82] shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'info' && <InfoTab part={current} />}
            {tab === 'notes' && <NotesTab modelUid={model.sketchfab_uid} part={current} parts={parts} onJump={select} />}
            {tab === 'quiz' && (
              <QuizTab
                parts={parts}
                onSelect={select}
                onPick={onPick}
                onActiveChange={setQuizActive}
              />
            )}
            {tab === 'ai' && <AskAiTab part={current} modelTitle={modelTitle(model)} />}
          </div>
        </aside>
      </div>

      {/* Giới thiệu + ghi công */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-5 md:p-6 flex flex-col gap-4">
        {model.description && (
          <div>
            <h2 className="text-sm font-bold text-stone-900 mb-2">Giới thiệu mô hình</h2>
            <TranslatableText text={model.description} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-500 pt-3 border-t border-stone-100">
          <span>
            Tác giả:{' '}
            {model.author_url ? (
              <a href={model.author_url} target="_blank" rel="noreferrer" className="font-semibold text-stone-700 hover:text-[#1E3F82]">
                {model.author_name}
              </a>
            ) : (
              <span className="font-semibold text-stone-700">{model.author_name || '—'}</span>
            )}
          </span>
          {model.license_label && (
            <span>
              Giấy phép:{' '}
              {model.license_url ? (
                <a href={model.license_url} target="_blank" rel="noreferrer" className="font-semibold text-stone-700 hover:text-[#1E3F82]">
                  {model.license_label}
                </a>
              ) : (
                <span className="font-semibold text-stone-700">{model.license_label}</span>
              )}
            </span>
          )}
          <a
            href={model.sketchfab_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#1E3F82] hover:underline"
          >
            Xem trên Sketchfab <BoxArrowUpRight className="w-3 h-3" />
          </a>
          {model.source_url && (
            <a href={model.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1E3F82] hover:underline">
              Trang nguồn <BoxArrowUpRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur text-white flex items-center justify-center disabled:opacity-40 cursor-pointer transition-colors"
    >
      {children}
    </button>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-lg border border-stone-200 text-stone-600 flex items-center justify-center hover:border-[#1E3F82]/40 hover:text-[#1E3F82] disabled:opacity-40 cursor-pointer transition-colors"
    >
      {children}
    </button>
  );
}

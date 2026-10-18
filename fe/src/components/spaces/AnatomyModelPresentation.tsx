'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, InfoCircle, X } from 'react-bootstrap-icons';
import { InfoTab } from '@/components/anatomy/PartPanel';
import { PartsBar } from '@/components/anatomy/PartsBar';
import { QuizTab } from '@/components/anatomy/QuizTab';
import { partName, type PartItem } from '@/components/anatomy/types';
import { anatomyApi, type AnatomyModelDetail } from '@/lib/anatomy-catalog';
import { useSketchfabViewer } from '@/lib/sketchfab';

export interface AnatomyPresentationModel {
  sketchfab_uid: string;
  title: string;
}
type DetailTab = 'info' | 'quiz';

export function AnatomyModelPresentation({ model, fitStage = false }: { model: AnatomyPresentationModel | null; fitStage?: boolean }) {
  const modelUid = model?.sketchfab_uid || '';
  const [detail, setDetail] = useState<AnatomyModelDetail | null>(null);
  const [detailError, setDetailError] = useState('');
  const [tab, setTab] = useState<DetailTab>('info');
  const [quizActive, setQuizActive] = useState(false);
  const { iframeRef, status, annotations: viewerAnnotations, selected, select, clearSelection, onPick, setLabelsVisible } = useSketchfabViewer(modelUid);

  useEffect(() => {
    if (!modelUid) return;
    let cancelled = false;
    anatomyApi.model(modelUid)
      .then((value) => { if (!cancelled) setDetail(value); })
      .catch((reason: unknown) => { if (!cancelled) setDetailError(reason instanceof Error ? reason.message : 'Không tải được thông tin mô hình.'); });
    return () => { cancelled = true; };
  }, [modelUid]);

  useEffect(() => {
    if (status === 'ready') setLabelsVisible(!quizActive);
  }, [quizActive, setLabelsVisible, status]);

  const parts: PartItem[] = useMemo(() => {
    const fromDatabase = new Map((detail?.annotations || []).map((annotation) => [annotation.index, annotation]));
    const source = viewerAnnotations.length > 0
      ? viewerAnnotations.map((annotation) => ({ index: annotation.index, label: annotation.name, rawContent: annotation.content }))
      : (detail?.annotations || []).map((annotation) => ({ index: annotation.index, label: annotation.label, rawContent: '' }));
    return source.map((part) => ({ ...part, structure: fromDatabase.get(part.index)?.structure || null }));
  }, [detail, viewerAnnotations]);

  if (!model) {
    return <div className="m-auto rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm text-amber-800">Mô hình 3D này không còn khả dụng.</div>;
  }

  const current = selected === null ? null : parts.find((part) => part.index === selected) || null;

  return <div className={`grid w-full min-w-0 overflow-auto rounded-xl bg-[#08111F] shadow-lg lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden ${fitStage ? 'h-full min-h-[420px]' : 'min-h-[560px]'}`}>
    <div className="flex min-h-0 min-w-0 flex-col">
      <div className="relative min-h-[360px] flex-1">
        <iframe ref={iframeRef} title={model.title} className="absolute inset-0 h-full w-full border-0" allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/55 px-3 py-2 text-[10px] font-bold text-white backdrop-blur">Mô hình 3D · {model.title}</span>
        {status === 'loading' && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#08111F]/70 text-xs font-semibold text-white/70"><span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />Đang tải mô hình…</div>}
        {status === 'error' && <div className="absolute inset-0 flex items-center justify-center bg-[#08111F] p-6 text-center text-sm text-white/70">Không mở được mô hình từ Sketchfab.</div>}
      </div>
      <div className="border-t border-white/10 bg-white px-3 py-2.5">
        <PartsBar parts={parts} selected={selected} onSelect={select} hideNames={quizActive} loading={status === 'loading'} />
      </div>
    </div>

    <aside className="flex min-h-0 flex-col border-t border-stone-200 bg-white text-stone-900 lg:border-l lg:border-t-0">
      <div className="flex min-h-14 items-center gap-2 border-b border-stone-100 px-3">
        {current && !quizActive ? <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1E3F82] text-[11px] font-bold text-white">{current.index + 1}</span> : null}
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{quizActive ? 'Tìm bộ phận trên mô hình' : current ? partName(current) : 'Chọn một con số trên mô hình'}</p><p className="mt-0.5 text-[9px] text-stone-400">{current ? 'Thông tin từ kho Giải phẫu Synapse' : `${parts.length} bộ phận có chú thích`}</p></div>
        {current && !quizActive && <button type="button" onClick={clearSelection} aria-label="Bỏ chọn bộ phận" className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"><X /></button>}
      </div>
      <div className="grid grid-cols-2 gap-1 border-b border-stone-100 bg-stone-50 p-1.5" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'info'} onClick={() => setTab('info')} className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-bold ${tab === 'info' ? 'bg-white text-[#1E3F82] shadow-sm' : 'text-stone-500'}`}><InfoCircle />Thông tin</button>
        <button type="button" role="tab" aria-selected={tab === 'quiz'} onClick={() => setTab('quiz')} className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-bold ${tab === 'quiz' ? 'bg-white text-[#1E3F82] shadow-sm' : 'text-stone-500'}`}><Controller />Bài tập</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {detailError && <p role="alert" className="m-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{detailError}</p>}
        {tab === 'info' && (current ? <InfoTab part={current} /> : <ModelOverview detail={detail} fallbackTitle={model.title} partCount={parts.length} />)}
        {tab === 'quiz' && <QuizTab key={model.sketchfab_uid} modelUid={model.sketchfab_uid} parts={parts} onSelect={select} onPick={onPick} onActiveChange={setQuizActive} />}
      </div>
    </aside>
  </div>;
}

function ModelOverview({ detail, fallbackTitle, partCount }: { detail: AnatomyModelDetail | null; fallbackTitle: string; partCount: number }) {
  const title = detail?.title_vi || detail?.title || fallbackTitle;
  const system = detail?.system_detail?.name_vi || detail?.system_detail?.name_en;
  return <div className="p-4">
    <div className="flex aspect-[16/7] items-center justify-center rounded-2xl bg-gradient-to-br from-[#EAF2FF] via-[#F7F9FF] to-violet-100 text-[#31599E]">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-lg font-black shadow-sm">3D</span>
    </div>
    <h3 className="mt-4 text-sm font-extrabold leading-5 text-stone-900">{title}</h3>
    <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">Mô hình 3D</span>{system && <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">{system}</span>}<span className="rounded-full bg-stone-100 px-2 py-1 text-[9px] font-bold text-stone-600">{partCount} bộ phận</span></div>
    {detail?.description && <p className="mt-3 text-xs leading-5 text-stone-600">{detail.description}</p>}
    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[10px] leading-5 text-blue-800"><strong>Khám phá từng bộ phận</strong><br />Bấm vào một con số trên mô hình hoặc chọn tên ở thanh phía dưới để xem định nghĩa, chức năng, liên hệ lâm sàng và tài liệu tham khảo.</div>
    {(detail?.author_name || detail?.license_label) && <p className="mt-3 text-[9px] leading-4 text-stone-400">{detail.author_name && <>Tác giả: {detail.author_name}</>}{detail.author_name && detail.license_label && ' · '}{detail.license_label}</p>}
  </div>;
}

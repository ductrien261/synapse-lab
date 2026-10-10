'use client';

/* Slide WebP files are already optimized by the rendering service. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import { BoxArrowUpRight, ChevronLeft, ChevronRight, Download, FileEarmarkText, LightningChargeFill, ZoomIn, ZoomOut } from 'react-bootstrap-icons';
import { requestBlob } from '@/lib/api';
import { getResourceTitle, type StudioResource } from './studio-resource';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api';

export function DocumentWorkspace({ resource, roomCode }: { resource?: StudioResource; roomCode: string }) {
  if (!resource) return <main className="flex min-h-[540px] items-center justify-center bg-[#F5F7FB]"><div className="text-center text-stone-400"><FileEarmarkText className="mx-auto h-10 w-10" /><p className="mt-3 text-xs font-bold">Chọn tài liệu để bắt đầu</p></div></main>;
  const resourceKindLabel = resource.kind === 'quiz' ? '?' : resource.kind === 'model_3d' ? '3D' : resource.kind.toUpperCase();
  return <main className="min-w-0 bg-[#F3F6FA] xl:min-h-0 xl:overflow-y-auto">
    <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-3"><div className="flex min-w-0 items-center gap-2.5"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[8px] font-extrabold text-white ${resource.kind === 'quiz' ? 'bg-violet-500' : 'bg-[#397BF6]'}`}>{resourceKindLabel}</span><h2 className="truncate text-sm font-extrabold text-stone-900">{getResourceTitle(resource)}</h2><span className="hidden rounded-full bg-[#EEF3FB] px-2 py-1 text-[8px] font-bold text-stone-500 sm:inline">{resource.kind === 'quiz' ? 'Tương tác' : resource.kind === 'model_3d' ? 'Mô hình 3D' : `Tài liệu (${resourceKindLabel})`}</span></div></div>
    <div className="m-3 overflow-hidden rounded-[20px] border border-stone-200/90 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.05)] sm:m-4">
      <div className={`flex items-center justify-center overflow-hidden bg-[#E9EEF5] ${resource.kind === 'model_3d' ? 'min-h-[630px] p-5 lg:p-7' : resource.kind === 'pdf' || resource.kind === 'doc' ? 'min-h-[690px] p-4' : resource.kind === 'slide' ? 'min-h-[690px] p-0' : 'min-h-[500px] p-4 sm:p-6'}`}>
        {resource.kind === 'quiz'
          ? <QuizCanvas resource={resource} />
          : resource.kind === 'model_3d' && resource.material.anatomyModel
            ? <Model3dCanvas resource={resource} />
            : resource.kind === 'pdf'
              ? <PdfCanvas key={resource.key} resource={resource} roomCode={roomCode} />
              : resource.kind === 'doc'
                ? <DocCanvas key={resource.key} resource={resource} />
                : resource.kind === 'slide'
                  ? <PptxCanvas key={resource.key} resource={resource} />
                  : <DocumentCanvas resource={resource} page={1} zoom={100} />}
      </div>
    </div>
  </main>;
}

function PptxCanvas({ resource }: { resource: Exclude<StudioResource, { kind: 'quiz' }> }) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const fileUrl = absoluteFileUrl(resource.material.fileUrl);
  const slideUrls = (resource.material.previewSlideUrls || []).map((url) => mediaPreviewUrl(absoluteFileUrl(url) || url));
  const isPptx = resource.material.name.toLowerCase().endsWith('.pptx');

  if (!fileUrl) return <MissingPreview resource={resource} message="Bài trình chiếu này chưa có tệp để xem trước." />;
  if (!isPptx) return <MissingPreview resource={resource} message="Định dạng .ppt cũ chưa thể xem trực tiếp. Hãy lưu lại thành .pptx." fileUrl={fileUrl} />;
  if (resource.material.previewStatus === 'processing') return <div className="flex min-h-[680px] w-full flex-col items-center justify-center bg-[#EDF1F6] text-center"><span className="h-9 w-9 animate-spin rounded-full border-2 border-[#397BF6]/20 border-t-[#397BF6]" /><p className="mt-4 text-xs font-bold text-stone-600">Đang render PowerPoint trên máy chủ…</p><p className="mt-1 text-[10px] text-stone-400">Hệ thống đang chuyển PPTX thành PDF và ảnh WebP.</p></div>;
  if (resource.material.previewStatus === 'failed') return <MissingPreview resource={resource} message={resource.material.previewError || 'Máy chủ không thể render PowerPoint này.'} fileUrl={fileUrl} />;
  if (!slideUrls.length) return <MissingPreview resource={resource} message="PowerPoint chưa có bản render. Hãy tải lại tệp để hệ thống tạo preview." fileUrl={fileUrl} />;

  const pageCount = slideUrls.length;
  const currentPage = Math.min(page, pageCount);
  return <div className="flex min-h-[720px] min-w-0 flex-1 flex-col bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-[#FBFCFE] px-3 py-2.5">
      <div className="flex items-center gap-1"><ToolbarButton label="Trang trước" onClick={() => setPage(Math.max(1, currentPage - 1))}><ChevronLeft /></ToolbarButton><span className="min-w-12 rounded-lg border border-stone-200 bg-white px-3 py-2 text-center text-[10px] font-bold text-stone-700">{currentPage}</span><span className="px-1 text-[10px] font-bold text-stone-400">/ {pageCount}</span><ToolbarButton label="Trang sau" onClick={() => setPage(Math.min(pageCount, currentPage + 1))}><ChevronRight /></ToolbarButton></div>
      <div className="flex items-center gap-1"><ToolbarButton label="Thu nhỏ" onClick={() => setZoom(Math.max(50, zoom - 10))}><ZoomOut /></ToolbarButton><span className="min-w-14 rounded-lg bg-white px-2 py-2 text-center text-[10px] font-bold text-stone-700">{zoom}%</span><ToolbarButton label="Phóng to" onClick={() => setZoom(Math.min(160, zoom + 10))}><ZoomIn /></ToolbarButton></div>
      <a href={fileUrl} download className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-white hover:text-[#1E3F82]" aria-label="Tải PowerPoint"><Download className="h-3.5 w-3.5" /></a>
    </div>
    <div className="flex h-[610px] items-center justify-center overflow-auto bg-[#EDF1F6] p-3">
      <div className="relative shrink-0 origin-center transition-transform" style={{ transform: `scale(${zoom / 100})` }}>
        <img src={slideUrls[currentPage - 1]} alt={`Slide ${currentPage}`} className="block max-h-[580px] max-w-[min(1400px,calc(100vw-2rem))] bg-white object-contain shadow-xl" />
        <div data-interactive-layer data-slide={currentPage} className="pointer-events-none absolute inset-0 z-10" aria-label="Lớp tương tác của slide" />
      </div>
    </div>
    <div className="flex items-center gap-3 overflow-x-auto border-t border-stone-200 bg-white p-3">
      {slideUrls.map((slideUrl, index) => <button key={slideUrl} type="button" onClick={() => setPage(index + 1)} className={`w-28 shrink-0 overflow-hidden rounded-lg border-2 bg-white p-1 transition ${currentPage === index + 1 ? 'border-[#397BF6] shadow-sm' : 'border-stone-200 hover:border-stone-300'}`}><div className="flex h-[58px] items-center justify-center overflow-hidden rounded bg-stone-100"><img src={slideUrl} alt={`Thumbnail slide ${index + 1}`} className="h-full w-full object-contain" /></div><span className={`block py-1 text-[8px] font-bold ${currentPage === index + 1 ? 'text-[#397BF6]' : 'text-stone-400'}`}>{index + 1}</span></button>)}
    </div>
  </div>;
}

function DocumentCanvas({ resource, page, zoom }: { resource: Exclude<StudioResource, { kind: 'quiz' }>; page: number; zoom: number }) {
  return <div className="w-full max-w-4xl origin-center overflow-hidden rounded-sm bg-white shadow-xl transition-transform" style={{ transform: `scale(${Math.min(zoom, 110) / 100})` }}><div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-lime-100 p-7 sm:p-10"><div className="absolute -right-14 -top-14 h-72 w-72 rounded-full bg-gradient-to-br from-lime-300 to-emerald-600 opacity-90" /><div className="absolute right-12 top-16 h-36 w-36 rounded-full bg-white/30 blur-sm" /><div className="relative z-10 max-w-[62%]"><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">{resource.kind === 'slide' ? 'Bài giảng trực quan' : 'Tài liệu học tập'} · Trang {page}</p><h3 className="mt-4 text-2xl font-black leading-tight text-emerald-950 sm:text-4xl">{resource.material.name.replace(/\.[^.]+$/, '')}</h3><p className="mt-4 max-w-md text-[10px] leading-relaxed text-stone-600 sm:text-sm">Nội dung chính được trình bày tại đây. Giáo viên có thể điều chỉnh thông tin, mục tiêu và quyền hiển thị ở bảng cài đặt bên phải.</p></div><div className="absolute bottom-7 left-7 right-7 z-10 grid grid-cols-3 gap-3 rounded-2xl border border-emerald-100 bg-white/85 p-4 backdrop-blur sm:left-10 sm:right-10"><SlidePoint number="1" text="Giới thiệu khái niệm" /><SlidePoint number="2" text="Trình bày nội dung chính" /><SlidePoint number="3" text="Liên hệ thực tiễn" /></div></div></div>;
}

function PdfCanvas({ resource, roomCode }: { resource: Exclude<StudioResource, { kind: 'quiz' }>; roomCode: string }) {
  const [page, setPage] = useState(1);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileUrl = absoluteFileUrl(resource.material.fileUrl);
  if (!fileUrl) return <MissingPreview resource={resource} message="Tài liệu PDF này chưa có tệp để xem trước." />;
  const pageCount = resource.material.previewPageCount || 1;
  return <div className="flex h-[720px] w-full flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-lg">
    <PdfPageImage roomCode={roomCode} resourceId={resource.material.id} page={page} onImage={setImageUrl} onError={setError} />
    <div className="flex items-center justify-between gap-2 border-b border-stone-200 p-3"><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-2 py-1.5 disabled:opacity-40" aria-label="Trang trước"><ChevronLeft /></button><span className="text-xs font-bold">{page}/{pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)} className="rounded-lg border px-2 py-1.5 disabled:opacity-40" aria-label="Trang sau"><ChevronRight /></button></div><a href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"><BoxArrowUpRight />Mở PDF gốc</a></div>
    <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-[#E9EEF5] p-3">{imageUrl ? <img src={imageUrl} alt={`${resource.material.name}, trang ${page}`} className="max-w-full bg-white shadow" /> : <p className="mt-24 text-xs text-stone-500">{error || 'Đang mở trang PDF…'}</p>}</div>
  </div>;
}

function PdfPageImage({ roomCode, resourceId, page, onImage, onError }: { roomCode: string; resourceId: string; page: number; onImage: (url: string | null) => void; onError: (message: string) => void }) {
  useEffect(() => {
    let active = true;
    let url: string | null = null;
    const path = `/classrooms/${encodeURIComponent(roomCode)}/lesson-plan/resources/${resourceId}/pdf/pages/${page}/`;
    requestBlob(path).then((blob) => {
      if (!active) return;
      url = URL.createObjectURL(blob);
      onImage(url);
      onError('');
    }).catch((reason: unknown) => {
      if (active) onError(reason instanceof Error ? reason.message : 'Không thể mở trang PDF.');
    });
    return () => { active = false; if (url) URL.revokeObjectURL(url); onImage(null); };
  }, [roomCode, resourceId, page, onImage, onError]);
  return null;
}

function DocCanvas({ resource }: { resource: Exclude<StudioResource, { kind: 'quiz' }> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const fileUrl = absoluteFileUrl(resource.material.fileUrl);
  const previewUrl = fileUrl ? mediaPreviewUrl(fileUrl) : null;
  const isDocx = resource.material.name.toLowerCase().endsWith('.docx');

  useEffect(() => {
    if (!previewUrl || !isDocx || !containerRef.current) return;
    const controller = new AbortController();
    const container = containerRef.current;
    container.replaceChildren();
    Promise.all([fetch(previewUrl, { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error(`Không tải được tài liệu (${response.status})`);
      return response.arrayBuffer();
    }), import('docx-preview')])
      .then(([buffer, docx]) => docx.renderAsync(buffer, container, undefined, {
        className: 'synapse-docx',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true,
        useBase64URL: true,
      }))
      .then(() => setStatus('ready'))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setStatus('error');
      });
    return () => controller.abort();
  }, [previewUrl, isDocx]);

  if (!fileUrl) return <MissingPreview resource={resource} message="Tài liệu Word này chưa có tệp để xem trước." />;
  if (!isDocx) return <MissingPreview resource={resource} message="Định dạng .doc cũ chưa thể xem trực tiếp. Hãy chuyển sang .docx hoặc PDF." fileUrl={fileUrl} />;
  return <div className="relative h-[720px] w-full overflow-auto rounded-xl border border-stone-300 bg-[#D9DEE7] shadow-lg">
    {status === 'loading' && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 text-xs font-bold text-stone-500">Đang dựng bản xem trước DOCX…</div>}
    {status === 'error' && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white"><MissingPreview resource={resource} message="Không thể dựng bản xem trước DOCX này." fileUrl={fileUrl} /></div>}
    <div ref={containerRef} className="min-h-full py-6 [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper>section.docx]:!mb-6 [&_.docx-wrapper>section.docx]:!shadow-lg" />
    {status === 'ready' && <a href={fileUrl} target="_blank" rel="noreferrer" className="sticky bottom-4 float-right mr-4 flex items-center gap-2 rounded-lg bg-stone-900/80 px-3 py-2 text-[10px] font-bold text-white shadow backdrop-blur hover:bg-stone-900"><Download />Tải DOCX</a>}
  </div>;
}

function MissingPreview({ resource, message, fileUrl }: { resource: Exclude<StudioResource, { kind: 'quiz' }>; message: string; fileUrl?: string }) {
  return <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-lg"><FileEarmarkText className="mx-auto h-10 w-10 text-[#397BF6]" /><h3 className="mt-4 text-sm font-extrabold text-stone-900">{resource.material.name}</h3><p className="mt-2 text-xs leading-5 text-stone-500">{message}</p>{fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#397BF6] px-4 py-2 text-[10px] font-bold text-white"><Download />Mở hoặc tải tài liệu</a>}</div>;
}

function absoluteFileUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  try {
    return new URL(fileUrl, new URL(BACKEND_API_URL).origin).toString();
  } catch {
    return fileUrl;
  }
}

function mediaPreviewUrl(fileUrl: string): string {
  try {
    const url = new URL(fileUrl);
    const marker = '/media/';
    const mediaIndex = url.pathname.indexOf(marker);
    if (mediaIndex >= 0) {
      const mediaPath = url.pathname.slice(mediaIndex + marker.length);
      return `/media-preview/${mediaPath}${url.search}`;
    }
  } catch {
    // URL tương đối hoặc URL ngoài hệ thống sẽ được dùng nguyên trạng.
  }
  return fileUrl;
}

function QuizCanvas({ resource }: { resource: Extract<StudioResource, { kind: 'quiz' }> }) { return <div className="w-full max-w-2xl rounded-2xl border border-violet-100 bg-white p-6 shadow-xl"><div className="flex items-center gap-2 text-xs font-extrabold text-violet-700"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100"><LightningChargeFill /></span>Quiz tương tác · {resource.quiz.durationSeconds} giây</div><h3 className="mt-6 text-lg font-extrabold text-stone-900">{resource.quiz.question}</h3><div className="mt-5 grid gap-3 sm:grid-cols-2">{resource.quiz.options.map((option, index) => <div key={index} className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-semibold ${index === resource.quiz.correctOption ? 'border-lime-300 bg-lime-50' : 'border-stone-200'}`}><span className="flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-extrabold">{String.fromCharCode(65 + index)}</span>{option}</div>)}</div></div>; }
function Model3dCanvas({ resource }: { resource: Exclude<StudioResource, { kind: 'quiz' }> }) { const model = resource.material.anatomyModel; if (!model) return null; return <div className="relative h-[clamp(500px,58dvh,590px)] w-full max-w-[1180px] overflow-hidden rounded-2xl bg-[#0B1224] shadow-[0_16px_40px_rgba(15,23,42,0.18)] ring-1 ring-black/5"><iframe title={model.title} src={model.embedUrl} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen /><span className="absolute left-3 top-3 rounded-lg bg-black/55 px-3 py-2 text-[10px] font-bold text-white backdrop-blur">Mô hình 3D · {model.title}</span></div>; }
function SlidePoint({ number, text }: { number: string; text: string }) { return <div className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-extrabold text-white">{number}</span><span className="text-[8px] font-bold text-emerald-950 sm:text-[10px]">{text}</span></div>; }
function ToolbarButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) { return <button type="button" aria-label={label} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-white hover:text-[#1E3F82] [&>svg]:h-3.5 [&>svg]:w-3.5">{children}</button>; }

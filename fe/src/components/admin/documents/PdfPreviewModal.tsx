'use client';

import { useEffect, useRef, useState } from 'react';
import { BoxArrowUpRight, XLg } from 'react-bootstrap-icons';
import { adminKnowledgeApi } from '@/lib/admin-knowledge';

export function PdfPreviewModal({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    adminKnowledgeApi.previewPdf(id)
      .then((file) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Không mở được file PDF.');
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  useEffect(() => {
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-2 sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title" className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
          <h2 id="pdf-preview-title" className="min-w-0 flex-1 truncate text-sm font-bold text-stone-900 sm:text-base">{title}</h2>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3F82] hover:underline">
              <BoxArrowUpRight className="h-3.5 w-3.5" /> Mở tab mới
            </a>
          )}
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Đóng bản xem PDF" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-[#1E3F82]">
            <XLg className="h-4 w-4" />
          </button>
        </div>
        {error ? (
          <p role="alert" className="m-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        ) : url ? (
          <iframe src={url} title={`PDF: ${title}`} className="min-h-0 w-full flex-1 bg-stone-100" />
        ) : (
          <p role="status" className="p-6 text-sm text-stone-600">Đang tải bản PDF để xem...</p>
        )}
      </div>
    </div>
  );
}

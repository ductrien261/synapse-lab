'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { CheckCircleFill, ExclamationTriangleFill, LightningChargeFill, Stars, StopCircle } from 'react-bootstrap-icons';
import { JobProgress } from '@/components/admin/JobProgress';
import {
  adminAnatomyApi,
  ANATOMY_JOB_API,
  ANATOMY_JOB_KINDS,
  isJobActive,
  type AdminModelRow,
  type ImportJob,
} from '@/lib/admin-anatomy';
import { modelTitle } from '@/lib/anatomy-catalog';
import { readModelAnnotations } from '@/lib/sketchfab';

interface Result {
  uid: string;
  title: string;
  ok: boolean;
  text: string;
}

/**
 * "AI soạn nội dung": một nút cho cả quy trình sau khi nhập mô hình
 *   1. đọc danh sách bộ phận của từng mô hình (mở mô hình trong khung ẩn, đọc chú thích Sketchfab)
 *   2. AI viết nội dung cho mọi bộ phận chưa có, dựa trên giáo trình trong kho
 * Xong thì admin vào Duyệt nhanh để duyệt và xuất bản.
 */
export function BatchSync({ models, needDrafts, onDone }: { models: AdminModelRow[]; needDrafts: number; onDone: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'reading' | 'drafting'>('idle');
  const [current, setCurrent] = useState<{ i: number; title: string } | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState('');
  const stop = useRef(false);
  const holder = useRef<HTMLDivElement>(null);

  const startDrafts = async () => {
    setError('');
    try {
      const j = await adminAnatomyApi.generateDrafts({});
      setJob(j);
      setPhase('drafting');
    } catch (err) {
      setPhase('idle');
      const message = err instanceof Error ? err.message : '';
      setError(
        message.includes('Không có bộ phận')
          ? 'Các bộ phận đều đã có bản nháp. Vào Duyệt nhanh để duyệt và xuất bản.'
          : message || 'AI chưa bắt đầu viết được',
      );
    }
  };

  const run = async () => {
    stop.current = false;
    setPhase('reading');
    setResults([]);
    setError('');
    setJob(null);
    let ok = 0;
    for (let i = 0; i < models.length && !stop.current; i++) {
      const m = models[i];
      const title = modelTitle(m);
      setCurrent({ i: i + 1, title });
      const iframe = document.createElement('iframe');
      iframe.setAttribute('allow', 'autoplay; fullscreen; xr-spatial-tracking');
      iframe.title = title;
      iframe.style.cssText = 'width:320px;height:240px;border:0';
      holder.current?.appendChild(iframe);
      try {
        const list = await readModelAnnotations(m.sketchfab_uid, iframe);
        if (list.length === 0) {
          setResults((r) => [...r, { uid: m.sketchfab_uid, title, ok: false, text: 'mô hình không gắn chú thích bộ phận' }]);
        } else {
          const res = await adminAnatomyApi.syncAnnotations(
            m.sketchfab_uid,
            list.map((a) => ({ index: a.index, label: a.name, content: a.content })),
          );
          ok += 1;
          setResults((r) => [...r, { uid: m.sketchfab_uid, title, ok: true, text: `${res.result.total} bộ phận` }]);
        }
      } catch (err) {
        setResults((r) => [...r, { uid: m.sketchfab_uid, title, ok: false, text: err instanceof Error ? err.message : 'lỗi' }]);
      } finally {
        iframe.remove();
      }
    }
    setCurrent(null);
    onDone();
    if (stop.current || ok === 0) {
      setPhase('idle');
      return;
    }
    await startDrafts();
  };

  const onJobChange = useCallback(
    (next: ImportJob) => {
      setJob(next);
      if (!isJobActive(next)) {
        setPhase('idle');
        onDone();
      }
    },
    [onDone],
  );

  const todo = models.length;
  const busy = phase !== 'idle';
  if (todo === 0 && needDrafts === 0 && !busy && results.length === 0 && !job) return null;

  const jobDone = job && !isJobActive(job);

  return (
    <div className="px-4 py-3 border-b border-stone-100 bg-[#FBFCFE] flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Stars className={`w-4 h-4 text-violet-600 ${busy ? 'animate-pulse' : ''}`} />
        <div className="flex-1 min-w-[220px] text-sm text-stone-700">
          {phase === 'reading' && current ? (
            <>
              Bước 1/2 · Đọc bộ phận của mô hình {current.i}/{todo}: <b>{current.title}</b>
            </>
          ) : phase === 'drafting' ? (
            <>Bước 2/2 · AI đang viết nội dung từ giáo trình...</>
          ) : jobDone ? (
            <>
              Xong! Vào <b>Duyệt nhanh</b> để duyệt và xuất bản.
            </>
          ) : todo > 0 ? (
            <>
              <b>{todo}</b> mô hình chưa có nội dung. AI sẽ đọc các bộ phận rồi viết nội dung từ giáo trình, bạn chỉ cần duyệt. Để trang này mở trong lúc chạy.
            </>
          ) : (
            <>
              Còn <b>{needDrafts}</b> mô hình có bộ phận chưa có nội dung.
            </>
          )}
        </div>

        {phase === 'reading' ? (
          <button
            type="button"
            onClick={() => {
              stop.current = true;
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-bold text-stone-600 hover:text-rose-600 cursor-pointer"
          >
            <StopCircle className="w-3.5 h-3.5" /> Dừng
          </button>
        ) : jobDone ? (
          <Link
            href="/admin/anatomy/review"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold"
          >
            <LightningChargeFill className="w-4 h-4" /> Duyệt nhanh
          </Link>
        ) : (
          !busy && (
            <button
              type="button"
              onClick={() => void (todo > 0 ? run() : startDrafts())}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold cursor-pointer"
            >
              <Stars className="w-4 h-4" /> AI soạn nội dung{todo > 0 ? ` (${todo} mô hình)` : ''}
            </button>
          )
        )}
      </div>

      {phase === 'reading' && (
        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full bg-violet-600 transition-[width] duration-500" style={{ width: `${(results.length / Math.max(1, todo)) * 100}%` }} />
        </div>
      )}

      {results.length > 0 && (
        <ul className="max-h-32 overflow-y-auto text-xs flex flex-col gap-1">
          {results.map((r) => (
            <li key={r.uid} className={`flex items-center gap-1.5 ${r.ok ? 'text-stone-600' : 'text-amber-700'}`}>
              {r.ok ? <CheckCircleFill className="w-3 h-3 text-emerald-600" /> : <ExclamationTriangleFill className="w-3 h-3" />}
              <span className="font-semibold">{r.title}</span> — {r.text}
            </li>
          ))}
        </ul>
      )}

      {error && <div className="rounded-lg bg-rose-50 text-rose-700 text-xs px-3 py-2">{error}</div>}
      {job && <JobProgress job={job} onChange={onJobChange} api={ANATOMY_JOB_API} kindLabels={ANATOMY_JOB_KINDS} createdLabel="bản nháp" />}

      {/* Khung ẩn để tải mô hình (WebGL cần kích thước thật nên đặt ngoài màn hình thay vì display:none) */}
      <div ref={holder} aria-hidden className="fixed -left-[10000px] top-0 w-[320px] h-[240px] overflow-hidden pointer-events-none" />
    </div>
  );
}

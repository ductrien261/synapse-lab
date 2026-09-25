'use client';

import { useCallback, useRef, useState } from 'react';
import { ArrowRepeat, CheckCircleFill, ExclamationTriangleFill, Stars, StopCircle } from 'react-bootstrap-icons';
import { JobProgress } from '@/components/admin/JobProgress';
import {
  adminAnatomyApi,
  ANATOMY_JOB_API,
  ANATOMY_JOB_KINDS,
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
 * "Đồng bộ tất cả": lần lượt mở từng mô hình chưa quét trong một khung ẩn, đọc chú thích từ Sketchfab
 * và lưu lại — không cần mở từng mô hình bằng tay. Xong thì có nút cho AI viết nháp các bộ phận mới.
 */
export function BatchSync({ models, onDone }: { models: AdminModelRow[]; onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<{ i: number; title: string } | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState('');
  const stop = useRef(false);
  const holder = useRef<HTMLDivElement>(null);

  const run = async () => {
    stop.current = false;
    setRunning(true);
    setResults([]);
    setError('');
    setJob(null);
    const queue = [...models];
    for (let i = 0; i < queue.length && !stop.current; i++) {
      const m = queue[i];
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
          setResults((r) => [...r, { uid: m.sketchfab_uid, title, ok: false, text: 'không có chú thích trên Sketchfab' }]);
        } else {
          const res = await adminAnatomyApi.syncAnnotations(
            m.sketchfab_uid,
            list.map((a) => ({ index: a.index, label: a.name, content: a.content })),
          );
          setResults((r) => [
            ...r,
            { uid: m.sketchfab_uid, title, ok: true, text: `${res.result.total} chú thích · ${res.result.new_structures} cấu trúc mới` },
          ]);
        }
      } catch (err) {
        setResults((r) => [...r, { uid: m.sketchfab_uid, title, ok: false, text: err instanceof Error ? err.message : 'lỗi' }]);
      } finally {
        iframe.remove();
      }
    }
    setCurrent(null);
    setRunning(false);
    onDone();
  };

  const draftAll = async () => {
    setError('');
    try {
      setJob(await adminAnatomyApi.generateDrafts({}));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa bắt đầu AI viết nháp được');
    }
  };

  const onJobChange = useCallback((next: ImportJob) => setJob(next), []);

  if (models.length === 0 && !running && results.length === 0 && !job) return null;

  const okCount = results.filter((r) => r.ok).length;

  return (
    <div className="px-4 py-3 border-b border-stone-100 bg-[#FBFCFE] flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ArrowRepeat className={`w-4 h-4 text-[#1E3F82] ${running ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-[220px] text-sm text-stone-700">
          {running && current ? (
            <>
              Đang đọc chú thích {current.i}/{models.length}: <b>{current.title}</b>
            </>
          ) : results.length > 0 ? (
            <>
              Đã đồng bộ <b>{okCount}</b>/{results.length} mô hình.
            </>
          ) : (
            <>
              <b>{models.length}</b> mô hình chưa quét chú thích. Hệ thống sẽ tự mở từng mô hình (khoảng 10–20 giây/mô hình), bạn cứ để trang này mở.
            </>
          )}
        </div>
        {running ? (
          <button
            type="button"
            onClick={() => {
              stop.current = true;
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-bold text-stone-600 hover:text-rose-600 cursor-pointer"
          >
            <StopCircle className="w-3.5 h-3.5" /> Dừng sau mô hình này
          </button>
        ) : okCount > 0 && !job ? (
          <button
            type="button"
            onClick={() => void draftAll()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold cursor-pointer"
          >
            <Stars className="w-4 h-4" /> AI viết nháp cho bộ phận mới
          </button>
        ) : (
          models.length > 0 && (
            <button
              type="button"
              onClick={() => void run()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold cursor-pointer"
            >
              <ArrowRepeat className="w-4 h-4" /> Đồng bộ tất cả ({models.length})
            </button>
          )
        )}
      </div>

      {running && (
        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full bg-[#1E3F82] transition-[width] duration-500" style={{ width: `${(results.length / models.length) * 100}%` }} />
        </div>
      )}

      {results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto text-xs flex flex-col gap-1">
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

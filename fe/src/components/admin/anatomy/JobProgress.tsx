'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircleFill, ExclamationTriangleFill, StopCircle, XCircleFill } from 'react-bootstrap-icons';
import { adminAnatomyApi, isJobActive, type ImportJob } from '@/lib/admin-anatomy';

const KIND_LABEL: Record<ImportJob['kind'], string> = {
  scan_index: 'Quét danh mục',
  import: 'Nhập mô hình',
};

const STATUS_LABEL: Record<ImportJob['status'], string> = {
  queued: 'Chờ chạy',
  running: 'Đang chạy',
  done: 'Hoàn tất',
  failed: 'Lỗi',
  cancelled: 'Đã dừng',
};

/** Tiến độ lượt quét/nhập gần nhất; tự hỏi lại server mỗi 2 giây khi đang chạy. */
export function JobProgress({
  job,
  onChange,
}: {
  job: ImportJob | null;
  onChange: (job: ImportJob) => void;
}) {
  const [showLog, setShowLog] = useState(true);
  const logBox = useRef<HTMLDivElement>(null);
  const active = isJobActive(job);
  const jobId = job?.id;

  useEffect(() => {
    if (!active || !jobId) return;
    const timer = setInterval(() => {
      adminAnatomyApi
        .job(jobId)
        .then(onChange)
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, [active, jobId, onChange]);

  useEffect(() => {
    logBox.current?.scrollTo({ top: logBox.current.scrollHeight });
  }, [job?.log.length]);

  if (!job) return null;

  const pct = job.total > 0 ? Math.round((job.processed / job.total) * 100) : active ? 5 : 100;
  const tone =
    job.status === 'failed'
      ? 'border-rose-200 bg-rose-50/40'
      : job.status === 'done'
        ? 'border-emerald-200 bg-emerald-50/40'
        : 'border-[#C5D5EE] bg-[#F4F7FC]';

  return (
    <section className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
          {job.status === 'done' && <CheckCircleFill className="w-4 h-4 text-emerald-600" />}
          {job.status === 'failed' && <XCircleFill className="w-4 h-4 text-rose-600" />}
          {job.status === 'cancelled' && <ExclamationTriangleFill className="w-4 h-4 text-amber-500" />}
          {active && <span className="w-3.5 h-3.5 rounded-full border-2 border-[#1E3F82] border-t-transparent animate-spin" />}
          {KIND_LABEL[job.kind]} · {STATUS_LABEL[job.status]}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-600">
          <span>
            {job.processed}/{job.total || '?'}
          </span>
          <span className="text-emerald-700 font-semibold">+{job.created_count} mới</span>
          <span>{job.skipped_count} bỏ qua</span>
          {job.failed_count > 0 && <span className="text-rose-600 font-semibold">{job.failed_count} lỗi</span>}
          {active && (
            <button
              type="button"
              disabled={job.cancel_requested}
              onClick={() => adminAnatomyApi.cancelJob(job.id).then(onChange).catch(() => undefined)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-300 bg-white font-bold hover:border-rose-300 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
            >
              <StopCircle className="w-3.5 h-3.5" /> {job.cancel_requested ? 'Đang dừng...' : 'Dừng'}
            </button>
          )}
          <button type="button" onClick={() => setShowLog((v) => !v)} className="font-semibold text-[#1E3F82] hover:underline cursor-pointer">
            {showLog ? 'Ẩn log' : 'Xem log'}
          </button>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-white overflow-hidden border border-stone-200/70">
        <div
          className={`h-full transition-[width] duration-500 ${job.status === 'failed' ? 'bg-rose-500' : 'bg-[#1E3F82]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {showLog && job.log.length > 0 && (
        <div ref={logBox} className="mt-3 max-h-48 overflow-y-auto rounded-xl bg-white border border-stone-200/70 p-3 font-mono text-[11.5px] leading-relaxed">
          {job.log.map((l, i) => (
            <div
              key={i}
              className={
                l.level === 'error'
                  ? 'text-rose-600'
                  : l.level === 'success'
                    ? 'text-emerald-700'
                    : l.level === 'warning'
                      ? 'text-amber-600'
                      : 'text-stone-600'
              }
            >
              <span className="text-stone-400">{l.at}</span> {l.message}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

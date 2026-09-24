// ============================================================
// SYNAPSE-LAB — Kiểu dữ liệu chung cho các lượt chạy nền (nhập mô hình, nạp tài liệu)
// ============================================================

export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

export interface JobLogEntry {
  at: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface BackgroundJob {
  id: string;
  kind: string;
  status: JobStatus;
  total: number;
  processed: number;
  created_count: number;
  skipped_count: number;
  failed_count: number;
  log: JobLogEntry[];
  cancel_requested: boolean;
  created_at: string;
  finished_at: string | null;
}

export interface JobApi<J extends BackgroundJob> {
  job: (id: string) => Promise<J>;
  cancel: (id: string) => Promise<J>;
}

export function isJobActive(job: BackgroundJob | null | undefined): boolean {
  return Boolean(job && (job.status === 'queued' || job.status === 'running'));
}

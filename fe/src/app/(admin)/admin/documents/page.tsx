'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CollectionFill, ExclamationTriangleFill, PlusLg, Search } from 'react-bootstrap-icons';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { JobProgress } from '@/components/admin/JobProgress';
import { AddDocumentPanel } from '@/components/admin/documents/AddDocumentPanel';
import { DocumentsList } from '@/components/admin/documents/DocumentsList';
import { SearchTester } from '@/components/admin/documents/SearchTester';
import { ApiError } from '@/lib/api';
import {
  adminKnowledgeApi,
  INGEST_JOB_API,
  INGEST_JOB_KINDS,
  type IngestJob,
  type KnowledgeStats,
} from '@/lib/admin-knowledge';
import { isJobActive } from '@/lib/jobs';

type Tab = 'library' | 'add' | 'search';

export default function AdminDocumentsPage() {
  const [tab, setTab] = useState<Tab>('library');
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [reloadSignal, setReloadSignal] = useState(0);
  const [job, setJobState] = useState<IngestJob | null>(null);
  const [error, setError] = useState('');
  const jobRef = useRef<IngestJob | null>(null);

  const setJob = useCallback((next: IngestJob | null) => {
    jobRef.current = next;
    setJobState(next);
  }, []);

  const reload = useCallback(() => setReloadSignal((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    adminKnowledgeApi
      .stats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadSignal]);

  useEffect(() => {
    let cancelled = false;
    adminKnowledgeApi
      .latestJob()
      .then((j) => {
        if (!cancelled) setJob(j);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [setJob]);

  // Lượt nạp vừa xong -> tải lại số liệu và danh sách
  const handleJobChange = useCallback(
    (next: IngestJob) => {
      const wasActive = isJobActive(jobRef.current);
      setJob(next);
      if (wasActive && !isJobActive(next)) reload();
    },
    [reload, setJob],
  );

  const startJob = useCallback(
    async (fn: () => Promise<IngestJob>) => {
      setError('');
      try {
        setJob(await fn());
        reload();
        return true;
      } catch (err) {
        // 409: đang có lượt khác chạy -> hiện lượt đó
        const running = err instanceof ApiError ? (err.data as { job?: IngestJob } | undefined)?.job : undefined;
        if (running) setJob(running);
        setError(err instanceof Error ? err.message : 'Không bắt đầu được');
        return false;
      }
    },
    [reload, setJob],
  );

  const busy = isJobActive(job);

  return (
    <>
      <AdminPageHeader
        title="Tài liệu"
        description="Kho giáo trình làm căn cứ cho AI: nạp sách OpenStax theo chương hoặc file PDF, AI chỉ viết dựa trên các đoạn trong kho và luôn kèm trích dẫn."
      />

      {stats && !stats.embeddings_configured && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <ExclamationTriangleFill className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Máy chủ chưa có <b>GEMINI_API_KEY</b> nên chưa tạo vector được. Thêm key vào file .env rồi khởi động lại backend.
          </span>
        </div>
      )}

      <div className="grid gap-3 grid-cols-3">
        <MiniStat label="Tài liệu" value={stats?.documents.total} />
        <MiniStat label="Bài / mục đã nạp" value={stats?.sections} tone="text-[#1E3F82]" />
        <MiniStat label="Đoạn có thể tra cứu" value={stats?.chunks} tone="text-emerald-600" />
      </div>

      <JobProgress job={job} onChange={handleJobChange} api={INGEST_JOB_API} kindLabels={INGEST_JOB_KINDS} createdLabel="đã nạp" />
      {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div>}

      <div className="inline-flex p-1 rounded-2xl bg-white border border-stone-200/90 self-start text-sm font-bold">
        <TabButton active={tab === 'library'} onClick={() => setTab('library')}>
          <CollectionFill className="w-4 h-4" /> Kho tài liệu
        </TabButton>
        <TabButton active={tab === 'add'} onClick={() => setTab('add')}>
          <PlusLg className="w-4 h-4" /> Thêm tài liệu
        </TabButton>
        <TabButton active={tab === 'search'} onClick={() => setTab('search')}>
          <Search className="w-4 h-4" /> Thử tìm kiếm
        </TabButton>
      </div>

      {tab === 'library' && (
        <DocumentsList busy={busy} startJob={startJob} reloadSignal={reloadSignal} onChanged={reload} onAdd={() => setTab('add')} />
      )}
      {tab === 'add' && <AddDocumentPanel busy={busy} startJob={startJob} reloadSignal={reloadSignal} />}
      {tab === 'search' && <SearchTester />}
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-colors ${
        active ? 'bg-[#1E3F82] text-white' : 'text-stone-500 hover:text-stone-800'
      }`}
    >
      {children}
    </button>
  );
}

function MiniStat({ label, value, tone = 'text-stone-900' }: { label: string; value?: number | string; tone?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 px-4 py-3">
      <div className={`text-2xl font-extrabold tabular-nums ${tone}`}>
        {value ?? <span className="inline-block w-8 h-6 rounded bg-stone-100 animate-pulse" />}
      </div>
      <div className="text-xs font-semibold text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}

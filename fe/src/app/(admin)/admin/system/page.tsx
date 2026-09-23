'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise, CheckCircleFill, Database, HddStackFill, XCircleFill, BoxFill } from 'react-bootstrap-icons';
import type { ComponentType } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api';
const ALGO = process.env.NEXT_PUBLIC_ALGO_API_URL || 'http://localhost:8080/api';

type Status = 'checking' | 'ok' | 'down';

interface Check {
  status: Status;
  latency?: number;
  detail?: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - start) };
}

export default function AdminSystemPage() {
  const [backend, setBackend] = useState<Check>({ status: 'checking' });
  const [database, setDatabase] = useState<Check>({ status: 'checking' });
  const [algo, setAlgo] = useState<Check>({ status: 'checking' });
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setBackend({ status: 'checking' });
    setDatabase({ status: 'checking' });
    setAlgo({ status: 'checking' });

    const backendCheck = timed(async () => {
      const res = await fetch(`${BACKEND}/health/`, { cache: 'no-store' });
      return (await res.json()) as { status: string; database: string; version?: string };
    })
      .then(({ value, ms }) => {
        setBackend({ status: 'ok', latency: ms, detail: `Phiên bản ${value.version ?? '—'}` });
        setDatabase(
          value.database === 'connected'
            ? { status: 'ok', detail: 'Neon Postgres đã kết nối' }
            : { status: 'down', detail: 'Backend không kết nối được database' },
        );
      })
      .catch(() => {
        setBackend({ status: 'down', detail: 'Không gọi được /api/health/' });
        setDatabase({ status: 'down', detail: 'Không kiểm tra được vì backend không phản hồi' });
      });

    const algoCheck = timed(async () => {
      const res = await fetch(`${ALGO}/algorithms/`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as { categories?: { algorithms?: unknown[] }[] };
    })
      .then(({ value, ms }) => {
        const cats = value.categories ?? [];
        const total = cats.reduce((n, c) => n + (c.algorithms?.length ?? 0), 0);
        setAlgo({ status: 'ok', latency: ms, detail: `${cats.length} nhóm · ${total} thuật toán` });
      })
      .catch(() => setAlgo({ status: 'down', detail: 'Không gọi được algo-server' }));

    await Promise.allSettled([backendCheck, algoCheck]);
    setCheckedAt(new Date());
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const checking = [backend, database, algo].some((c) => c.status === 'checking');

  return (
    <>
      <AdminPageHeader
        title="Tình trạng hệ thống"
        description={checkedAt ? `Kiểm tra lúc ${checkedAt.toLocaleTimeString('vi-VN')}` : 'Đang kiểm tra...'}
        actions={
          <button
            type="button"
            onClick={() => void run()}
            disabled={checking}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold disabled:opacity-60 cursor-pointer"
          >
            <ArrowClockwise className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            Kiểm tra lại
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <ServiceCard name="Backend API" address={BACKEND} icon={HddStackFill} check={backend} />
        <ServiceCard name="Database" address="Neon Postgres" icon={Database} check={database} />
        <ServiceCard name="Algo server" address={ALGO} icon={BoxFill} check={algo} />
      </div>
    </>
  );
}

function ServiceCard({
  name,
  address,
  icon: Icon,
  check,
}: {
  name: string;
  address: string;
  icon: ComponentType<{ className?: string }>;
  check: Check;
}) {
  const tone =
    check.status === 'ok'
      ? { badge: 'bg-emerald-50 text-emerald-700', text: 'Hoạt động', Mark: CheckCircleFill }
      : check.status === 'down'
        ? { badge: 'bg-rose-50 text-rose-700', text: 'Không phản hồi', Mark: XCircleFill }
        : { badge: 'bg-stone-100 text-stone-500', text: 'Đang kiểm tra', Mark: null };

  return (
    <section className="bg-white rounded-2xl border border-stone-200/90 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="w-10 h-10 rounded-xl bg-[#0F2258] text-white flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${tone.badge}`}>
          {tone.Mark ? <tone.Mark className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />}
          {tone.text}
        </span>
      </div>
      <div>
        <h2 className="text-base font-bold text-stone-900">{name}</h2>
        <p className="text-xs text-stone-400 font-mono truncate mt-0.5">{address}</p>
      </div>
      <div className="flex items-center justify-between text-sm border-t border-stone-100 pt-3">
        <span className="text-stone-600">{check.detail ?? '—'}</span>
        {check.latency !== undefined && <span className="text-xs font-semibold text-stone-400 tabular-nums">{check.latency} ms</span>}
      </div>
    </section>
  );
}

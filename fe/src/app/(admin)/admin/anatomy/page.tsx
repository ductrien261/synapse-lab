'use client';

import { useCallback, useEffect, useState } from 'react';
import { CloudDownload, Grid3x3GapFill } from 'react-bootstrap-icons';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ModelsTable } from '@/components/admin/anatomy/ModelsTable';
import { ImportPanel } from '@/components/admin/anatomy/ImportPanel';
import { adminAnatomyApi, type AnatomyStats } from '@/lib/admin-anatomy';

type Tab = 'models' | 'import';

export default function AdminAnatomyPage() {
  const [tab, setTab] = useState<Tab>('models');
  const [reloadSignal, setReloadSignal] = useState(0);
  const [stats, setStats] = useState<AnatomyStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminAnatomyApi
      .stats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadSignal]);

  const onImported = useCallback(() => setReloadSignal((n) => n + 1), []);

  return (
    <>
      <AdminPageHeader
        title="Giải phẫu"
        description="Nhập mô hình 3D từ AnatomyTOOL / Sketchfab, soạn nội dung tiếng Việt và xuất bản cho học viên."
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Tổng mô hình" value={stats?.models.total} />
        <MiniStat label="Đã xuất bản" value={stats?.models.published} tone="text-emerald-600" />
        <MiniStat label="Đang nháp" value={stats?.models.draft} tone="text-stone-500" />
        <MiniStat
          label="Cấu trúc đã duyệt"
          value={stats ? `${stats.structures.published}/${stats.structures.total}` : undefined}
          tone="text-[#1E3F82]"
        />
      </div>

      <div className="inline-flex p-1 rounded-2xl bg-white border border-stone-200/90 self-start text-sm font-bold">
        <TabButton active={tab === 'models'} onClick={() => setTab('models')}>
          <Grid3x3GapFill className="w-4 h-4" /> Mô hình
        </TabButton>
        <TabButton active={tab === 'import'} onClick={() => setTab('import')}>
          <CloudDownload className="w-4 h-4" /> Nhập dữ liệu
        </TabButton>
      </div>

      {tab === 'models' ? <ModelsTable reloadSignal={reloadSignal} /> : <ImportPanel onImported={onImported} />}
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

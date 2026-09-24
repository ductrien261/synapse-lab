'use client';

import { useState } from 'react';
import { BarChartFill, GearFill, ListUl } from 'react-bootstrap-icons';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { OverviewPanel } from '@/components/admin/ai/OverviewPanel';
import { RequestLog } from '@/components/admin/ai/RequestLog';
import { SettingsPanel } from '@/components/admin/ai/SettingsPanel';

type Tab = 'overview' | 'log' | 'settings';

export default function AdminAiPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <>
      <AdminPageHeader
        title="AI & Chi phí"
        description="Theo dõi mọi lượt dùng AI: token vào/ra, chi phí, độ trễ, lỗi, trace Langfuse. Đặt hạn mức token mỗi ngày cho người dùng."
      />

      <div className="inline-flex p-1 rounded-2xl bg-white border border-stone-200/90 self-start text-sm font-bold">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          <BarChartFill className="w-4 h-4" /> Tổng quan
        </TabButton>
        <TabButton active={tab === 'log'} onClick={() => setTab('log')}>
          <ListUl className="w-4 h-4" /> Nhật ký
        </TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
          <GearFill className="w-4 h-4" /> Hạn mức & giá
        </TabButton>
      </div>

      {tab === 'overview' && <OverviewPanel onGoPrices={() => setTab('settings')} />}
      {tab === 'log' && <RequestLog />}
      {tab === 'settings' && <SettingsPanel />}
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

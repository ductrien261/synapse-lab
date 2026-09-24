'use client';

import Link from 'next/link';
import { useEffect, useState, type ComponentType } from 'react';
import {
  Activity,
  ArrowRight,
  BoxFill,
  CpuFill,
  FileEarmarkTextFill,
  HeartPulseFill,
  LockFill,
  PeopleFill,
  PersonBadgeFill,
  ShieldLockFill,
} from 'react-bootstrap-icons';
import { adminApi } from '@/lib/api';
import { adminAnatomyApi, type AnatomyStats } from '@/lib/admin-anatomy';
import { useUser } from '@/lib/user-context';
import { getGreetingName } from '@/lib/format';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

type Icon = ComponentType<{ className?: string }>;

interface Stats {
  total: number;
  admins: number;
  locked: number;
  cs: number;
  med: number;
}

const SHORTCUTS: { href: string; title: string; description: string; icon: Icon; ready: boolean }[] = [
  { href: '/admin/users', title: 'Người dùng', description: 'Cấp quyền admin, khóa hoặc mở tài khoản.', icon: PersonBadgeFill, ready: true },
  { href: '/admin/documents', title: 'Tài liệu', description: 'Upload giáo trình để AI tra cứu và trích dẫn.', icon: FileEarmarkTextFill, ready: false },
  { href: '/admin/algorithms', title: 'Thuật toán', description: 'Soạn giải thích, độ phức tạp, ứng dụng.', icon: BoxFill, ready: false },
  { href: '/admin/anatomy', title: 'Giải phẫu', description: 'Nhập mô hình 3D, soạn nội dung, xuất bản.', icon: HeartPulseFill, ready: true },
  { href: '/admin/spaces', title: 'Không gian', description: 'Theo dõi các không gian đang hoạt động.', icon: PeopleFill, ready: false },
  { href: '/admin/system', title: 'Tình trạng hệ thống', description: 'Backend, database, algo-server.', icon: Activity, ready: true },
];

export default function AdminHomePage() {
  const { user } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [anatomy, setAnatomy] = useState<AnatomyStats | null>(null);

  useEffect(() => {
    Promise.all([
      adminApi.listUsers({ page: 1 }),
      adminApi.listUsers({ role: 'admin', page: 1 }),
      adminApi.listUsers({ is_active: 'false', page: 1 }),
      adminApi.listUsers({ track: 'cs', page: 1 }),
      adminApi.listUsers({ track: 'med', page: 1 }),
    ])
      .then(([all, admins, locked, cs, med]) =>
        setStats({ total: all.count, admins: admins.count, locked: locked.count, cs: cs.count, med: med.count }),
      )
      .catch(() => setStats(null));
    adminAnatomyApi
      .stats()
      .then(setAnatomy)
      .catch(() => setAnatomy(null));
  }, []);

  return (
    <>
      <AdminPageHeader
        title={`Xin chào, ${user ? getGreetingName(user.name, user.email) : ''}`}
        description="Tổng quan hệ thống SYNAPSE LAB"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tổng người dùng" value={stats?.total} icon={PeopleFill} tone="bg-[#E8F0FB] text-[#1E3F82]" />
        <Stat label="Sinh viên CNTT" value={stats?.cs} icon={CpuFill} tone="bg-sky-50 text-sky-600" />
        <Stat label="Sinh viên Y khoa" value={stats?.med} icon={HeartPulseFill} tone="bg-rose-50 text-rose-500" />
        <Stat
          label="Quản trị viên / bị khóa"
          value={stats ? `${stats.admins} / ${stats.locked}` : undefined}
          icon={stats && stats.locked > 0 ? LockFill : ShieldLockFill}
          tone="bg-amber-50 text-amber-600"
        />
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-3">Nội dung giải phẫu</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Mô hình 3D" value={anatomy?.models.total} icon={HeartPulseFill} tone="bg-rose-50 text-rose-500" />
          <Stat label="Đã xuất bản" value={anatomy?.models.published} icon={ArrowRight} tone="bg-emerald-50 text-emerald-600" />
          <Stat label="Đang nháp" value={anatomy?.models.draft} icon={FileEarmarkTextFill} tone="bg-stone-100 text-stone-500" />
          <Stat
            label="Bộ phận đã duyệt"
            value={anatomy ? `${anatomy.structures.published}/${anatomy.structures.total}` : undefined}
            icon={ShieldLockFill}
            tone="bg-[#E8F0FB] text-[#1E3F82]"
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-3">Truy cập nhanh</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUTS.map(({ href, title, description, icon: Icon, ready }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white rounded-2xl border border-stone-200/90 p-5 hover:border-[#1E3F82]/30 hover:shadow-md hover:shadow-[#1E3F82]/5 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#0F2258] text-white flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </span>
                {ready ? (
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#1E3F82] transition-colors" />
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                    Sắp có
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-base font-bold text-stone-900 group-hover:text-[#1E3F82]">{title}</h3>
              <p className="text-sm text-stone-500 mt-1">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value?: number | string; icon: Icon; tone: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 p-5 flex items-center gap-4">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-stone-900 tabular-nums leading-none">
          {value ?? <span className="inline-block w-10 h-6 rounded-md bg-stone-100 animate-pulse align-middle" />}
        </div>
        <div className="text-xs font-semibold text-stone-500 mt-1.5 truncate">{label}</div>
      </div>
    </div>
  );
}

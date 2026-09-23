'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import {
  ActivityIcon,
  BoxFill,
  ChevronDoubleLeft,
  ChevronDoubleRight,
  EyeFill,
  FileEarmarkTextFill,
  Grid1x2Fill,
  HeartPulseFill,
  PeopleFill,
  PersonBadgeFill,
} from './icons';

type Icon = ComponentType<{ className?: string }>;

interface Item {
  href: string;
  label: string;
  icon: Icon;
  soon?: boolean;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Chung',
    items: [{ href: '/admin', label: 'Tổng quan', icon: Grid1x2Fill }],
  },
  {
    title: 'Quản lý',
    items: [
      { href: '/admin/users', label: 'Người dùng', icon: PersonBadgeFill },
      { href: '/admin/classes', label: 'Lớp học', icon: PeopleFill, soon: true },
    ],
  },
  {
    title: 'Nội dung học',
    items: [
      { href: '/admin/documents', label: 'Tài liệu', icon: FileEarmarkTextFill, soon: true },
      { href: '/admin/algorithms', label: 'Thuật toán', icon: BoxFill, soon: true },
      { href: '/admin/anatomy', label: 'Giải phẫu', icon: HeartPulseFill, soon: true },
    ],
  },
  {
    title: 'Hệ thống',
    items: [{ href: '/admin/system', label: 'Tình trạng hệ thống', icon: ActivityIcon }],
  },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-64px)] shrink-0 bg-gradient-to-b from-[#0F2258] to-[#152E6B] text-white flex flex-col transition-[width] duration-300 ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 pt-5 flex flex-col gap-5">
        {GROUPS.map((group) => (
          <Section key={group.title} title={group.title} collapsed={collapsed}>
            {group.items.map((item) => (
              <NavItem key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
            ))}
          </Section>
        ))}
      </div>

      <div className="p-3 border-t border-white/10 flex flex-col gap-2">
        <Link
          href="/algorithms"
          title={collapsed ? 'Xem trang học viên' : undefined}
          className={`flex items-center gap-3 rounded-xl py-2.5 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors ${
            collapsed ? 'justify-center' : 'px-3'
          }`}
        >
          <EyeFill className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Xem trang học viên</span>}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          className={`w-full flex items-center gap-3 rounded-xl py-2.5 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : 'px-3'
          }`}
        >
          {collapsed ? (
            <ChevronDoubleRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronDoubleLeft className="w-4 h-4" />
              <span>Thu gọn</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function Section({ title, collapsed, children }: { title: string; collapsed: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {collapsed ? (
        <div className="mx-auto w-6 border-t border-white/15 mb-1" />
      ) : (
        <div className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/40">{title}</div>
      )}
      {children}
    </div>
  );
}

function NavItem({ item, active, collapsed }: { item: Item; active: boolean; collapsed: boolean }) {
  const { href, label, icon: Icon, soon } = item;
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-3 rounded-xl text-sm font-semibold transition-all ${
        collapsed ? 'justify-center py-3' : 'px-3 py-2.5'
      } ${active ? 'bg-white text-[#0F2258] shadow-lg shadow-black/20' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#1E3F82]' : 'text-white/60 group-hover:text-white'}`} />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{label}</span>
          {soon && (
            <span
              className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                active ? 'bg-[#E8F0FB] text-[#1E3F82]' : 'bg-white/10 text-white/50'
              }`}
            >
              Sắp có
            </span>
          )}
        </>
      )}
    </Link>
  );
}

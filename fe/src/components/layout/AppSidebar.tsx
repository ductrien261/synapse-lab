'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ComponentType, type ReactNode } from 'react';
import {
  BoxFill,
  ChevronDoubleLeft,
  ChevronDoubleRight,
  ChevronDown,
  ClockHistory,
  CpuFill,
  Grid1x2Fill,
  HeartPulseFill,
  PeopleFill,
  ShieldLockFill,
} from 'react-bootstrap-icons';
import { useUser } from '@/lib/user-context';
import { useRecent } from '@/lib/recent';
import { TRACKS, type Track } from '@/lib/tracks';
import { useAlgoCatalog } from '@/lib/algo-catalog';
import { categoryLabelVi } from '@/lib/algo-categories';
import { useBodySystems } from '@/lib/anatomy-catalog';

type Icon = ComponentType<{ className?: string }>;

interface SubItem {
  href: string;
  label: string;
  dot?: string;
  /** màu hex của chấm tròn */
  color?: string;
  count?: number;
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const { user } = useUser();
  const track = user?.track ?? null;
  const isAdmin = user?.role === 'admin';

  // Admin (hoặc tài khoản chưa chọn ngành) thấy cả 2 module; sinh viên chỉ thấy module của ngành mình
  const showAlgorithms = isAdmin || track !== 'med';
  const showAnatomy = isAdmin || track !== 'cs';

  const recent = useRecent(track);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-64px)] shrink-0 bg-white border-r border-stone-200/80 flex flex-col transition-[width] duration-300 ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 pt-4 flex flex-col gap-5">
        {/* ---------- Học tập ---------- */}
        <NavSection title="Học tập" collapsed={collapsed}>
          <NavLink href="/" label="Tổng quan" icon={Grid1x2Fill} active={isActive('/')} collapsed={collapsed} />
          {showAlgorithms && (
            <AlgorithmsNav active={isActive('/algorithms')} collapsed={collapsed} />
          )}
          {showAnatomy && <AnatomyNav active={isActive('/anatomy')} collapsed={collapsed} />}
          <NavLink href="/classes" label="Lớp học" icon={PeopleFill} active={isActive('/classes')} collapsed={collapsed} />
        </NavSection>

        {/* ---------- Gần đây ---------- */}
        {!collapsed && recent.length > 0 && (
          <NavSection title="Gần đây" collapsed={collapsed}>
            {recent.slice(0, 4).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                  pathname === item.href
                    ? 'bg-[#F4F7FC] text-[#1E3F82] font-semibold'
                    : 'text-stone-600 hover:bg-[#F4F7FC] hover:text-stone-900'
                }`}
              >
                <ClockHistory className="w-3.5 h-3.5 shrink-0 text-stone-400 group-hover:text-[#1E3F82]" />
                <span className="truncate">{item.title}</span>
              </Link>
            ))}
          </NavSection>
        )}
      </div>

      {/* ---------- Chân sidebar ---------- */}
      <div className="p-3 border-t border-stone-100 flex flex-col gap-2">
        {isAdmin ? (
          <Link
            href="/admin"
            title={collapsed ? 'Về trang quản trị' : undefined}
            className={`flex items-center gap-3 rounded-xl py-2.5 text-xs font-bold bg-[#0F2258] hover:bg-[#1E3F82] text-white transition-colors ${
              collapsed ? 'justify-center' : 'px-3'
            }`}
          >
            <ShieldLockFill className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Về trang quản trị</span>}
          </Link>
        ) : (
          track && <TrackBadge track={track} collapsed={collapsed} />
        )}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          className={`w-full flex items-center gap-3 rounded-xl py-2.5 text-xs font-semibold text-stone-500 hover:text-[#1E3F82] hover:bg-[#F4F7FC] transition-colors cursor-pointer ${
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

/* ============================================================ */

function NavSection({ title, collapsed, children }: { title: string; collapsed: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {collapsed ? (
        <div className="mx-auto w-6 border-t border-stone-200 mb-1" />
      ) : (
        <div className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-stone-400">{title}</div>
      )}
      {children}
    </div>
  );
}

function linkClass(active: boolean, collapsed: boolean) {
  return `group relative flex items-center gap-3 rounded-xl text-sm font-semibold transition-all ${
    collapsed ? 'justify-center py-3' : 'px-3 py-2.5'
  } ${
    active
      ? 'bg-gradient-to-r from-[#1E3F82] to-[#2D56A6] text-white shadow-md shadow-[#1E3F82]/25'
      : 'text-stone-600 hover:text-stone-900 hover:bg-[#F4F7FC]'
  }`;
}

function NavIcon({ icon: Icon, active }: { icon: Icon; active: boolean }) {
  return (
    <span
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
        active ? 'bg-white/15 text-white' : 'bg-stone-100/80 text-stone-500 group-hover:bg-[#E8F0FB] group-hover:text-[#1E3F82]'
      }`}
    >
      <Icon className="w-4 h-4" />
    </span>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: Icon;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={linkClass(active, collapsed)}
    >
      <NavIcon icon={icon} active={active} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

/** Mục menu có danh sách con (nhóm thuật toán / hệ cơ quan). */
function ExpandableNav({
  href,
  label,
  icon,
  active,
  collapsed,
  items,
  loading,
}: {
  href: string;
  label: string;
  icon: Icon;
  active: boolean;
  collapsed: boolean;
  items: SubItem[];
  loading?: boolean;
}) {
  // Mở sẵn khi đang ở trong module; người dùng có thể tự đóng/mở
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? active;

  if (collapsed) {
    return <NavLink href={href} label={label} icon={icon} active={active} collapsed />;
  }

  return (
    <div>
      <div className={linkClass(active, false)}>
        <Link href={href} aria-current={active ? 'page' : undefined} className="flex items-center gap-3 flex-1 min-w-0">
          <NavIcon icon={icon} active={active} />
          <span className="truncate">{label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setManual(!open)}
          aria-expanded={open}
          aria-label={open ? `Thu gọn ${label}` : `Mở rộng ${label}`}
          className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer ${
            active ? 'hover:bg-white/15' : 'hover:bg-stone-200/60'
          }`}
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="ml-[26px] mt-1 pl-3 border-l border-stone-200 flex flex-col gap-0.5">
          {loading &&
            [1, 2, 3].map((i) => <div key={i} className="h-6 my-0.5 rounded-md bg-stone-100 animate-pulse" />)}
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] text-stone-600 hover:bg-[#F4F7FC] hover:text-[#1E3F82] transition-colors"
            >
              {item.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />}
              {item.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />}
              <span className="truncate flex-1">{item.label}</span>
              {item.count !== undefined && (
                <span className="text-[10.5px] font-semibold text-stone-400">{item.count}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AlgorithmsNav({ active, collapsed }: { active: boolean; collapsed: boolean }) {
  const { categories, state } = useAlgoCatalog();
  return (
    <ExpandableNav
      href="/algorithms"
      label="Thuật toán"
      icon={BoxFill}
      active={active}
      collapsed={collapsed}
      loading={state === 'loading'}
      items={categories.map((c) => ({
        href: `/algorithms?q=${encodeURIComponent(c.name)}`,
        label: categoryLabelVi(c.key, c.name),
        count: c.algorithms?.length ?? 0,
      }))}
    />
  );
}

function AnatomyNav({ active, collapsed }: { active: boolean; collapsed: boolean }) {
  const { systems, state } = useBodySystems();
  return (
    <ExpandableNav
      href="/anatomy"
      label="Giải phẫu 3D"
      icon={HeartPulseFill}
      active={active}
      collapsed={collapsed}
      loading={state === 'loading'}
      items={systems
        .filter((s) => s.model_count > 0)
        .map((s) => ({
          href: `/anatomy?system=${s.slug}`,
          label: s.name_vi,
          color: s.color,
          count: s.model_count,
        }))}
    />
  );
}

function TrackBadge({ track, collapsed }: { track: Track; collapsed: boolean }) {
  const config = TRACKS[track];
  const Icon = track === 'cs' ? CpuFill : HeartPulseFill;
  if (collapsed) {
    return (
      <div
        title={config.audience}
        className="mx-auto w-9 h-9 rounded-xl bg-[#E8F0FB] text-[#1E3F82] flex items-center justify-center"
      >
        <Icon className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-[#F4F7FC] to-[#E8F0FB] border border-[#DDE6F5] px-3 py-2.5">
      <span className="w-8 h-8 rounded-lg bg-white text-[#1E3F82] flex items-center justify-center shadow-sm">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-stone-400">Chuyên ngành</div>
        <div className="text-xs font-bold text-stone-800 truncate">{config.label}</div>
      </div>
    </div>
  );
}

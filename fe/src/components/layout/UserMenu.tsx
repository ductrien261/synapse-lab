'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BoxArrowRight, ChevronDown, GearFill, PersonCircle, ShieldLock } from 'react-bootstrap-icons';
import { useUser } from '@/lib/user-context';
import { TRACKS } from '@/lib/tracks';
import { getInitials } from '@/lib/format';

export function UserMenu() {
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Đóng khi click ra ngoài hoặc bấm Esc
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const displayName = user?.name || user?.email || 'Đang tải...';
  const subtitle =
    user?.role === 'admin'
      ? 'Quản trị viên'
      : user?.track
        ? TRACKS[user.track].audience
        : 'Chưa chọn chuyên ngành';
  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-2xl border transition-colors cursor-pointer ${
          open ? 'border-[#C5D5EE] bg-[#F4F7FC]' : 'border-transparent hover:bg-stone-50'
        }`}
      >
        <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1E3F82] to-[#5B8FD8] flex items-center justify-center text-white font-bold text-xs">
          {getInitials(displayName)}
        </span>
        <span className="hidden sm:block text-left">
          <span className="block text-xs font-bold text-stone-800 leading-none max-w-[180px] truncate">
            {displayName}
          </span>
          <span className="block text-[11px] text-stone-500 mt-1">{subtitle}</span>
        </span>
        <ChevronDown
          className={`w-3 h-3 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white rounded-2xl border border-stone-200/90 shadow-[0_16px_40px_-8px_rgba(15,34,88,0.18)] p-2 z-50"
        >
          <div className="px-3 py-2.5 mb-1 border-b border-stone-100">
            <div className="text-sm font-bold text-stone-900 truncate">{displayName}</div>
            <div className="text-xs text-stone-500 truncate">{user?.email}</div>
          </div>

          <MenuLink
            href="/profile"
            onClick={close}
            icon={<PersonCircle className="w-4 h-4" />}
            label="Hồ sơ"
          />
          <MenuLink href="/settings" onClick={close} icon={<GearFill className="w-4 h-4" />} label="Cài đặt" />
          {user?.role === 'admin' && (
            <MenuLink
              href="/admin"
              onClick={close}
              icon={<ShieldLock className="w-4 h-4" />}
              label="Trang quản trị"
            />
          )}

          <div className="my-1 border-t border-stone-100" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              logout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <BoxArrowRight className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-stone-700 hover:bg-[#F4F7FC] hover:text-[#1E3F82] transition-colors"
    >
      <span className="text-stone-500">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

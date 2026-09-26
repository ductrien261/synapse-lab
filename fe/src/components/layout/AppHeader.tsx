'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, List } from 'react-bootstrap-icons';
import { authHref } from '@/lib/auth-redirect';
import { useUser } from '@/lib/user-context';
import { UserMenu } from './UserMenu';

interface Props {
  /** Nơi logo dẫn tới (trang chủ học viên hoặc trang quản trị) */
  homeHref?: string;
  /** Nhãn nhỏ cạnh logo, ví dụ "Quản trị" */
  badge?: string;
  /** Mở menu điều hướng trên điện thoại */
  onMenu?: () => void;
}

export function AppHeader({ homeHref = '/dashboard', badge, onMenu }: Props) {
  const { guest } = useUser();
  const pathname = usePathname();
  return (
    <header className="h-16 bg-white border-b border-stone-200/80 px-3 sm:px-5 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Mở menu"
            className="md:hidden -ml-1 w-10 h-10 rounded-xl flex items-center justify-center text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            <List className="w-6 h-6" />
          </button>
        )}
        <Link href={guest ? '/' : homeHref} className="flex items-center" aria-label="Synapse Lab - Trang chủ">
          <Image
            src="/images/logo-horizontal.png"
            alt="Synapse Lab"
            width={170}
            height={42}
            className="h-8 sm:h-9 w-auto object-contain"
            priority
          />
        </Link>
        {badge && (
          <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#0F2258] text-white">
            {badge}
          </span>
        )}
      </div>

      {guest ? (
        <div className="flex items-center gap-2">
          <Link href={authHref('login', pathname)} className="hidden sm:block px-4 py-2 rounded-xl text-sm font-bold text-[#1E3F82] hover:bg-stone-50">
            Đăng nhập
          </Link>
          <Link href={authHref('register', pathname)} className="px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-sm font-bold text-white">
            <span className="sm:hidden">Đăng ký</span>
            <span className="hidden sm:inline">Tạo tài khoản miễn phí</span>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            title="Thông báo"
            className="w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
          </button>
          <UserMenu />
        </div>
      )}
    </header>
  );
}

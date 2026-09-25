'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Bell } from 'react-bootstrap-icons';
import { UserMenu } from './UserMenu';

interface Props {
  /** Nơi logo dẫn tới (trang chủ học viên hoặc trang quản trị) */
  homeHref?: string;
  /** Nhãn nhỏ cạnh logo, ví dụ "Quản trị" */
  badge?: string;
}

export function AppHeader({ homeHref = '/', badge }: Props) {
  return (
    <header className="h-16 bg-white border-b border-stone-200/80 px-5 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3">
        <Link href={homeHref} className="flex items-center" aria-label="Synapse Lab - Trang chủ">
          <Image
            src="/images/logo-horizontal.png"
            alt="Synapse Lab"
            width={170}
            height={42}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
        {badge && (
          <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#0F2258] text-white">
            {badge}
          </span>
        )}
      </div>

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
    </header>
  );
}

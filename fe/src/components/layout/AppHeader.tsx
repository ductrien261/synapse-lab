'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Bell } from 'react-bootstrap-icons';
import { UserMenu } from './UserMenu';

export function AppHeader() {
  return (
    <header className="h-16 bg-white border-b border-stone-200/80 px-5 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <Link href="/" className="flex items-center" aria-label="SYNAPSE LAB - Trang chủ">
        <Image
          src="/images/logo-horizontal.png"
          alt="SYNAPSE LAB"
          width={170}
          height={42}
          className="h-9 w-auto object-contain"
          priority
        />
      </Link>

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

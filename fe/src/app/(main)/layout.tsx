'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Grid1x2Fill, PeopleFill, PersonCircle } from 'react-bootstrap-icons';
import { UserProvider } from '@/lib/user-context';
import { isGuestPath } from '@/lib/auth-redirect';
import { useStorageValue, writeStorage } from '@/lib/storage';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';

const SIDEBAR_KEY = 'synapse_sidebar_collapsed';

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inLiveSpace = pathname.startsWith('/spaces/');
  // Nhớ trạng thái thu gọn sidebar giữa các lần tải trang
  const collapsed = useStorageValue(SIDEBAR_KEY) === '1';
  const toggleSidebar = () => writeStorage(SIDEBAR_KEY, collapsed ? '0' : '1');

  return (
    <UserProvider allowGuest={isGuestPath(pathname)}>
      <RequireAuth>
        <div className={`${inLiveSpace ? 'min-h-screen xl:h-screen xl:overflow-hidden' : 'min-h-screen'} bg-[var(--background)] flex flex-col antialiased`}>
          <AppHeader />
          <div className="flex min-h-0 flex-1 w-full">
            {!inLiveSpace && <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />}
            <main className={`flex-1 min-w-0 ${inLiveSpace ? 'overflow-y-auto p-0 xl:overflow-hidden' : 'px-4 pb-24 pt-5 md:p-8'}`}>
              <div className={`${inLiveSpace ? 'max-w-none' : 'max-w-7xl mx-auto'} w-full flex flex-col gap-6`}>{children}</div>
            </main>
          </div>
          {!inLiveSpace && <MobileMainNav pathname={pathname} />}
        </div>
      </RequireAuth>
    </UserProvider>
  );
}

function MobileMainNav({ pathname }: { pathname: string }) {
  const items = [
    { href: '/dashboard', label: 'Tổng quan', icon: Grid1x2Fill },
    { href: '/spaces', label: 'Không gian', icon: PeopleFill },
    { href: '/profile', label: 'Hồ sơ', icon: PersonCircle },
  ];
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-stone-200 bg-white/95 p-1.5 shadow-xl backdrop-blur md:hidden" aria-label="Điều hướng chính trên di động">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} className={`flex min-w-20 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-bold ${active ? 'bg-[#E8F0FB] text-[#1E3F82]' : 'text-stone-500'}`}><Icon className="h-4 w-4" />{item.label}</Link>;
      })}
    </nav>
  );
}

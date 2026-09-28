'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
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
        <div className={`${inLiveSpace ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-[var(--background)] flex flex-col antialiased`}>
          <AppHeader />
          <div className="flex min-h-0 flex-1 w-full">
            {!inLiveSpace && <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />}
            <main className={`flex-1 min-w-0 ${inLiveSpace ? 'overflow-hidden p-3' : 'p-6 md:p-8'}`}>
              <div className={`${inLiveSpace ? 'max-w-none' : 'max-w-7xl mx-auto'} w-full flex flex-col gap-6`}>{children}</div>
            </main>
          </div>
        </div>
      </RequireAuth>
    </UserProvider>
  );
}

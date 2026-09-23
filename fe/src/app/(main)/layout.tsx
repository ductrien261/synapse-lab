'use client';

import type { ReactNode } from 'react';
import { UserProvider } from '@/lib/user-context';
import { useStorageValue, writeStorage } from '@/lib/storage';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';

const SIDEBAR_KEY = 'synapse_sidebar_collapsed';

export default function MainLayout({ children }: { children: ReactNode }) {
  // Nhớ trạng thái thu gọn sidebar giữa các lần tải trang
  const collapsed = useStorageValue(SIDEBAR_KEY) === '1';
  const toggleSidebar = () => writeStorage(SIDEBAR_KEY, collapsed ? '0' : '1');

  return (
    <UserProvider>
      <RequireAuth>
        <div className="min-h-screen bg-[var(--background)] flex flex-col antialiased">
          <AppHeader />
          <div className="flex flex-1 w-full">
            <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />
            <main className="flex-1 min-w-0 p-6 md:p-8">
              <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">{children}</div>
            </main>
          </div>
        </div>
      </RequireAuth>
    </UserProvider>
  );
}

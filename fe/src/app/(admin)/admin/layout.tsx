'use client';

import type { ReactNode } from 'react';
import { UserProvider } from '@/lib/user-context';
import { useStorageValue, writeStorage } from '@/lib/storage';
import { RequireAdmin, RequireAuth } from '@/components/auth/RequireAuth';
import { AppHeader } from '@/components/layout/AppHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

const SIDEBAR_KEY = 'synapse_admin_sidebar_collapsed';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const collapsed = useStorageValue(SIDEBAR_KEY) === '1';
  const toggleSidebar = () => writeStorage(SIDEBAR_KEY, collapsed ? '0' : '1');

  return (
    <UserProvider>
      <RequireAuth>
        <div className="min-h-screen bg-[#F5F7FB] flex flex-col antialiased">
          <AppHeader homeHref="/admin" badge="Quản trị" />
          <div className="flex flex-1 w-full">
            <AdminSidebar collapsed={collapsed} onToggle={toggleSidebar} />
            <main className="flex-1 min-w-0 p-6 md:p-8">
              <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 pb-12">
                <RequireAdmin>{children}</RequireAdmin>
              </div>
            </main>
          </div>
        </div>
      </RequireAuth>
    </UserProvider>
  );
}

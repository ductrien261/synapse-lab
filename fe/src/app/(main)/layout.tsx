'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { UserProvider } from '@/lib/user-context';
import { isGuestPath } from '@/lib/auth-redirect';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <UserProvider allowGuest={isGuestPath(pathname)}>
      <RequireAuth>
        <div className="min-h-screen bg-[var(--background)] flex flex-col antialiased">
          <AppHeader />
          <div className="flex flex-1 w-full">
            <AppSidebar collapsed={false} />
            <main className="flex-1 min-w-0 p-6 md:p-8">
              <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">{children}</div>
            </main>
          </div>
        </div>
      </RequireAuth>
    </UserProvider>
  );
}

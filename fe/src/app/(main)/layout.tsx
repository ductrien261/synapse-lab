'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { UserProvider } from '@/lib/user-context';
import { isGuestPath } from '@/lib/auth-redirect';
import { useStorageValue, writeStorage } from '@/lib/storage';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

const SIDEBAR_KEY = 'synapse_sidebar_collapsed';

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Nhớ trạng thái thu gọn sidebar giữa các lần tải trang
  const collapsed = useStorageValue(SIDEBAR_KEY) === '1';
  const toggleSidebar = () => writeStorage(SIDEBAR_KEY, collapsed ? '0' : '1');
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <UserProvider allowGuest={isGuestPath(pathname)}>
      <RequireAuth>
        <div className="min-h-screen bg-[var(--background)] flex flex-col antialiased">
          <AppHeader onMenu={() => setMenuOpen(true)} />
          <div className="flex flex-1 w-full">
            <div className="hidden md:flex">
              <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />
            </div>
            <MobileDrawer open={menuOpen} onClose={closeMenu}>
              <AppSidebar collapsed={false} onToggle={closeMenu} mobile />
            </MobileDrawer>
            <main className="flex-1 min-w-0 px-4 py-5 sm:p-6 md:p-8">
              <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">{children}</div>
            </main>
          </div>
          <FeedbackButton />
        </div>
      </RequireAuth>
    </UserProvider>
  );
}

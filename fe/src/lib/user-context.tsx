'use client';

// ============================================================
// SYNAPSE-LAB — Thông tin người dùng đang đăng nhập
// Bọc quanh layout (main) để mọi trang dùng chung qua useUser().
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, authApi, clearTokens, getAccessToken, type CurrentUser } from './api';

export type { CurrentUser } from './api';
export type ProfileUpdate = Partial<Pick<CurrentUser, 'name' | 'track'>>;

interface UserContextValue {
  user: CurrentUser | null;
  loading: boolean;
  /** Lỗi không phải do đăng nhập (mất mạng, backend sập...) */
  error: string | null;
  refresh: () => Promise<void>;
  updateMe: (data: ProfileUpdate) => Promise<CurrentUser>;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    router.replace('/login');
  }, [router]);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      logout();
      return;
    }
    setLoading(true);
    try {
      setUser(await authApi.me());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) logout();
      else setError(err instanceof Error ? err.message : 'Không tải được thông tin tài khoản');
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const updateMe = useCallback(async (data: ProfileUpdate) => {
    const updated = await authApi.updateMe(data);
    setUser(updated);
    return updated;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, error, refresh, updateMe, logout }),
    [user, loading, error, refresh, updateMe, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser() phải được dùng bên trong <UserProvider>');
  return ctx;
}

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
import { resetLearning } from './recent';

export type { CurrentUser } from './api';
export type ProfileUpdate = Partial<Pick<CurrentUser, 'name' | 'track'>>;

interface UserContextValue {
  user: CurrentUser | null;
  loading: boolean;
  /** Lỗi không phải do đăng nhập (mất mạng, backend sập...) */
  error: string | null;
  /** Khách (chưa đăng nhập) đang xem trang cho phép dùng thử */
  guest: boolean;
  refresh: () => Promise<void>;
  updateMe: (data: ProfileUpdate) => Promise<CurrentUser>;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children, allowGuest = false }: { children: ReactNode; allowGuest?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearTokens();
    resetLearning();
    setUser(null);
    router.replace('/login');
  }, [router]);

  // Chỉ gọi setState trong callback của promise (không gọi đồng bộ) để dùng được trong useEffect
  const load = useCallback((): Promise<void> => {
    if (!getAccessToken()) {
      clearTokens();
      if (allowGuest) {
        // Trang dùng thử: không bắt đăng nhập
        return Promise.resolve().then(() => {
          setUser(null);
          setLoading(false);
        });
      }
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return Promise.resolve();
    }
    return authApi
      .me()
      .then((me) => {
        setUser(me);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) logout();
        else setError(err instanceof Error ? err.message : 'Không tải được thông tin tài khoản');
      })
      .finally(() => setLoading(false));
  }, [logout, router, allowGuest]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const updateMe = useCallback(async (data: ProfileUpdate) => {
    const updated = await authApi.updateMe(data);
    setUser(updated);
    return updated;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const guest = allowGuest && !user && !loading && !error;
  const value = useMemo(
    () => ({ user, loading, error, guest, refresh, updateMe, logout }),
    [user, loading, error, guest, refresh, updateMe, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser() phải được dùng bên trong <UserProvider>');
  return ctx;
}

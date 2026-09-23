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
import type { Track } from './tracks';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  track: Track | null;
  is_active: boolean;
  date_joined: string;
}

export type ProfileUpdate = Partial<Pick<CurrentUser, 'name' | 'track'>>;

interface UserContextValue {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  updateMe: (data: ProfileUpdate) => Promise<CurrentUser>;
  logout: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000/api';

class AuthError extends Error {}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token');
  if (!token) throw new AuthError('NO_TOKEN');
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) throw new AuthError('UNAUTHORIZED');
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    router.replace('/login');
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      setUser(await authFetch<CurrentUser>('/users/me/'));
    } catch (err) {
      if (err instanceof AuthError) logout();
      else console.error('Không tải được thông tin người dùng:', err);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const updateMe = useCallback(async (data: ProfileUpdate) => {
    const updated = await authFetch<CurrentUser>('/users/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    setUser(updated);
    return updated;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh, updateMe, logout }),
    [user, loading, refresh, updateMe, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser() phải được dùng bên trong <UserProvider>');
  return ctx;
}

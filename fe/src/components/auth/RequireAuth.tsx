'use client';

import type { ReactNode } from 'react';
import { useUser } from '@/lib/user-context';

/** Chỉ hiện nội dung khi đã tải xong người dùng; chưa đăng nhập thì UserProvider tự chuyển về /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, error, refresh } = useUser();

  if (user) return <>{children}</>;

  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)]">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-stone-200/90 p-8 text-center">
          <p className="text-sm font-semibold text-stone-800">Không kết nối được máy chủ</p>
          <p className="text-xs text-stone-500 mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-5 px-5 py-2.5 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-8 h-8 border-2 border-[#1E3F82] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** Chỉ admin mới thấy nội dung; người khác thấy thông báo không có quyền. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useUser();
  if (user?.role === 'admin') return <>{children}</>;
  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 p-10 text-center">
      <p className="text-base font-bold text-stone-900">Bạn không có quyền truy cập trang này</p>
      <p className="text-sm text-stone-500 mt-1">Trang quản trị chỉ dành cho quản trị viên.</p>
    </div>
  );
}

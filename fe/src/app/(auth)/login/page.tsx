'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/users/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Email hoặc mật khẩu không đúng');
      const data = await res.json();
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img src="/images/logo-vertical.png" alt="SYNAPSE LAB" className="h-24 w-auto object-contain" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-[0_8px_32px_rgba(36,51,85,0.08)] p-8">
          <h1 className="text-xl font-extrabold text-stone-900 mb-1">
            Đăng nhập
          </h1>
          <p className="text-xs text-stone-500 font-medium mb-6">
            Chào mừng trở lại với SYNAPSE-LAB
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10 transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">MẬT KHẨU</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10 transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#1E3F82] text-white font-bold text-sm hover:bg-[#163070] transition-colors shadow-md shadow-[#1E3F82]/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="text-center text-xs text-stone-500 font-medium mt-6">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="text-[#1E3F82] font-bold hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

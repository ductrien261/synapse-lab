'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/users/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Đăng ký thất bại, thử lại sau');
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
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#3D568F] flex items-center justify-center text-white font-bold text-lg shadow-md">S</div>
          <span className="font-bold text-2xl tracking-tight text-[#3D568F] font-[family-name:var(--font-headline)]">SYNAPSE</span>
          <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAF3B2] text-[#344015] font-semibold border border-[#D8E4AB]">Dual Core</span>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-[0_8px_32px_rgba(36,51,85,0.08)] p-8">
          <h1 className="text-xl font-bold text-stone-900 mb-1 font-[family-name:var(--font-headline)]">Đăng ký</h1>
          <p className="text-xs text-stone-500 font-mono mb-6">Tạo tài khoản SYNAPSE-LAB mới</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 font-mono">HỌ TÊN</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nguyễn Văn A"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#3D568F] focus:ring-2 focus:ring-[#3D568F]/10 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 font-mono">EMAIL</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="example@email.com"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#3D568F] focus:ring-2 focus:ring-[#3D568F]/10 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 font-mono">MẬT KHẨU</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#3D568F] focus:ring-2 focus:ring-[#3D568F]/10 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 font-mono">VAI TRÒ</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#3D568F] focus:ring-2 focus:ring-[#3D568F]/10 transition-all bg-white">
                <option value="student">Học sinh / Sinh viên</option>
                <option value="teacher">Giáo viên / Giảng viên</option>
              </select>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#3D568F] text-white font-bold text-sm hover:bg-[#2F4371] transition-colors shadow-md shadow-[#3D568F]/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="text-center text-xs text-stone-500 font-mono mt-6">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-[#3D568F] font-bold hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

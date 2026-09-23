'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Grid1x2Fill,
  Diagram3Fill,
  HeartPulseFill,
  Gear,
  QuestionCircle,
  BoxFill,
} from 'react-bootstrap-icons';

const NAV_ITEMS = [
  { href: '/', label: 'Tổng quan', icon: Grid1x2Fill },
  { href: '/algorithms', label: 'Thuật toán', icon: BoxFill },
  { href: '/anatomy', label: 'Giải phẫu 3D', icon: HeartPulseFill },
  { href: '/simulations', label: 'Phòng mô phỏng', icon: Diagram3Fill },
];

function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-72 bg-white border-r border-stone-200/80 min-h-[calc(100vh-64px)] flex flex-col justify-between p-5 shrink-0 shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-xs font-mono font-bold tracking-wider text-stone-500 uppercase">ĐIỀU HƯỚNG NỀN TẢNG</span>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF3B2] text-[#344015] border border-[#D8E4AB]">v2.4 Pro</span>
        </div>

        <nav className="flex flex-col gap-1.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active ? 'bg-[#3D568F] text-white shadow-md shadow-[#3D568F]/20' : 'text-stone-600 hover:text-stone-900 hover:bg-[#F4F6F9]'
                }`}>
                <span className={`shrink-0 transition-colors ${active ? 'text-[#EAF3B2]' : 'text-stone-500'}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="leading-snug">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-5 pt-4">
        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
            <span className="text-stone-700">PHIÊN HỌC TẬP KÉP</span>
            <span className="text-[#3D568F] bg-[#9FBAF1]/25 px-2 py-0.5 rounded-md">—</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed font-mono">Chưa có phiên nào đang chạy</p>
        </div>
        <div className="flex items-center justify-between px-2 pt-3 border-t border-stone-100 text-xs font-semibold text-stone-500">
          <button className="hover:text-[#3D568F] transition-colors flex items-center gap-2 cursor-pointer py-1">
            <Gear className="w-4 h-4 text-stone-500" /><span>Cài đặt</span>
          </button>
          <button className="hover:text-[#3D568F] transition-colors flex items-center gap-2 cursor-pointer py-1">
            <QuestionCircle className="w-4 h-4 text-stone-500" /><span>Trợ giúp</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function Header() {
  const router = useRouter();
  const [userName, setUserName] = useState('...');
  const [userInitials, setUserInitials] = useState('?');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/users/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setUserName(data.name || data.email);
        setUserInitials((data.name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2));
      })
      .catch(() => { router.push('/login'); });
  }, [router]);

  return (
    <header className="h-16 bg-white border-b border-stone-200/80 px-6 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#3D568F] flex items-center justify-center text-white font-bold text-base shadow-xs">S</div>
        <span className="font-bold text-lg tracking-tight text-[#3D568F] font-[family-name:var(--font-headline)]">SYNAPSE</span>
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAF3B2] text-[#344015] font-semibold border border-[#D8E4AB]">Dual Core</span>
      </div>

      <div className="flex items-center gap-3">
        <button title="Thông báo" className="relative w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <div className="flex items-center gap-2.5 pl-2 border-l border-stone-200/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3D568F] to-[#9FBAF1] flex items-center justify-center text-white font-bold text-xs ring-2 ring-[#EAF3B2]">
            {userInitials}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-stone-800 leading-none font-[family-name:var(--font-headline)]">{userName}</div>
            <div className="text-[10px] text-stone-500 font-mono mt-1">SYNAPSE-LAB</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col antialiased">
      <Header />
      <div className="flex-1 flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
          {children}
        </main>
      </div>
    </div>
  );
}

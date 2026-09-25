'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { List, XLg } from 'react-bootstrap-icons';
import { getAccessToken } from '@/lib/api';
import { APP_HOME } from '@/lib/auth-redirect';
import { NAV } from '@/lib/marketing';

const noop = () => () => {};

/** Đã đăng nhập chưa (đọc token ở trình duyệt; phía máy chủ luôn coi là chưa). */
function useSignedIn(): boolean {
  return useSyncExternalStore(noop, () => Boolean(getAccessToken()), () => false);
}

export function SiteHeader() {
  const pathname = usePathname();
  const signedIn = useSignedIn();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between gap-6 px-5 md:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Synapse Lab - Trang chủ">
          <Image src="/images/logo-horizontal.png" alt="Synapse Lab" width={170} height={42} className="h-9 w-auto" priority />
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[15px] font-medium transition-colors ${
                pathname.startsWith(item.href) ? 'text-[#1E3F82]' : 'text-slate-600 hover:text-[#0F2258]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {signedIn ? (
            <Link href={APP_HOME} className="rounded-lg bg-[#1E3F82] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#163070]">
              Vào ứng dụng
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-4 py-2.5 text-[15px] font-semibold text-[#0F2258] hover:bg-slate-50">
                Đăng nhập
              </Link>
              <Link href="/#try" className="rounded-lg bg-[#1E3F82] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#163070]">
                Trải nghiệm ngay
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[#0F2258] hover:bg-slate-50 lg:hidden"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
        >
          {open ? <XLg className="h-5 w-5" /> : <List className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-5 pb-6 pt-2 lg:hidden">
          <nav aria-label="Điều hướng di động" className="flex flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-slate-100 py-3.5 text-base font-medium text-[#0F2258]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-3">
            {signedIn ? (
              <Link href={APP_HOME} className="rounded-lg bg-[#1E3F82] px-5 py-3 text-center font-semibold text-white">
                Vào ứng dụng
              </Link>
            ) : (
              <>
                <Link href="/#try" onClick={() => setOpen(false)} className="rounded-lg bg-[#1E3F82] px-5 py-3 text-center font-semibold text-white">
                  Trải nghiệm ngay
                </Link>
                <Link href="/login" className="rounded-lg border border-slate-300 px-5 py-3 text-center font-semibold text-[#0F2258]">
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

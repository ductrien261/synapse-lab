'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LockFill } from 'react-bootstrap-icons';
import { authHref } from '@/lib/auth-redirect';

/** Khách xem thử: tính năng cần tài khoản thì hiện lời mời đăng ký, quay lại đúng trang sau khi xong. */
export function GuestLock({ title, text }: { title: string; text: string }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <span className="w-12 h-12 rounded-2xl bg-[#E8F0FB] text-[#1E3F82] flex items-center justify-center">
        <LockFill className="w-5 h-5" />
      </span>
      <p className="mt-4 text-sm font-bold text-stone-900">{title}</p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-stone-500">{text}</p>
      <Link href={authHref('register', pathname)} className="mt-5 px-5 py-2.5 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-sm font-bold text-white">
        Tạo tài khoản miễn phí
      </Link>
      <Link href={authHref('login', pathname)} className="mt-2 px-4 py-2 text-xs font-bold text-[#1E3F82] hover:underline">
        Đã có tài khoản? Đăng nhập
      </Link>
    </div>
  );
}

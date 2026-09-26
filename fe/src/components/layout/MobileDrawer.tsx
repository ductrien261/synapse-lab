'use client';

import { useEffect, type ReactNode } from 'react';

/** Ngăn kéo điều hướng cho màn hình nhỏ: bấm nền, bấm liên kết hoặc Esc để đóng. */
export function MobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
      <button type="button" aria-label="Đóng menu" onClick={onClose} className="absolute inset-0 bg-[#0F2258]/40 backdrop-blur-[2px]" />
      <div
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] shadow-2xl"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a')) onClose();
        }}
      >
        {children}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChartFill, Easel2, Grid, PencilSquare, X } from 'react-bootstrap-icons';
import { openClassroomUtility, type ClassroomUtility } from './classroom-utility-events';

interface Props {
  isModerator: boolean;
  canAnnotate: boolean;
}

export function ClassroomUtilitiesMenu({ isModerator, canAnnotate }: Props) {
  const [controlBar, setControlBar] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    const findControlBar = () => {
      const target = document.querySelector<HTMLElement>('.lk-video-conference .lk-control-bar');
      if (target) {
        setControlBar(target);
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(findControlBar);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(findControlBar);
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  if (!controlBar) return null;

  const selectUtility = (utility: ClassroomUtility) => {
    setOpen(false);
    openClassroomUtility(utility);
  };

  const items = [
    ...(isModerator ? [{
      id: 'annotations' as const,
      label: 'Ghi chú trên PDF',
      description: canAnnotate ? 'Vẽ, tô sáng và ghi chú trực tiếp' : 'Mở một tài liệu PDF để sử dụng',
      icon: PencilSquare,
      iconClass: 'bg-amber-50 text-amber-700',
      disabled: !canAnnotate,
    }] : []),
    {
      id: 'whiteboard' as const,
      label: 'Bảng cộng tác',
      description: 'Cùng viết và minh họa theo thời gian thực',
      icon: Easel2,
      iconClass: 'bg-emerald-50 text-emerald-700',
      disabled: false,
    },
    ...(isModerator ? [{
      id: 'poll' as const,
      label: 'Câu hỏi tương tác',
      description: 'Tạo poll nhanh và xem kết quả trực tiếp',
      icon: BarChartFill,
      iconClass: 'bg-sky-50 text-sky-700',
      disabled: false,
    }] : []),
  ];

  return createPortal(<div ref={menuRef} className="synapse-utility-actions relative shrink-0">
    <button type="button" aria-label="Tiện ích lớp học" title="Tiện ích" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)} className={`lk-button synapse-utility-button !px-3 ${open ? '!bg-slate-700 !text-white' : ''}`}>
      <Grid size={19} aria-hidden="true" />
      <span>Tiện ích</span>
    </button>
    {open && <section id={menuId} role="dialog" aria-label="Tiện ích lớp học" className="absolute bottom-[calc(100%+12px)] right-0 z-[70] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-[0_24px_64px_-16px_rgba(15,34,88,0.45)]">
      <div className="mb-2 flex items-center justify-between px-1 py-1">
        <div><h2 className="text-sm font-extrabold text-[#0F2258]">Tiện ích</h2><p className="mt-0.5 text-[11px] text-slate-500">Công cụ hỗ trợ trong buổi học</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Đóng tiện ích" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
      </div>
      <div className="space-y-1">
        {items.map(({ id, label, description, icon: Icon, iconClass, disabled }) => <button key={id} type="button" disabled={disabled} onClick={() => selectUtility(id)} className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconClass}`}><Icon size={18} aria-hidden="true" /></span>
          <span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{label}</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{description}</span></span>
        </button>)}
      </div>
    </section>}
  </div>, controlBar);
}


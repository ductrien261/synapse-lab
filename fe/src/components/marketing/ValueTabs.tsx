'use client';

import { useState, type ReactNode } from 'react';

export interface ValueItem {
  title: string;
  text: string;
  visual: ReactNode;
}

/** Danh sách bên trái, hình minh họa bên phải (bố cục layout-491). */
export function ValueTabs({ items }: { items: ValueItem[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-20">
      <div className="flex flex-col" role="tablist" aria-orientation="vertical">
        {items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`border-b border-slate-200 py-6 text-left transition-opacity ${active === i ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
          >
            <h3 className="text-2xl font-bold tracking-tight text-[#0F2258] md:text-[28px]">{item.title}</h3>
            <div className={`grid transition-all duration-300 ${active === i ? 'mt-3 grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <p className="overflow-hidden text-base leading-relaxed text-slate-600">{item.text}</p>
            </div>
          </button>
        ))}
      </div>
      <div role="tabpanel">{items[active]?.visual}</div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

export interface StepItem {
  eyebrow: string;
  title: string;
  text: string;
}

/** Số thứ tự lớn dính bên trái, các bước cuộn bên phải (bố cục layout-485). */
export function StepsScroll({ steps }: { steps: StepItem[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        });
      },
      { rootMargin: '-30% 0px -55% 0px' },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid items-start gap-x-20 gap-y-12 md:grid-cols-[max-content_1fr]">
      <div className="sticky top-[24%] hidden h-[13rem] overflow-hidden md:flex" aria-hidden>
        <span className="text-[13rem] font-bold leading-none tracking-tighter text-[#0F2258]">0</span>
        <div className="transition-transform duration-500 ease-out" style={{ transform: `translateY(-${active * 13}rem)` }}>
          {steps.map((_, i) => (
            <span key={i} className="block text-[13rem] font-bold leading-none tracking-tighter text-[#0F2258]">
              {i + 1}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-16 md:gap-28">
        {steps.map((step, i) => (
          <div
            key={step.title}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-index={i}
            className="flex min-h-[16rem] flex-col justify-center"
          >
            <span className="mb-6 text-6xl font-bold tracking-tighter text-[#0F2258] md:hidden">0{i + 1}</span>
            <div className="mb-8 h-0.5 w-full bg-slate-200">
              <div className="h-0.5 bg-[#1E3F82] transition-[width] duration-700" style={{ width: i <= active ? '100%' : '0%' }} />
            </div>
            <p className="mb-3 text-sm font-semibold text-[#1E3F82]">{step.eyebrow}</p>
            <h3 className="text-3xl font-bold tracking-tight text-[#0F2258] md:text-[40px] md:leading-tight">{step.title}</h3>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

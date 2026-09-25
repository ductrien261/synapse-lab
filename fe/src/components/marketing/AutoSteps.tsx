'use client';

import { useEffect, useState } from 'react';

/** Các bước nối tiếp nhau, tự sáng lần lượt như một luồng xử lý đang chạy. */
export function AutoSteps({ steps, dark = false }: { steps: { title: string; text: string }[]; dark?: boolean }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % steps.length), 2600);
    return () => window.clearInterval(timer);
  }, [paused, steps.length]);

  const progress = steps.length > 1 ? (active / (steps.length - 1)) * 100 : 100;

  return (
    <div onMouseLeave={() => setPaused(false)}>
      <div className={`relative mb-8 hidden h-1 rounded-full lg:block ${dark ? 'bg-white/10' : 'bg-slate-200'}`}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-[#5B8FD8] transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => {
          const on = i === active;
          return (
            <li key={step.title}>
              <button
                type="button"
                onMouseEnter={() => {
                  setPaused(true);
                  setActive(i);
                }}
                onFocus={() => {
                  setPaused(true);
                  setActive(i);
                }}
                className={`h-full w-full rounded-xl border p-6 text-left transition-all duration-500 ${
                  dark
                    ? on
                      ? 'border-[#5B8FD8] bg-white/[0.08] shadow-[0_0_0_4px_rgba(91,143,216,0.15)]'
                      : 'border-white/10 bg-white/[0.03]'
                    : on
                      ? 'border-[#1E3F82] bg-white shadow-[0_18px_40px_-24px_rgba(15,34,88,0.45)]'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    on ? 'bg-[#5B8FD8] text-white' : dark ? 'bg-white/10 text-white/70' : 'bg-[#E8F0FB] text-[#1E3F82]'
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`mt-5 block text-lg font-bold ${dark ? 'text-white' : 'text-[#0F2258]'}`}>{step.title}</span>
                <span className={`mt-2 block text-[15px] leading-relaxed ${dark ? 'text-white/65' : 'text-slate-600'}`}>{step.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

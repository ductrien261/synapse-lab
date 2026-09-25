'use client';

import { useState } from 'react';
import { Box, PlayCircle } from 'react-bootstrap-icons';
import { ButtonLink } from './ui';
import { ModelGallery } from './ModelGallery';
import { SortDemo } from './SortDemo';

const TABS = [
  { key: 'models', label: 'Mô hình 3D', icon: Box },
  { key: 'simulation', label: 'Mô phỏng giải thuật', icon: PlayCircle },
] as const;

/** Trải nghiệm thật ngay trên trang: mở mô hình hoặc chạy mô phỏng, không cần tài khoản. */
export function ExperienceTabs() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('models');
  return (
    <div>
      <div className="mx-auto mb-10 flex w-fit rounded-xl border border-slate-200 bg-white p-1" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[15px] font-semibold transition-colors ${
              tab === key ? 'bg-[#1E3F82] text-white' : 'text-slate-600 hover:text-[#0F2258]'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {tab === 'models' ? (
        <div role="tabpanel">
          <ModelGallery />
          <div className="mt-10 flex justify-center">
            <ButtonLink href="/anatomy" variant="secondary">
              Xem toàn bộ thư viện mô hình
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div role="tabpanel">
          <SortDemo />
          <div className="mt-10 flex justify-center">
            <ButtonLink href="/algorithms" variant="secondary">
              Mở thư viện giải thuật đầy đủ
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}

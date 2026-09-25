'use client';

import { useEffect, useState } from 'react';
import { algoVizApi } from '@/lib/algo-api';
import { useAnatomyModels, useBodySystems } from '@/lib/anatomy-catalog';
import { SOURCES } from '@/lib/marketing';
import { CountUp, Reveal } from './motion';

/** Số liệu thật lấy từ hệ thống (mô hình, hệ cơ quan, giải thuật, nguồn). */
export function LiveStats() {
  const { models } = useAnatomyModels();
  const { systems } = useBodySystems();
  const [algorithms, setAlgorithms] = useState(0);

  useEffect(() => {
    let cancelled = false;
    algoVizApi
      .getCategories()
      .then((d) => {
        if (!cancelled) setAlgorithms((d.categories ?? []).reduce((n, c) => n + (c.algorithms?.length ?? 0), 0));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { value: models.filter((m) => m.is_published).length, label: 'Mô hình 3D đang mở' },
    { value: systems.filter((s) => s.model_count > 0).length, label: 'Hệ cơ quan' },
    { value: algorithms, label: 'Giải thuật có mô phỏng' },
    { value: SOURCES.length, label: 'Nguồn học liệu mở' },
  ].filter((s) => s.value > 0);

  return (
    <ul className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s, i) => (
        <Reveal as="li" key={s.label} delay={i * 100} className="bg-white p-8">
          <p className="text-5xl font-bold tracking-tight text-[#1E3F82] md:text-6xl">
            <CountUp value={s.value} />
          </p>
          <p className="mt-3 text-[15px] text-slate-600">{s.label}</p>
        </Reveal>
      ))}
    </ul>
  );
}

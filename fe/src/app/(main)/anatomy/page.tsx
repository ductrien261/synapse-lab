'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { anatomyApi } from '@/lib/api';
import { HeartPulseFill } from 'react-bootstrap-icons';

interface AnatomySystem {
  id: string;
  slug: string;
  name_vi: string;
  name_en: string;
  iframe_url: string;
  sketchfab_model_id: string;
  part_count: number;
}

const THUMBNAIL_COLORS: Record<string, string> = {
  'cardiovascular': 'from-rose-500 to-red-600',
  'nervous': 'from-violet-500 to-purple-600',
  'musculoskeletal': 'from-amber-500 to-orange-600',
  'respiratory': 'from-sky-500 to-blue-600',
};

export default function AnatomyPage() {
  const [systems, setSystems] = useState<AnatomySystem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    anatomyApi.getSystems()
      .then((data) => setSystems(data as AnatomySystem[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#243355] via-[#163070] to-[#1E3F82] text-white rounded-3xl p-7 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#5B8FD8]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[#E8F0FB] text-xs font-mono font-bold mb-3.5 border border-white/15">
            <HeartPulseFill className="w-3 h-3" /> GIẢI PHẪU 3D TƯƠNG TÁC
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Phòng Giải Phẫu 3D</h1>
          <p className="text-sm text-white/80 mt-2">Khám phá cấu trúc cơ thể người qua mô hình 3D tương tác</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map((i) => <div key={i} className="h-48 rounded-2xl bg-stone-100 animate-pulse" />)}
        </div>
      ) : systems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <p className="text-stone-400 font-mono text-sm">Chưa có hệ cơ quan nào. Admin cần thêm vào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systems.map((system) => {
            const gradient = THUMBNAIL_COLORS[system.slug] || 'from-[#1E3F82] to-[#5B8FD8]';
            return (
              <Link key={system.id} href={`/anatomy/${system.slug}`}
                className="group bg-white rounded-2xl border border-stone-200/90 hover:border-[#1E3F82]/50 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(36,51,85,0.12)] hover:-translate-y-1.5 transition-all duration-300">
                <div className={`h-36 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <HeartPulseFill className="w-12 h-12 text-white/60" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-stone-900 group-hover:text-[#1E3F82] transition-colors">
                    {system.name_vi}
                  </h3>
                  <p className="text-xs text-stone-400 font-mono mt-1">{system.name_en}</p>
                  {system.part_count > 0 && (
                    <p className="text-xs text-stone-500 mt-2">{system.part_count} bộ phận</p>
                  )}
                  <span className="mt-3 inline-block text-xs font-bold text-[#1E3F82] font-mono">Khám phá 3D →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
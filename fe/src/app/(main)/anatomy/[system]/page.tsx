'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { anatomyApi } from '@/lib/api';
import { MedicalSimulationView } from '@/components/medical/MedicalSimulationView';
import { ArrowLeft } from 'react-bootstrap-icons';

interface AnatomySystem {
  id: string;
  slug: string;
  name_vi: string;
  name_en: string;
  iframe_url: string;
  sketchfab_model_id: string;
}

export default function AnatomyViewerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.system as string;

  const [system, setSystem] = useState<AnatomySystem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    anatomyApi.getSystem(slug)
      .then((data) => setSystem(data as AnatomySystem))
      .catch(() => setError('Khong tim thay he co quan nay'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3 text-stone-400">
        <div className="w-8 h-8 border-2 border-[#3D568F] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Dang tai mo hinh 3D...</span>
      </div>
    </div>
  );

  if (error || !system) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-sm text-stone-500 font-mono">{error || 'Loi khong xac dinh'}</p>
      <button onClick={() => router.push('/anatomy')}
        className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-[#3D568F] text-white hover:bg-[#2F4371] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Quay lai
      </button>
    </div>
  );

  return (
    <MedicalSimulationView
      system={system}
      onBack={() => router.push('/anatomy')}
    />
  );
}
'use client';

import { useState } from 'react';
import { CheckCircleFill, CpuFill, HeartPulseFill } from 'react-bootstrap-icons';
import { TRACKS, type Track } from '@/lib/tracks';

const TRACK_META: Record<Track, { icon: typeof CpuFill; description: string }> = {
  cs: {
    icon: CpuFill,
    description: 'Trực quan hóa thuật toán từng bước: đồ thị, quy hoạch động, quay lui, sắp xếp...',
  },
  med: {
    icon: HeartPulseFill,
    description: 'Mô hình giải phẫu 3D tương tác, bấm vào từng bộ phận để tra cứu kiến thức và giáo trình.',
  },
};

/** Hai thẻ lựa chọn chuyên ngành (dùng lại ở dashboard và trang hồ sơ). */
export function TrackOptions({
  value,
  onChange,
  disabled,
}: {
  value: Track | null;
  onChange: (track: Track) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Chọn chuyên ngành">
      {(Object.keys(TRACKS) as Track[]).map((key) => {
        const config = TRACKS[key];
        const { icon: Icon, description } = TRACK_META[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={`relative text-left p-5 rounded-2xl border-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              selected
                ? 'border-[#1E3F82] bg-[#F4F7FC] shadow-md shadow-[#1E3F82]/10'
                : 'border-stone-200 bg-white hover:border-[#1E3F82]/40'
            }`}
          >
            {selected && <CheckCircleFill className="absolute top-4 right-4 w-5 h-5 text-[#1E3F82]" />}
            <span className="w-11 h-11 rounded-xl bg-[#E8F0FB] text-[#1E3F82] flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </span>
            <div className="mt-3 text-base font-bold text-stone-900">{config.audience}</div>
            <div className="text-xs font-semibold text-[#1E3F82] mt-0.5">{config.moduleLabel}</div>
            <p className="text-sm text-stone-500 mt-2 leading-relaxed">{description}</p>
          </button>
        );
      })}
    </div>
  );
}

/** Màn hình chọn chuyên ngành lần đầu đăng nhập. */
export function TrackPicker({ onConfirm }: { onConfirm: (track: Track) => Promise<unknown> }) {
  const [selected, setSelected] = useState<Track | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await onConfirm(selected);
    } catch {
      setError('Không lưu được lựa chọn, bạn thử lại nhé.');
      setSaving(false);
    }
  };

  return (
    <section className="max-w-3xl mx-auto w-full bg-white rounded-3xl border border-stone-200/90 p-6 md:p-8 shadow-[0_8px_32px_rgba(36,51,85,0.06)]">
      <h1 className="text-2xl font-extrabold text-stone-900">Bạn đang học chuyên ngành nào?</h1>
      <p className="text-sm text-stone-500 mt-1.5">
        SYNAPSE LAB sẽ hiển thị nội dung phù hợp với chuyên ngành của bạn. Bạn có thể đổi lại trong trang hồ sơ.
      </p>

      <div className="mt-6">
        <TrackOptions value={selected} onChange={setSelected} disabled={saving} />
      </div>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selected || saving}
        className="mt-6 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {saving ? 'Đang lưu...' : 'Bắt đầu học'}
      </button>
    </section>
  );
}

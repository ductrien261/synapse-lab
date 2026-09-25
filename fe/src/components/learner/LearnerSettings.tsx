'use client';

import { useEffect, useState } from 'react';
import { Trash } from 'react-bootstrap-icons';
import { learnerApi, type LearnerPreferences } from '@/lib/learner';

/** Cài đặt "Cách AI dạy bạn": trình độ, cách giải thích, mục tiêu (lưu ngay khi chọn). */
export function AiPreferencesCard() {
  const [prefs, setPrefs] = useState<LearnerPreferences | null>(null);
  const [choices, setChoices] = useState<{ level: [string, string][]; style: [string, string][] } | null>(null);
  const [goals, setGoals] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    learnerApi
      .profile()
      .then((d) => {
        if (cancelled) return;
        setPrefs(d.preferences);
        setChoices(d.choices);
        setGoals(d.preferences.goals);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (patch: Partial<LearnerPreferences>) => {
    setMessage('');
    try {
      const next = await learnerApi.updatePreferences(patch);
      setPrefs(next);
      setMessage('Đã lưu. Gia sư AI dùng cài đặt này từ câu hỏi tiếp theo.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không lưu được');
    }
  };

  if (!prefs || !choices) return <div className="h-56 rounded-3xl bg-stone-200/60 animate-pulse" />;

  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold text-stone-900">Cách AI dạy bạn</h2>
        <p className="text-sm text-stone-500 mt-1">Gia sư và phần ôn tập dựa vào đây để chọn độ sâu và cách giải thích.</p>
      </div>
      <ChoiceRow label="Trình độ" value={prefs.level} choices={choices.level} onChange={(level) => void save({ level })} />
      <ChoiceRow label="Cách giải thích" value={prefs.style} choices={choices.style} onChange={(style) => void save({ style })} />
      <label className="block">
        <span className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">Mục tiêu (không bắt buộc)</span>
        <div className="flex gap-2">
          <input
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            maxLength={300}
            placeholder="Ví dụ: ôn thi giữa kỳ giải phẫu tim mạch"
            className="flex-1 max-w-md px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82]"
          />
          <button
            type="button"
            disabled={goals === prefs.goals}
            onClick={() => void save({ goals })}
            className="px-4 py-2.5 rounded-xl bg-[#1E3F82] text-white text-sm font-bold disabled:opacity-40 cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </label>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </section>
  );
}

/** Xóa dữ liệu học tập (mức nắm vững, hiểu nhầm, lịch sử ôn tập). */
export function ResetLearningCard() {
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 p-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-stone-900">Xóa dữ liệu học tập</h2>
        <p className="text-sm text-stone-500 mt-1">
          {done ? 'Đã xóa. Hồ sơ học tập bắt đầu lại từ đầu.' : 'Xóa mức nắm vững, những chỗ hay nhầm và lịch sử ôn tập. Không ảnh hưởng tài khoản và ghi chú.'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          if (!confirm) return setConfirm(true);
          learnerApi
            .reset()
            .then(() => {
              setConfirm(false);
              setDone(true);
            })
            .catch(() => undefined);
        }}
        onBlur={() => setConfirm(false)}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${
          confirm ? 'bg-rose-600 text-white' : 'border border-stone-200 text-stone-600 hover:text-rose-600'
        }`}
      >
        <Trash className="w-4 h-4" /> {confirm ? 'Bấm lần nữa để xóa' : 'Xóa dữ liệu'}
      </button>
    </section>
  );
}

function ChoiceRow({ label, value, choices, onChange }: { label: string; value: string; choices: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">{label}</span>
      <div className="flex flex-wrap gap-2">
        {choices.map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => key !== value && onChange(key)}
            className={`px-3.5 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${
              key === value ? 'border-[#1E3F82] bg-[#E8F0FB] text-[#1E3F82]' : 'border-stone-200 text-stone-600 hover:border-[#1E3F82]/40'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { Trash } from 'react-bootstrap-icons';
import { Segmented, SettingsRow, SettingsSection } from '@/components/settings/Section';
import { learnerApi, type LearnerPreferences } from '@/lib/learner';

type Choices = { level: [string, string][]; style: [string, string][] };

/** Nhóm "Học cùng AI": trình độ, cách giải thích, mục tiêu — lưu ngay khi đổi. */
export function AiPreferencesSection({ onSaved }: { onSaved: (text: string) => void }) {
  const [prefs, setPrefs] = useState<LearnerPreferences | null>(null);
  const [choices, setChoices] = useState<Choices | null>(null);
  const [goals, setGoals] = useState('');

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
    try {
      setPrefs(await learnerApi.updatePreferences(patch));
      onSaved('Đã lưu. Gia sư AI dùng cài đặt mới từ câu hỏi tiếp theo.');
    } catch (err) {
      onSaved(err instanceof Error ? err.message : 'Không lưu được');
    }
  };

  const opts = (list: [string, string][]) => list.map(([value, label]) => ({ value, label }));

  return (
    <SettingsSection title="Học cùng AI" description="Gia sư và phần ôn tập dựa vào đây để chọn độ sâu và cách giải thích.">
      {!prefs || !choices ? (
        <div className="px-6 py-4">
          <div className="h-24 rounded-xl bg-stone-100 animate-pulse" />
        </div>
      ) : (
        <>
          <SettingsRow label="Trình độ">
            <Segmented value={prefs.level} options={opts(choices.level)} onChange={(level) => void save({ level })} />
          </SettingsRow>
          <SettingsRow label="Cách giải thích">
            <Segmented value={prefs.style} options={opts(choices.style)} onChange={(style) => void save({ style })} />
          </SettingsRow>
          <SettingsRow label="Mục tiêu" hint="Không bắt buộc">
            <div className="flex gap-2">
              <input
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                maxLength={300}
                placeholder="Ví dụ: ôn thi giữa kỳ giải phẫu tim mạch"
                className="flex-1 min-w-0 px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82]"
              />
              <button
                type="button"
                disabled={goals === prefs.goals}
                onClick={() => void save({ goals })}
                className="px-4 py-2 rounded-xl bg-[#1E3F82] text-white text-sm font-bold disabled:opacity-40 cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </SettingsRow>
        </>
      )}
    </SettingsSection>
  );
}

/** Nút xóa dữ liệu học tập (bấm 2 lần). */
export function ResetLearningButton({ onDone }: { onDone: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm) return setConfirm(true);
        learnerApi
          .reset()
          .then(() => {
            setConfirm(false);
            onDone();
          })
          .catch(() => undefined);
      }}
      onBlur={() => setConfirm(false)}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${
        confirm ? 'bg-rose-600 text-white' : 'border border-rose-200 text-rose-600 hover:bg-rose-50'
      }`}
    >
      <Trash className="w-4 h-4" /> {confirm ? 'Bấm lần nữa để xóa' : 'Xóa dữ liệu học tập'}
    </button>
  );
}

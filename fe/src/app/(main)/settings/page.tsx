'use client';

import { useState } from 'react';
import { CheckCircleFill, CpuFill, HeartPulseFill } from 'react-bootstrap-icons';
import { TokenQuotaCard } from '@/components/ai/TokenQuotaCard';
import { AiPreferencesSection, ResetLearningButton } from '@/components/learner/LearnerSettings';
import { SettingsRow, SettingsSection } from '@/components/settings/Section';
import { TRACKS, type Track } from '@/lib/tracks';
import { useUser, type CurrentUser, type ProfileUpdate } from '@/lib/user-context';

/**
 * Cài đặt — thứ tự: Tài khoản → Chuyên ngành → Học cùng AI → Token AI → Dữ liệu học tập.
 * Mọi thay đổi lưu ngay (không có nút "Lưu" chung cuối trang).
 */
export default function SettingsPage() {
  const { user, updateMe } = useUser();
  const [toast, setToast] = useState('');

  if (!user) return <div className="w-full max-w-3xl mx-auto h-80 rounded-3xl bg-stone-200/60 animate-pulse" />;

  const isAdmin = user.role === 'admin';
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? '' : t)), 3000);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-5 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Cài đặt</h1>
        <p className="text-sm text-stone-500 mt-1">Thay đổi được lưu ngay.</p>
      </div>

      <AccountSection key={user.id} user={user} onSave={updateMe} onSaved={notify} />
      {!isAdmin && <TrackSection user={user} onSave={updateMe} onSaved={notify} />}
      {!isAdmin && <AiPreferencesSection onSaved={notify} />}

      <SettingsSection title="Token AI" description="Mỗi lần hỏi gia sư, dịch hay ôn tập sẽ trừ token.">
        <div className="px-6 py-4">
          <TokenQuotaCard bare />
        </div>
      </SettingsSection>

      {!isAdmin && (
        <SettingsSection title="Dữ liệu học tập" tone="danger">
          <div className="px-6 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-stone-500 max-w-md">
              Xóa mức nắm vững, những chỗ hay nhầm và lịch sử ôn tập. Tài khoản và ghi chú vẫn giữ nguyên.
            </p>
            <div className="shrink-0">
              <ResetLearningButton onDone={() => notify('Đã xóa dữ liệu học tập.')} />
            </div>
          </div>
        </SettingsSection>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 rounded-xl bg-stone-900 text-white text-sm px-4 py-2.5 shadow-lg">
          <CheckCircleFill className="w-4 h-4 text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}

function AccountSection({ user, onSave, onSaved }: {
  user: CurrentUser;
  onSave: (data: ProfileUpdate) => Promise<CurrentUser>;
  onSaved: (text: string) => void;
}) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== user.name && name.trim().length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name: name.trim() });
      onSaved('Đã lưu họ tên.');
    } catch {
      onSaved('Không lưu được, bạn thử lại nhé.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Tài khoản">
      <SettingsRow label="Họ và tên">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty) void save();
          }}
          className="flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            placeholder="Nguyễn Văn A"
            className="flex-1 min-w-0 px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82]"
          />
          <button
            type="submit"
            disabled={!dirty || saving}
            className="px-4 py-2 rounded-xl bg-[#1E3F82] text-white text-sm font-bold disabled:opacity-40 cursor-pointer"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </form>
      </SettingsRow>
      <SettingsRow label="Email" hint="Dùng để đăng nhập, không đổi được">
        <span className="text-sm text-stone-700">{user.email}</span>
      </SettingsRow>
    </SettingsSection>
  );
}

const TRACK_ICON = { cs: CpuFill, med: HeartPulseFill } as const;

function TrackSection({ user, onSave, onSaved }: {
  user: CurrentUser;
  onSave: (data: ProfileUpdate) => Promise<CurrentUser>;
  onSaved: (text: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  const choose = async (track: Track) => {
    if (track === user.track) return;
    setSaving(true);
    try {
      await onSave({ track });
      onSaved(`Đã chuyển sang ${TRACKS[track].label}.`);
    } catch {
      onSaved('Không đổi được chuyên ngành.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection title="Chuyên ngành" description="Quyết định nội dung ở trang Tổng quan và menu bên trái.">
      <div className="px-6 py-4 grid gap-3 sm:grid-cols-2" role="radiogroup">
        {(Object.keys(TRACKS) as Track[]).map((key) => {
          const Icon = TRACK_ICON[key];
          const selected = user.track === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={saving}
              onClick={() => void choose(key)}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-colors cursor-pointer disabled:opacity-60 ${
                selected ? 'border-[#1E3F82] bg-[#F4F7FC]' : 'border-stone-200 hover:border-[#1E3F82]/40'
              }`}
            >
              <span className="w-10 h-10 rounded-xl bg-[#E8F0FB] text-[#1E3F82] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-stone-900">{TRACKS[key].audience}</span>
                <span className="block text-xs text-stone-500">{TRACKS[key].moduleLabel}</span>
              </span>
              {selected && <CheckCircleFill className="w-5 h-5 text-[#1E3F82] shrink-0" />}
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { useUser, type CurrentUser, type ProfileUpdate } from '@/lib/user-context';
import type { Track } from '@/lib/tracks';
import { TrackOptions } from '@/components/dashboard/TrackPicker';
import { TokenQuotaCard } from '@/components/ai/TokenQuotaCard';
import { AiPreferencesCard, ResetLearningCard } from '@/components/learner/LearnerSettings';

export default function SettingsPage() {
  const { user, updateMe } = useUser();

  if (!user) {
    return <div className="h-80 rounded-3xl bg-stone-200/60 animate-pulse" />;
  }

  // key = id để form lấy lại giá trị ban đầu khi đổi tài khoản
  return (
    <div className="flex flex-col gap-6 pb-12 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Cài đặt</h1>
        <p className="text-sm text-stone-500 mt-1">Tài khoản, chuyên ngành, cách AI dạy bạn và hạn mức token.</p>
      </div>
      <AccountForm key={user.id} user={user} onSave={updateMe} />
      {user.role !== 'admin' && <AiPreferencesCard />}
      <TokenQuotaCard />
      {user.role !== 'admin' && <ResetLearningCard />}
    </div>
  );
}

function AccountForm({
  user,
  onSave,
}: {
  user: CurrentUser;
  onSave: (data: ProfileUpdate) => Promise<CurrentUser>;
}) {
  const [name, setName] = useState(user.name);
  const [track, setTrack] = useState<Track | null>(user.track);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const dirty = name.trim() !== user.name || track !== user.track;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await onSave({ name: name.trim(), ...(track ? { track } : {}) });
      setMessage({ type: 'ok', text: 'Đã lưu thay đổi.' });
    } catch {
      setMessage({ type: 'error', text: 'Không lưu được, bạn thử lại nhé.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Họ tên */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6">
        <h2 className="text-base font-bold text-stone-900">Tài khoản</h2>
        <p className="text-sm text-stone-500 mt-1">{user.email}</p>
        <label className="block mt-4">
          <span className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">Họ và tên</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            placeholder="Nguyễn Văn A"
            className="w-full max-w-md px-4 py-3 rounded-xl border border-stone-200 text-sm font-medium focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10 transition-all"
          />
        </label>
      </section>

      {/* Chuyên ngành (admin không cần) */}
      {user.role !== 'admin' && (
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6">
        <h2 className="text-base font-bold text-stone-900">Chuyên ngành</h2>
        <p className="text-sm text-stone-500 mt-1 mb-4">Quyết định nội dung hiển thị ở trang Tổng quan và thứ tự menu.</p>
        <TrackOptions value={track} onChange={setTrack} disabled={saving} />
      </section>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={!dirty || saving}
          className="px-6 py-3 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
        {message && (
          <span className={`text-sm font-medium ${message.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}

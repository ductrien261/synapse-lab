'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GearFill, Stars } from 'react-bootstrap-icons';
import { hasLearningData, LearningEmpty, LearningOverview } from '@/components/learner/LearningOverview';
import { getInitials } from '@/lib/format';
import { learnerApi, type LearnerProfileData } from '@/lib/learner';
import { TRACKS } from '@/lib/tracks';
import { useUser, type CurrentUser } from '@/lib/user-context';

/** Hồ sơ: bạn là ai + hồ sơ học tập (những gì AI ghi nhớ để đồng hành cùng bạn). */
export default function ProfilePage() {
  const { user } = useUser();
  if (!user) return <div className="w-full max-w-5xl mx-auto h-80 rounded-3xl bg-stone-200/60 animate-pulse" />;
  return <Profile key={user.id} user={user} />;
}

function Profile({ user }: { user: CurrentUser }) {
  const isAdmin = user.role === 'admin';
  const [data, setData] = useState<LearnerProfileData | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    learnerApi
      .profile()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được hồ sơ học tập');
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, reload]);

  const label = (list: [string, string][], key: string) => list.find(([k]) => k === key)?.[1] ?? key;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 pb-12">
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 flex flex-wrap items-center gap-4">
        <span className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1E3F82] to-[#5B8FD8] flex items-center justify-center text-white font-bold text-lg shrink-0">
          {getInitials(user.name || user.email)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-stone-900 truncate">{user.name || user.email}</h1>
          <p className="text-sm text-stone-500 truncate">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isAdmin ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-[#E8F0FB] text-[#1E3F82]'
              }`}
            >
              {isAdmin ? 'Quản trị viên' : user.track ? TRACKS[user.track].audience : 'Chưa chọn chuyên ngành'}
            </span>
            {data && (
              <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
                <Stars className="w-3 h-3 text-violet-500" />
                AI dạy theo: {label(data.choices.level, data.preferences.level)} · {label(data.choices.style, data.preferences.style)}
              </span>
            )}
          </div>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82]"
        >
          <GearFill className="w-3.5 h-3.5" /> Cài đặt
        </Link>
      </section>

      {!isAdmin &&
        (error ? (
          <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3">{error}</div>
        ) : !data ? (
          <div className="h-64 rounded-3xl bg-stone-200/60 animate-pulse" />
        ) : hasLearningData(data) ? (
          <LearningOverview data={data} onChanged={() => setReload((n) => n + 1)} />
        ) : (
          <LearningEmpty />
        ))}
    </div>
  );
}

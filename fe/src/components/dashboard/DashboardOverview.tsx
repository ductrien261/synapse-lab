'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { useRecent } from '@/lib/recent';
import { getGreetingName } from '@/lib/format';
import { WelcomeHero } from './WelcomeHero';
import { StatsRow } from './StatsRow';
import { NextUp } from './NextUp';
import { RecentList } from './RecentList';
import { ExploreAlgorithms } from './ExploreAlgorithms';
import { ExploreAnatomy } from './ExploreAnatomy';
import { TrackPicker } from './TrackPicker';
import { AiTutorCard, ClassesCard } from './SideCards';

export function DashboardOverview() {
  const router = useRouter();
  const { user, loading, refresh, updateMe } = useUser();
  const recent = useRecent(user?.track ?? null);
  const isAdmin = user?.role === 'admin';

  // Admin không học -> trang chủ của admin là trang quản trị
  useEffect(() => {
    if (isAdmin) router.replace('/admin');
  }, [isAdmin, router]);

  if (isAdmin) return <DashboardSkeleton />;

  if (loading && !user) return <DashboardSkeleton />;

  if (!user) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200/90 p-8 text-center">
        <p className="text-sm text-stone-600">Không tải được thông tin tài khoản. Kiểm tra backend đang chạy chưa.</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-4 px-4 py-2 rounded-xl bg-[#1E3F82] text-white text-sm font-bold cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // Lần đầu đăng nhập: hỏi chuyên ngành trước (đổi lại trong trang Hồ sơ)
  if (!user.track) {
    return <TrackPicker onConfirm={(track) => updateMe({ track })} />;
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <WelcomeHero
        greetingName={getGreetingName(user.name, user.email)}
        track={user.track}
        lastItem={recent[0] ?? null}
      />

      <StatsRow track={user.track} recent={recent} />

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <NextUp track={user.track} recent={recent} />
          <RecentList items={recent} track={user.track} />
          {user.track === 'cs' ? <ExploreAlgorithms /> : <ExploreAnatomy />}
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <ClassesCard />
          <AiTutorCard track={user.track} />
        </aside>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-64 rounded-3xl bg-stone-200/60 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-3xl bg-stone-200/60 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-56 rounded-3xl bg-stone-200/60 animate-pulse" />
        <div className="h-56 rounded-3xl bg-stone-200/60 animate-pulse" />
      </div>
    </div>
  );
}

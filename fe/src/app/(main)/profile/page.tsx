'use client';

import Link from 'next/link';
import { GearFill } from 'react-bootstrap-icons';
import { LearningOverview } from '@/components/learner/LearningOverview';
import { getInitials } from '@/lib/format';
import { TRACKS } from '@/lib/tracks';
import { useUser } from '@/lib/user-context';

/** Hồ sơ: bạn là ai + hồ sơ học tập (những gì AI ghi nhớ để đồng hành cùng bạn). */
export default function ProfilePage() {
  const { user } = useUser();

  if (!user) return <div className="h-80 rounded-3xl bg-stone-200/60 animate-pulse" />;

  const isAdmin = user.role === 'admin';

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-4xl">
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 flex flex-wrap items-center gap-4">
        <span className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1E3F82] to-[#5B8FD8] flex items-center justify-center text-white font-bold text-lg">
          {getInitials(user.name || user.email)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-stone-900 truncate">{user.name || user.email}</h1>
          <p className="text-sm text-stone-500 truncate">{user.email}</p>
          <span
            className={`mt-1.5 inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isAdmin ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-[#E8F0FB] text-[#1E3F82]'
            }`}
          >
            {isAdmin ? 'Quản trị viên' : user.track ? TRACKS[user.track].audience : 'Chưa chọn chuyên ngành'}
          </span>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82]"
        >
          <GearFill className="w-3.5 h-3.5" /> Cài đặt
        </Link>
      </section>

      {isAdmin ? (
        <p className="text-sm text-stone-500">Tài khoản quản trị không có hồ sơ học tập.</p>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">Hồ sơ học tập</h2>
            <p className="text-sm text-stone-500 mt-1">
              Những gì AI ghi nhớ để đồng hành cùng bạn: tiến độ, chỗ hay nhầm, mức nắm vững. Bạn xem, sửa, xóa được bất cứ lúc nào.
            </p>
          </div>
          <LearningOverview />
        </>
      )}
    </div>
  );
}

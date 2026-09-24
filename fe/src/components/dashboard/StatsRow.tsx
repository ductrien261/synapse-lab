'use client';

import { CompassFill, DashLg, Fire, PlusLg, TrophyFill } from 'react-bootstrap-icons';
import type { ReactNode } from 'react';
import { setWeeklyGoal, useActivity, useWeeklyGoal, type RecentItem } from '@/lib/recent';
import { countAlgorithms, useAlgoCatalog } from '@/lib/algo-catalog';
import { useAnatomyModels } from '@/lib/anatomy-catalog';
import { TRACKS, type Track } from '@/lib/tracks';

interface Props {
  track: Track;
  recent: RecentItem[];
}

export function StatsRow({ track, recent }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StreakTile />
      <ExploredTile track={track} recent={recent} />
      <WeeklyGoalTile />
    </div>
  );
}

function Tile({
  icon,
  iconClass,
  label,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconClass}`}>{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span>
      </div>
      {children}
    </section>
  );
}

/* ---------- Chuỗi ngày học ---------- */
function StreakTile() {
  const { streak, learnedToday, last7 } = useActivity();
  return (
    <Tile icon={<Fire className="w-4 h-4" />} iconClass="bg-orange-50 text-orange-500" label="Chuỗi ngày học">
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold text-stone-900 tabular-nums">{streak}</span>
          <span className="text-sm text-stone-500">ngày liên tiếp</span>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          {learnedToday
            ? 'Hôm nay bạn đã học rồi, giữ vững nhé!'
            : streak > 0
              ? 'Học một bài hôm nay để không mất chuỗi.'
              : 'Mở một bài học để bắt đầu chuỗi mới.'}
        </p>
      </div>
      <div className="flex justify-between gap-1.5">
        {last7.map((d) => (
          <div key={d.key} className="flex flex-col items-center gap-1.5 flex-1">
            <span
              className={`w-full h-7 rounded-lg ${
                d.active ? 'bg-gradient-to-t from-orange-500 to-amber-400' : 'bg-stone-100'
              } ${d.isToday ? 'ring-2 ring-offset-1 ring-[#1E3F82]/30' : ''}`}
            />
            <span className={`text-[10.5px] font-semibold ${d.isToday ? 'text-[#1E3F82]' : 'text-stone-400'}`}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </Tile>
  );
}

/* ---------- Đã khám phá ---------- */
function ExploredTile({ track, recent }: Props) {
  const { categories, state } = useAlgoCatalog();
  const { models, state: modelsState } = useAnatomyModels();
  const explored = recent.length; // mỗi bài học chỉ lưu 1 lần
  const total = track === 'cs' ? countAlgorithms(categories) : models.length;
  const ready = track === 'cs' ? state === 'ready' : modelsState === 'ready';
  const percent = ready && total > 0 ? Math.min(100, Math.round((explored / total) * 100)) : 0;
  const unit = track === 'cs' ? 'thuật toán' : 'mô hình';

  return (
    <Tile icon={<CompassFill className="w-4 h-4" />} iconClass="bg-[#E8F0FB] text-[#1E3F82]" label="Đã khám phá">
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold text-stone-900 tabular-nums">{explored}</span>
          <span className="text-sm text-stone-500">
            / {ready ? total : '…'} {unit}
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-1">Trong kho {TRACKS[track].moduleLabel.toLowerCase()}</p>
      </div>
      <div>
        <div className="flex justify-between text-[11px] font-semibold text-stone-500 mb-1.5">
          <span>Tiến độ</span>
          <span className="text-[#1E3F82]">{percent}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1E3F82] to-[#5B8FD8] transition-[width] duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </Tile>
  );
}

/* ---------- Mục tiêu tuần ---------- */
function WeeklyGoalTile() {
  const goal = useWeeklyGoal();
  const { daysThisWeek } = useActivity();
  const done = Math.min(daysThisWeek, goal);
  const reached = daysThisWeek >= goal;

  // Vòng tròn tiến độ
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - done / goal);

  return (
    <Tile
      icon={<TrophyFill className="w-4 h-4" />}
      iconClass={reached ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'}
      label="Mục tiêu tuần"
    >
      <div className="flex items-center gap-4">
        <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={r} fill="none" stroke="#F1F1EF" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={reached ? '#059669' : '#1E3F82'}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-stone-900 tabular-nums">{daysThisWeek}</span>
            <span className="text-sm text-stone-500">/ {goal} ngày</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {reached ? 'Đã đạt mục tiêu tuần này 🎉' : `Còn ${goal - daysThisWeek} ngày nữa để đạt mục tiêu.`}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
        <span className="text-xs font-semibold text-stone-600">Số ngày học mỗi tuần</span>
        <div className="flex items-center gap-2">
          <GoalButton label="Giảm mục tiêu" disabled={goal <= 1} onClick={() => setWeeklyGoal(goal - 1)}>
            <DashLg className="w-3 h-3" />
          </GoalButton>
          <span className="w-4 text-center text-sm font-bold text-stone-800 tabular-nums">{goal}</span>
          <GoalButton label="Tăng mục tiêu" disabled={goal >= 7} onClick={() => setWeeklyGoal(goal + 1)}>
            <PlusLg className="w-3 h-3" />
          </GoalButton>
        </div>
      </div>
    </Tile>
  );
}

function GoalButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-600 hover:border-[#1E3F82]/40 hover:text-[#1E3F82] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
    >
      {children}
    </button>
  );
}

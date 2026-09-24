// ============================================================
// SYNAPSE-LAB — Hoạt động học của người dùng (lưu trên server)
// - Lịch sử đã xem (Tiếp tục học, Gần đây, Đã khám phá)
// - Chuỗi ngày học, 7 ngày gần nhất, mục tiêu tuần
// Dữ liệu lấy từ /api/learning/, tải 1 lần rồi dùng chung cho mọi
// component; ghi nhận bài mới xong thì tự tải lại.
// ============================================================

import { useMemo, useSyncExternalStore } from 'react';
import { authApi, learningApi, type LearningActivityDto, type LearningSummaryDto } from './api';
import type { Track } from './tracks';

export interface RecentItem {
  track: Track;
  href: string;
  title: string;
  subtitle: string;
  /** Nhóm của bài (key nhóm thuật toán / slug hệ cơ quan) — dùng để gợi ý bài tiếp theo */
  group?: string;
  visitedAt: number;
}

export interface ActivitySummary {
  streak: number;
  learnedToday: boolean;
  last7: { key: string; label: string; active: boolean; isToday: boolean }[];
  daysThisWeek: number;
}

export const DEFAULT_WEEKLY_GOAL = 4;

// ---------------- Store dùng chung ----------------

interface LearningState {
  loaded: boolean;
  recent: RecentItem[];
  summary: LearningSummaryDto | null;
}

const EMPTY: LearningState = { loaded: false, recent: [], summary: null };
let state: LearningState = EMPTY;
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function toRecent(a: LearningActivityDto): RecentItem {
  return {
    track: a.track,
    href: a.href,
    title: a.title,
    subtitle: a.subtitle,
    group: a.group || undefined,
    visitedAt: Date.parse(a.last_visited_at),
  };
}

export function refreshLearning(): Promise<void> {
  if (!inflight) {
    inflight = Promise.all([learningApi.activities(), learningApi.summary()])
      .then(([activities, summary]) => {
        state = { loaded: true, recent: activities.map(toRecent), summary };
        emit();
      })
      .catch(() => {
        // Lỗi mạng: giữ dữ liệu cũ, lần sau thử lại
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Gọi khi đăng xuất để không lộ dữ liệu sang tài khoản khác. */
export function resetLearning() {
  state = EMPTY;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!state.loaded) void refreshLearning();
  return () => {
    listeners.delete(listener);
  };
}

function useLearningState(): LearningState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

// ---------------- Ghi ----------------

/** Ghi nhận vừa mở một bài học. */
export function addRecent(item: Omit<RecentItem, 'visitedAt'>): void {
  const isAlgorithm = item.track === 'cs';
  const objectKey = isAlgorithm
    ? item.href.replace(/^\/algorithms\//, '')
    : item.href.replace(/^\/anatomy\/models\//, '');

  learningApi
    .record({
      track: item.track,
      kind: isAlgorithm ? 'algorithm' : 'anatomy_model',
      object_key: objectKey,
      href: item.href,
      title: item.title,
      subtitle: item.subtitle,
      group: item.group ?? '',
    })
    .then(() => refreshLearning())
    .catch(() => {
      // Không ghi được lịch sử thì cũng không chặn việc học
    });
}

export function setWeeklyGoal(goal: number): void {
  const value = Math.min(7, Math.max(1, Math.round(goal)));
  if (state.summary) {
    state = { ...state, summary: { ...state.summary, weekly_goal: value } };
    emit();
  }
  authApi
    .updateMe({ weekly_goal: value })
    .catch(() => undefined)
    .finally(() => void refreshLearning());
}

// ---------------- Đọc ----------------

/** Lịch sử đã xem của một chuyên ngành, mới nhất trước. */
export function useRecent(track: Track | null): RecentItem[] {
  const { recent } = useLearningState();
  return useMemo(() => (track ? recent.filter((i) => i.track === track) : []), [recent, track]);
}

export function useActivity(): ActivitySummary {
  const { summary } = useLearningState();
  return useMemo(
    () => ({
      streak: summary?.streak ?? 0,
      learnedToday: summary?.learned_today ?? false,
      last7: (summary?.last7 ?? []).map((d) => ({ key: d.date, label: d.label, active: d.active, isToday: d.is_today })),
      daysThisWeek: summary?.days_this_week ?? 0,
    }),
    [summary],
  );
}

export function useWeeklyGoal(): number {
  return useLearningState().summary?.weekly_goal ?? DEFAULT_WEEKLY_GOAL;
}

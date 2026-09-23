// ============================================================
// SYNAPSE-LAB — Hoạt động học của người dùng
// - Lịch sử đã xem (mục Tiếp tục học, Gần đây, Đã khám phá)
// - Ngày có học (chuỗi ngày học, biểu đồ 7 ngày)
// - Mục tiêu số ngày học mỗi tuần
// Tạm lưu ở localStorage. Khi có bảng tiến độ ở backend thì chỉ
// cần thay phần đọc/ghi trong file này, giao diện giữ nguyên.
// ============================================================

import { useMemo } from 'react';
import type { Track } from './tracks';
import { readStorage, useStorageValue, writeStorage } from './storage';

export interface RecentItem {
  track: Track;
  href: string;
  title: string;
  subtitle: string;
  /** Nhóm của mục (key nhóm thuật toán / hệ cơ quan) — dùng để gợi ý bài tiếp theo */
  group?: string;
  visitedAt: number;
}

const RECENT_KEY = 'synapse_recent';
const ACTIVITY_KEY = 'synapse_activity';
const GOAL_KEY = 'synapse_weekly_goal';
const MAX_ITEMS = 200;
const MAX_DAYS = 120;
export const DEFAULT_WEEKLY_GOAL = 4;

function parseList<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

/** Ngày theo giờ máy người dùng, dạng YYYY-MM-DD */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

// ---------------- Ghi ----------------

export function addRecent(item: Omit<RecentItem, 'visitedAt'>): void {
  const list = parseList<RecentItem>(readStorage(RECENT_KEY)).filter((i) => i.href !== item.href);
  list.unshift({ ...item, visitedAt: Date.now() });
  writeStorage(RECENT_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));

  const today = dayKey(new Date());
  const days = parseList<string>(readStorage(ACTIVITY_KEY));
  if (!days.includes(today)) {
    days.push(today);
    writeStorage(ACTIVITY_KEY, JSON.stringify(days.slice(-MAX_DAYS)));
  }
}

export function setWeeklyGoal(goal: number): void {
  writeStorage(GOAL_KEY, String(Math.min(7, Math.max(1, Math.round(goal)))));
}

// ---------------- Đọc ----------------

/** Lịch sử đã xem của một chuyên ngành, mới nhất trước. */
export function useRecent(track: Track | null): RecentItem[] {
  const raw = useStorageValue(RECENT_KEY);
  return useMemo(
    () => (track ? parseList<RecentItem>(raw).filter((i) => i.track === track) : []),
    [raw, track],
  );
}

export interface ActivitySummary {
  /** Số ngày học liên tiếp tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa học) */
  streak: number;
  learnedToday: boolean;
  /** 7 ngày gần nhất, cũ nhất trước */
  last7: { key: string; label: string; active: boolean; isToday: boolean }[];
  /** Số ngày có học trong tuần hiện tại (thứ 2 -> chủ nhật) */
  daysThisWeek: number;
}

const WEEKDAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function useActivity(): ActivitySummary {
  const raw = useStorageValue(ACTIVITY_KEY);
  return useMemo(() => {
    const days = new Set(parseList<string>(raw));
    const now = new Date();
    const todayKey = dayKey(now);
    const learnedToday = days.has(todayKey);

    let streak = 0;
    let cursor = learnedToday ? now : addDays(now, -1);
    while (days.has(dayKey(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(now, i - 6);
      const key = dayKey(date);
      return { key, label: WEEKDAY_VI[date.getDay()], active: days.has(key), isToday: key === todayKey };
    });

    const mondayOffset = (now.getDay() + 6) % 7; // số ngày kể từ thứ 2
    let daysThisWeek = 0;
    for (let i = 0; i <= mondayOffset; i++) {
      if (days.has(dayKey(addDays(now, -i)))) daysThisWeek += 1;
    }

    return { streak, learnedToday, last7, daysThisWeek };
  }, [raw]);
}

export function useWeeklyGoal(): number {
  const raw = useStorageValue(GOAL_KEY);
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= 7 ? value : DEFAULT_WEEKLY_GOAL;
}

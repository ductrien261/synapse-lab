'use client';

import { useEffect, useState } from 'react';

/**
 * Số đếm tăng dần khi cần tải lại dữ liệu "gần thời gian thực":
 * - khi quay lại tab / cửa sổ (focus, visibilitychange)
 * - mỗi `intervalMs` khi tab đang hiện
 * Dùng làm dependency của useEffect để tải lại ngầm.
 */
export function useLiveTick(intervalMs = 15000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => {
      if (document.visibilityState === 'visible') setTick((n) => n + 1);
    };
    const timer = window.setInterval(bump, intervalMs);
    window.addEventListener('focus', bump);
    document.addEventListener('visibilitychange', bump);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', bump);
      document.removeEventListener('visibilitychange', bump);
    };
  }, [intervalMs]);

  return tick;
}

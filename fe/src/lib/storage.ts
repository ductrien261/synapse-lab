// ============================================================
// SYNAPSE-LAB — Đọc/ghi localStorage an toàn cho React
// Dùng useSyncExternalStore để không bị lệch giữa server/client
// và tự cập nhật mọi component khi giá trị thay đổi.
// ============================================================

import { useSyncExternalStore } from 'react';

const CHANGE_EVENT = 'synapse-storage-change';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Trình duyệt chặn storage (chế độ ẩn danh...) -> bỏ qua
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Giá trị hiện tại của một key trong localStorage (null khi render phía server). */
export function useStorageValue(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readStorage(key),
    () => null,
  );
}

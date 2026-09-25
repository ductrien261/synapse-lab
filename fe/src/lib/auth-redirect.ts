/** Trang vào sau khi đăng nhập/đăng ký: ?next=/duong-dan (chỉ đường dẫn nội bộ), mặc định bảng điều khiển. */
export const APP_HOME = '/dashboard';

export function nextPath(): string {
  if (typeof window === 'undefined') return APP_HOME;
  const next = new URLSearchParams(window.location.search).get('next') ?? '';
  return next.startsWith('/') && !next.startsWith('//') ? next : APP_HOME;
}

/** Link tới trang đăng nhập/đăng ký, quay lại đúng trang đang xem. */
export function authHref(kind: 'login' | 'register', back?: string): string {
  return back ? `/${kind}?next=${encodeURIComponent(back)}` : `/${kind}`;
}

/** Trang khách xem thử được (không cần đăng nhập). */
const GUEST_PATHS = ['/anatomy', '/algorithms'];

export function isGuestPath(path: string): boolean {
  return GUEST_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

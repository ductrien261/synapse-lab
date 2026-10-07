// ============================================================
// Đo lường sản phẩm (PostHog) — chỉ bật khi có NEXT_PUBLIC_POSTHOG_KEY
// và người dùng đồng ý. Không gửi email/tên, chỉ mã tài khoản.
// ============================================================

type Props = Record<string, string | number | boolean | null | undefined>;

interface PostHogLike {
  capture?: (event: string, props?: Props) => void;
  identify?: (id: string, props?: Props) => void;
  reset?: () => void;
  opt_in_capturing?: () => void;
  opt_out_capturing?: () => void;
}

declare global {
  interface Window {
    posthog?: PostHogLike;
  }
}

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
export const CONSENT_KEY = 'synapse_analytics_consent';
export type Consent = 'granted' | 'denied' | null;

export function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: 'granted' | 'denied') {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // trình duyệt chặn lưu trữ: chỉ áp dụng cho phiên hiện tại
  }
  if (value === 'granted') window.posthog?.opt_in_capturing?.();
  else window.posthog?.opt_out_capturing?.();
  window.dispatchEvent(new Event('synapse-consent'));
}

/** Ghi một sự kiện (bỏ qua nếu chưa bật đo lường hoặc chưa đồng ý). */
export function track(event: string, props?: Props) {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;
  window.posthog?.capture?.(event, props);
}

export function identifyUser(id: string, props?: Props) {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;
  window.posthog?.identify?.(id, props);
}

export function resetAnalytics() {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;
  window.posthog?.reset?.();
}

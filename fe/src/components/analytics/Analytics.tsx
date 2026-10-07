'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useSyncExternalStore } from 'react';
import { CONSENT_KEY, POSTHOG_HOST, POSTHOG_KEY, readConsent, setConsent } from '@/lib/analytics';

// Đoạn nạp chính thức của PostHog (không cần cài gói npm)
const LOADER = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify setPersonProperties group reset get_distinct_id alias set_config opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);`;

function subscribe(cb: () => void) {
  window.addEventListener('synapse-consent', cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener('synapse-consent', cb);
    window.removeEventListener('storage', cb);
  };
}

/** Nạp PostHog ở chế độ tắt mặc định; chỉ ghi nhận khi người dùng bấm Đồng ý. */
export function Analytics() {
  const consent = useSyncExternalStore(subscribe, readConsent, () => 'denied' as const);
  if (!POSTHOG_KEY) return null;

  const init = `${LOADER}
posthog.init(${JSON.stringify(POSTHOG_KEY)}, {
  api_host: ${JSON.stringify(POSTHOG_HOST)},
  person_profiles: 'identified_only',
  capture_pageview: 'history_change',
  disable_session_recording: true,
  opt_out_capturing_by_default: true
});
try { if (localStorage.getItem(${JSON.stringify(CONSENT_KEY)}) === 'granted') posthog.opt_in_capturing(); } catch (e) {}`;

  return (
    <>
      <Script id="posthog-init" strategy="afterInteractive">
        {init}
      </Script>
      {consent === null && (
        <div
          role="dialog"
          aria-label="Đồng ý đo lường"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_64px_-16px_rgba(15,34,88,0.35)] sm:flex sm:items-center sm:gap-5 sm:p-5"
        >
          <p className="text-sm leading-relaxed text-slate-600">
            Synapse Lab dùng cookie phân tích ẩn danh để cải thiện trải nghiệm. Bạn có thể thay đổi lựa chọn bất cứ lúc nào.{' '}
            <Link href="/privacy" className="font-semibold text-[#1E3F82] underline">
              Chính sách quyền riêng tư
            </Link>
          </p>
          <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
            <button type="button" onClick={() => setConsent('denied')} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400">
              Từ chối
            </button>
            <button type="button" onClick={() => setConsent('granted')} className="rounded-lg bg-[#1E3F82] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163070]">
              Đồng ý
            </button>
          </div>
        </div>
      )}
    </>
  );
}

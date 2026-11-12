import type { LabArtKey } from '@/lib/lab-catalog';

const common = {
  viewBox: '0 0 200 120',
  className: 'h-full w-full',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 6,
  strokeLinecap: 'round' as const,
};

/** Hình minh họa chuyển động cho từng bài (SMIL, không cần JS). Bài chưa có hình dùng 'generic'. */
export function LabArt({ name }: { name: LabArtKey }) {
  switch (name) {
    case 'arm':
      return (
        <svg {...common} aria-hidden>
          <path d="M25 108h70" />
          <path d="M60 108V88" />
          <g>
            <animateTransform attributeName="transform" type="rotate" values="-18 60 88;14 60 88;-18 60 88" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" />
            <path d="M60 88l42-38" />
            <circle cx="60" cy="88" r="7" fill="white" />
            <g>
              <animateTransform attributeName="transform" type="rotate" values="20 102 50;-25 102 50;20 102 50" dur="4s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" />
              <path d="M102 50l40 8" />
              <circle cx="102" cy="50" r="7" fill="white" />
              <path d="M142 58l12-9m-12 9l12 11" />
            </g>
          </g>
        </svg>
      );
    case 'car':
      return (
        <svg {...common} aria-hidden>
          <path id="lab-track" d="M-10 92c40 0 40-52 90-52s50 52 90 52 40-12 50-12" strokeDasharray="2 12" />
          <g>
            <animateMotion dur="6s" repeatCount="indefinite" rotate="auto" path="M-10 92c40 0 40-52 90-52s50 52 90 52 40-12 50-12" />
            <rect x="-16" y="-11" width="32" height="22" rx="6" fill="white" />
            <circle cx="-8" cy="12" r="4" fill="white" />
            <circle cx="8" cy="12" r="4" fill="white" />
          </g>
        </svg>
      );
    case 'iot':
      return (
        <svg {...common} aria-hidden>
          <circle cx="32" cy="60" r="14" fill="white" />
          <rect x="82" y="42" width="38" height="36" rx="6" fill="white" />
          <rect x="152" y="38" width="36" height="44" rx="6" fill="white" />
          <path d="M48 60h32m42 0h28" strokeDasharray="2 10" />
          <circle r="4" fill="currentColor" stroke="none">
            <animate attributeName="cx" values="46;82;120;152" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="cy" values="60;60;60;60" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;0" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <circle cx="100" cy="60" r="26" fill="white" />
          <path d="M100 30v-12m0 84v-12m30-30h12m-84 0h12" />
        </svg>
      );
  }
}

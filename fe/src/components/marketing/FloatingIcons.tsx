import type { CSSProperties } from 'react';
import { Box, Braces, Cpu, Diagram3, HeartPulse, Lightbulb, Mortarboard, Stars } from 'react-bootstrap-icons';

// Biểu tượng mờ trôi nhẹ trên nền (trang trí, ẩn với trình đọc màn hình)
const ITEMS = [
  { Icon: Box, top: '12%', left: '4%', size: 44, rotate: -12, duration: 9, delay: 0 },
  { Icon: HeartPulse, top: '68%', left: '8%', size: 38, rotate: 10, duration: 11, delay: 1.2 },
  { Icon: Diagram3, top: '18%', left: '47%', size: 34, rotate: 8, duration: 10, delay: 0.6 },
  { Icon: Braces, top: '80%', left: '42%', size: 30, rotate: -8, duration: 12, delay: 2 },
  { Icon: Cpu, top: '6%', left: '88%', size: 40, rotate: 14, duration: 10, delay: 0.3 },
  { Icon: Lightbulb, top: '86%', left: '90%', size: 34, rotate: -10, duration: 9.5, delay: 1.6 },
  { Icon: Mortarboard, top: '44%', left: '95%', size: 30, rotate: 6, duration: 13, delay: 0.9 },
  { Icon: Stars, top: '48%', left: '1%', size: 26, rotate: 0, duration: 8, delay: 2.4 },
];

export function FloatingIcons({ dark = false }: { dark?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {ITEMS.map(({ Icon, top, left, size, rotate, duration, delay }, i) => (
        <span
          key={i}
          className={`mk-float absolute hidden md:block ${dark ? 'text-white/10' : 'text-[#1E3F82]/[0.09]'}`}
          style={
            {
              top,
              left,
              '--mk-rotate': `${rotate}deg`,
              '--mk-duration': `${duration}s`,
              '--mk-delay': `${delay}s`,
            } as CSSProperties
          }
        >
          <Icon style={{ width: size, height: size }} />
        </span>
      ))}
      <div className={`absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full blur-3xl ${dark ? 'bg-[#5B8FD8]/15' : 'bg-[#E8F0FB]'}`} />
      <div className={`absolute -bottom-48 -left-32 h-[24rem] w-[24rem] rounded-full blur-3xl ${dark ? 'bg-[#1E3F82]/40' : 'bg-[#EEF3FB]'}`} />
    </div>
  );
}

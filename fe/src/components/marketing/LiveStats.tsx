'use client';

import { Box, CodeSlash } from 'react-bootstrap-icons';
import { CountUp, Reveal } from './motion';
import { useAlgorithmCount } from './stats/useAlgorithmCount';
import { usePublishedAnatomyCount } from './stats/usePublishedAnatomyCount';

/** Làm tròn xuống hàng chục: 21 -> 20 (hiện "20+"); dưới 10 giữ nguyên. */
function rounded(n: number): { value: number; suffix: string } {
  return n >= 10 ? { value: Math.floor(n / 10) * 10, suffix: '+' } : { value: n, suffix: '' };
}

/** Số liệu thật lấy từ hệ thống, làm tròn để dễ đọc. */
export function LiveStats() {
  const anatomyModels = usePublishedAnatomyCount();
  const algorithms = useAlgorithmCount();

  const stats = [
    {
      icon: Box,
      count: anatomyModels,
      label: 'Mô hình giải phẫu 3D',
      text: 'Có chú thích từng thành phần, mở xem ngay không cần đăng ký.',
    },
    {
      icon: CodeSlash,
      count: algorithms,
      label: 'Giải thuật có mô phỏng',
      text: 'Chạy từng bước, đồng bộ với mã nguồn và phần diễn giải.',
    },
  ].filter((s) => s.count > 0);

  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {stats.map(({ icon: Icon, count, label, text }, i) => {
        const r = rounded(count);
        return (
          <Reveal
            as="li"
            key={label}
            delay={i * 120}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 md:p-10"
          >
            <Icon className="absolute -right-6 -top-6 h-40 w-40 text-[#1E3F82]/[0.05] transition-transform duration-700 group-hover:rotate-12" aria-hidden />
            <p className="relative text-6xl font-bold tracking-tight text-[#1E3F82] md:text-7xl">
              <CountUp value={r.value} suffix={r.suffix} />
            </p>
            <p className="relative mt-4 text-xl font-bold text-[#0F2258]">{label}</p>
            <p className="relative mt-2 max-w-sm text-[15px] leading-relaxed text-slate-600">{text}</p>
          </Reveal>
        );
      })}
    </ul>
  );
}

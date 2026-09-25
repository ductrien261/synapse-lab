import { SOURCES } from '@/lib/marketing';

/** Dải tên nguồn học liệu chạy ngang. */
export function SourceMarquee() {
  const items = [...SOURCES, ...SOURCES, ...SOURCES];
  return (
    <div className="relative overflow-hidden border-y border-slate-200 bg-white py-6 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <div className="mk-marquee flex w-max gap-16">
        {[...items, ...items].map((s, i) => (
          <span key={i} className="flex items-center gap-3 whitespace-nowrap text-xl font-bold tracking-tight text-slate-400">
            {s.name}
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{s.license}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

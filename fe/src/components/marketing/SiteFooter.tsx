import Image from 'next/image';
import Link from 'next/link';
import { CAPABILITIES, DOMAINS, SITE } from '@/lib/marketing';

const COLUMNS = [
  {
    title: 'Nền tảng',
    links: CAPABILITIES.filter((c) => !c.soon).map((c) => ({ href: `/nen-tang#${c.anchor}`, label: c.title })),
  },
  {
    title: 'Lĩnh vực',
    links: DOMAINS.map((d) => ({ href: `/linh-vuc#${d.key}`, label: d.title })),
  },
  {
    title: 'Tài nguyên',
    links: [
      { href: '/cong-nghe-ai', label: 'Công nghệ AI' },
      { href: '/nguon-tri-thuc', label: 'Nguồn tri thức' },
      { href: '/#cau-hoi', label: 'Câu hỏi thường gặp' },
      { href: '/gioi-thieu', label: 'Giới thiệu' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#0B1A44] text-white">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-3" aria-label="Synapse Lab - Trang chủ">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <Image src="/images/logo-icon.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
              </span>
              <span className="text-xl font-bold tracking-tight">Synapse Lab</span>
            </Link>
            <p className="mt-5 text-[15px] leading-relaxed text-white/65">{SITE.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-white">{col.title}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[15px] text-white/65 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-8 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Synapse Lab. Bảo lưu mọi quyền.</p>
          <p>Học liệu: OpenStax (CC BY 4.0) · Mô hình 3D: AnatomyTOOL, Sketchfab — ghi công trên từng mô hình.</p>
        </div>
      </div>
    </footer>
  );
}

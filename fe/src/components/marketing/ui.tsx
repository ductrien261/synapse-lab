import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, ChevronRight } from 'react-bootstrap-icons';
import { FloatingIcons } from './FloatingIcons';
import { Reveal } from './motion';

// Khối dựng trang giới thiệu (bố cục theo tinh thần Relume: khoảng trắng rộng, chữ lớn, lưới rõ ràng)

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1280px] px-5 md:px-8 ${className}`}>{children}</div>;
}

type Tone = 'white' | 'muted' | 'dark';

const TONES: Record<Tone, string> = {
  white: 'bg-white text-[#0F172A]',
  muted: 'bg-[#F4F7FC] text-[#0F172A]',
  dark: 'bg-[#0B1A44] text-white',
};

export function Section({
  id,
  tone = 'white',
  className = '',
  children,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-20 py-16 md:py-24 lg:py-28 ${TONES[tone]} ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`mb-3 text-sm font-semibold tracking-wide md:mb-4 ${dark ? 'text-[#8FB1E3]' : 'text-[#1E3F82]'}`}>{children}</p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  dark = false,
  as = 'h2',
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: 'left' | 'center';
  dark?: boolean;
  as?: 'h1' | 'h2';
  children?: ReactNode;
}) {
  const Tag = as;
  const size = as === 'h1' ? 'text-4xl md:text-6xl' : 'text-3xl md:text-5xl';
  return (
    <Reveal className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-3xl`}>
      {eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}
      <Tag className={`${size} font-bold leading-[1.1] tracking-[-0.03em] ${dark ? 'text-white' : 'text-[#0F2258]'}`}>{title}</Tag>
      {lead && (
        <p className={`mt-5 text-base leading-relaxed md:mt-6 md:text-lg ${dark ? 'text-white/75' : 'text-slate-600'}`}>{lead}</p>
      )}
      {children && <div className={`mt-6 flex flex-wrap items-center gap-4 md:mt-8 ${align === 'center' ? 'justify-center' : ''}`}>{children}</div>}
    </Reveal>
  );
}

type Variant = 'primary' | 'secondary' | 'light' | 'outline-light' | 'link';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[#1E3F82] text-white hover:bg-[#163070] px-6 py-3',
  secondary: 'border border-slate-300 bg-white text-[#0F2258] hover:border-[#1E3F82] px-6 py-3',
  light: 'bg-white text-[#0F2258] hover:bg-[#E8F0FB] px-6 py-3',
  'outline-light': 'border border-white/40 text-white hover:bg-white/10 px-6 py-3',
  link: 'text-[#1E3F82] hover:text-[#0F2258] px-0 py-1',
};

export function ButtonLink({
  href,
  variant = 'primary',
  children,
  className = '',
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  const external = href.startsWith('http') || href.startsWith('mailto:');
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg text-[15px] font-semibold transition-colors ${VARIANTS[variant]} ${className}`;
  const content = (
    <>
      {children}
      {variant === 'link' && <ChevronRight className="h-3.5 w-3.5" />}
    </>
  );
  return external ? (
    <a href={href} className={cls} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

export function ArrowIcon() {
  return <ArrowRight className="h-4 w-4" />;
}

export function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' }) {
  const cls = {
    blue: 'bg-[#E8F0FB] text-[#1E3F82]',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
  }[tone];
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

/** Tiêu đề trang con (bố cục header-01 của Relume). */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white py-20 md:py-28 lg:py-32">
      <FloatingIcons />
      <Container className="relative">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} lead={lead}>
          {children}
        </SectionHeading>
      </Container>
    </section>
  );
}

/** Dải kêu gọi hành động cuối trang (bố cục cta-07). */
export function CtaBand({
  title = 'Sẵn sàng học theo cách trực quan hơn?',
  text = 'Khám phá miễn phí ngay hôm nay. Tạo tài khoản khi bạn cần trợ lý AI và lộ trình ôn tập cá nhân hóa.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <Section tone="muted">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_max-content] md:gap-20">
        <div>
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#0F2258] md:text-5xl">{title}</h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">{text}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <ButtonLink href="/library">Trải nghiệm ngay</ButtonLink>
          <ButtonLink href="/register" variant="secondary">
            Tạo tài khoản
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}

export function CheckList({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className={`flex items-start gap-3 text-base ${dark ? 'text-white/80' : 'text-slate-700'}`}>
          <svg className="mt-1 h-4 w-4 shrink-0 text-[#1E3F82]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m3 8.5 3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {item}
        </li>
      ))}
    </ul>
  );
}

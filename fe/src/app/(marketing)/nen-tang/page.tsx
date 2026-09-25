import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { HeroDemo } from '@/components/marketing/HeroDemo';
import { CapabilityIcon } from '@/components/marketing/icons';
import { CitationCard, ProfileCard, ReviewSchedule, SpaceCard } from '@/components/marketing/Illustrations';
import { JsonLd } from '@/components/marketing/JsonLd';
import { SortDemo } from '@/components/marketing/SortDemo';
import { Badge, CheckList, CtaBand, PageHero, Section, SectionHeading, ButtonLink } from '@/components/marketing/ui';
import { CAPABILITIES, SITE, type CapabilityKey } from '@/lib/marketing';

export const metadata: Metadata = {
  title: 'Nền tảng học tập trực quan và tương tác',
  description:
    'Tìm hiểu các công cụ của Synapse Lab: trực quan hóa 3D, mô phỏng từng bước, trợ lý AI có dẫn nguồn, ôn tập thích ứng và hồ sơ học tập minh bạch.',
  alternates: { canonical: '/nen-tang' },
};

const VISUALS: Record<CapabilityKey, ReactNode> = {
  'visual-3d': <HeroDemo />,
  simulation: <SortDemo compact />,
  assistant: <CitationCard />,
  review: <ReviewSchedule />,
  profile: <ProfileCard />,
  spaces: <SpaceCard />,
};

const AUDIENCES = [
  { title: 'Người học', text: 'Tự học theo nhịp riêng, hỏi đáp mọi lúc và ôn tập đúng phần cần củng cố.' },
  { title: 'Giảng viên', text: 'Minh họa bài giảng bằng mô hình và mô phỏng, với nội dung giải thích có nguồn rõ ràng.' },
  { title: 'Tổ chức đào tạo', text: 'Chuẩn hóa học liệu trực quan và kiểm soát chất lượng nội dung trên cùng một nền tảng.' },
];

export default function PlatformPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: SITE.name,
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Web',
          url: `${SITE.url}/nen-tang`,
          description: SITE.description,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND' },
          featureList: CAPABILITIES.filter((c) => !c.soon).map((c) => c.title),
        }}
      />
      <PageHero
        eyebrow="Nền tảng"
        title="Nền tảng học tập trực quan, tương tác và có kiểm chứng"
        lead="Synapse Lab kết hợp trực quan hóa, mô phỏng và trí tuệ nhân tạo trong một môi trường học thống nhất — giúp người học hiểu bản chất, ghi nhớ lâu và luôn biết kiến thức đến từ đâu."
      >
        <ButtonLink href="/#trai-nghiem">Trải nghiệm ngay</ButtonLink>
        <ButtonLink href="/register" variant="secondary">
          Tạo tài khoản miễn phí
        </ButtonLink>
      </PageHero>

      {CAPABILITIES.map((c, i) => (
        <Section key={c.key} id={c.anchor} tone={i % 2 === 0 ? 'white' : 'muted'}>
          <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-20">
            <div className={i % 2 === 1 ? 'md:order-2' : ''}>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F0FB] text-[#1E3F82]">
                  <CapabilityIcon name={c.key} />
                </span>
                {c.soon && <Badge tone="amber">Sắp ra mắt</Badge>}
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-[-0.03em] text-[#0F2258] md:text-[44px] md:leading-tight">{c.title}</h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">{c.summary}</p>
              <div className="mt-8">
                <CheckList items={c.points} />
              </div>
            </div>
            <div>{VISUALS[c.key]}</div>
          </div>
        </Section>
      ))}

      <Section tone="white">
        <SectionHeading align="center" eyebrow="Đối tượng" title="Thiết kế cho mọi vai trò trong quá trình học" />
        <ul className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <li key={a.title} className="rounded-xl border border-slate-200 p-8">
              <h3 className="text-xl font-bold text-[#0F2258]">{a.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{a.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}

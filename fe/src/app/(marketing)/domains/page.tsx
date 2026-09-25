import type { Metadata } from 'next';
import { ModelGallery } from '@/components/marketing/ModelGallery';
import { SortDemo } from '@/components/marketing/SortDemo';
import { SystemsGrid } from '@/components/marketing/SystemsGrid';
import { Badge, ButtonLink, CheckList, CtaBand, PageHero, Section, SectionHeading } from '@/components/marketing/ui';
import { ALGO_CATEGORY_VI } from '@/lib/algo-categories';
import { DOMAINS } from '@/lib/marketing';

export const metadata: Metadata = {
  title: 'Lĩnh vực học tập trực quan',
  description:
    'Các lĩnh vực trên Synapse Lab: giải phẫu học người với mô hình 3D có chú thích và giải thuật với mô phỏng từng bước. Danh mục được mở rộng liên tục.',
  alternates: { canonical: '/domains' },
};

const anatomy = DOMAINS.find((d) => d.key === 'anatomy')!;
const algorithms = DOMAINS.find((d) => d.key === 'algorithms')!;
const categories = Object.entries(ALGO_CATEGORY_VI).filter(([key]) => key !== 'uncategorized');

export default function DomainsPage() {
  return (
    <>
      <PageHero
        eyebrow="Lĩnh vực"
        title="Một phương pháp trực quan cho nhiều lĩnh vực tri thức"
        lead="Mỗi lĩnh vực trên Synapse Lab dùng chung bộ công cụ trực quan hóa, mô phỏng và trợ lý AI, cùng một tiêu chuẩn kiểm chứng nội dung. Danh mục được mở rộng theo nhu cầu người học."
      />

      <Section id={anatomy.key} tone="white">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-500">{anatomy.field}</span>
              <Badge tone="green">Đang hoạt động</Badge>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-[#0F2258] md:text-5xl">{anatomy.title}</h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">{anatomy.summary}</p>
            <div className="mt-8">
              <CheckList items={anatomy.highlights} />
            </div>
            <ButtonLink href={anatomy.href} className="mt-10">
              {anatomy.cta}
            </ButtonLink>
          </div>
          <div>
            <p className="mb-4 text-sm font-semibold text-slate-500">Hệ cơ quan hiện có</p>
            <SystemsGrid />
          </div>
        </div>
        <div className="mt-16">
          <p className="mb-5 text-sm font-semibold text-slate-500">Mô hình tiêu biểu</p>
          <ModelGallery limit={3} />
        </div>
      </Section>

      <Section id={algorithms.key} tone="muted">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-500">{algorithms.field}</span>
              <Badge tone="green">Đang hoạt động</Badge>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-[#0F2258] md:text-5xl">{algorithms.title}</h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">{algorithms.summary}</p>
            <ul className="mt-8 flex flex-wrap gap-2.5">
              {categories.map(([key, label]) => (
                <li key={key} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#1E3F82]">
                  {label}
                </li>
              ))}
            </ul>
            <ButtonLink href={algorithms.href} className="mt-10">
              {algorithms.cta}
            </ButtonLink>
          </div>
          <SortDemo />
        </div>
      </Section>

      <Section id="suggest" tone="white">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-[#F4F7FC] p-8 md:p-14">
          <SectionHeading
            eyebrow="Lĩnh vực tiếp theo"
            title="Chủ đề nào bạn muốn được trực quan hóa?"
            lead="Nền tảng được thiết kế để bổ sung lĩnh vực mới mà không thay đổi trải nghiệm học. Hãy cho chúng tôi biết môn học hoặc chủ đề bạn cần — đề xuất từ người dùng được ưu tiên trong lộ trình phát triển."
          >
            <ButtonLink href="/about#contact">Gửi đề xuất</ButtonLink>
          </SectionHeading>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}

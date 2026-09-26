import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircleFill, Journals, PatchCheck, ShieldCheck } from 'react-bootstrap-icons';
import { ExperienceTabs } from '@/components/marketing/ExperienceTabs';
import { Faq } from '@/components/marketing/Faq';
import { FloatingIcons } from '@/components/marketing/FloatingIcons';
import { Reveal } from '@/components/marketing/motion';
import { HeroDemo } from '@/components/marketing/HeroDemo';
import { CapabilityIcon } from '@/components/marketing/icons';
import { CitationCard } from '@/components/marketing/Illustrations';
import { JsonLd } from '@/components/marketing/JsonLd';
import { ModelMosaic } from '@/components/marketing/ModelGallery';
import { SortDemo } from '@/components/marketing/SortDemo';
import { StepsScroll } from '@/components/marketing/StepsScroll';
import { Badge, ButtonLink, Container, Section, SectionHeading } from '@/components/marketing/ui';
import { ValueTabs } from '@/components/marketing/ValueTabs';
import { CAPABILITIES, DOMAINS, FAQS, SITE, SOURCES } from '@/lib/marketing';

export const metadata: Metadata = {
  title: { absolute: 'Synapse Lab' },
  description: SITE.description,
  alternates: { canonical: '/' },
};

const STEPS = [
  {
    eyebrow: 'Khám phá',
    title: 'Tiếp cận trực quan',
    text: 'Chọn một chủ đề và tương tác trực tiếp với mô hình hoặc mô phỏng để nắm được cấu trúc tổng thể trước khi đi vào chi tiết.',
  },
  {
    eyebrow: 'Đào sâu',
    title: 'Hỏi đúng ngữ cảnh',
    text: 'Đặt câu hỏi cho trợ lý AI ngay tại phần đang xem. Câu trả lời bám sát ngữ cảnh và kèm nguồn trích dẫn để bạn đối chiếu.',
  },
  {
    eyebrow: 'Củng cố',
    title: 'Ghi nhớ lâu dài',
    text: 'Ôn tập theo lịch cá nhân hóa, tập trung vào nội dung bạn chưa vững và những điểm dễ nhầm lẫn.',
  },
];

const PRINCIPLES = [
  { icon: Journals, title: 'Trả lời dựa trên nguồn', text: 'Trợ lý AI chỉ tổng hợp từ học liệu đã kiểm duyệt, mỗi ý đều gắn trích dẫn tới mục cụ thể.' },
  { icon: ShieldCheck, title: 'Minh bạch khi thiếu thông tin', text: 'Khi học liệu chưa đề cập, hệ thống nói rõ thay vì suy đoán để tránh thông tin sai lệch.' },
  { icon: PatchCheck, title: 'Nội dung được kiểm duyệt', text: 'Nội dung do AI soạn thảo chỉ được xuất bản sau khi người phụ trách chuyên môn phê duyệt.' },
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'Organization', name: SITE.name, url: SITE.url, logo: `${SITE.url}/images/logo-icon.png` },
            { '@type': 'WebSite', name: SITE.name, url: SITE.url, inLanguage: 'vi-VN' },
            {
              '@type': 'FAQPage',
              mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            },
          ],
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white pb-14 pt-10 md:py-20 lg:py-28">
        <FloatingIcons />
        <Container className="relative">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="mb-4 text-[13px] font-semibold tracking-wide text-[#1E3F82] md:text-sm">{SITE.tagline}</p>
              <h1 className="text-[32px] font-bold leading-[1.12] tracking-[-0.03em] text-[#0F2258] sm:text-5xl md:max-w-2xl lg:text-6xl lg:leading-[1.08]">
                Hiểu sâu hơn qua trực quan hóa và tương tác
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-600 md:mt-6 md:text-lg">
                Synapse Lab chuyển kiến thức phức tạp thành mô hình 3D, mô phỏng từng bước và những câu trả lời có dẫn nguồn — để người học
                quan sát, thao tác và tự kiểm chứng.
              </p>
              <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap sm:gap-4 md:mt-8">
                <ButtonLink href="#try" className="w-full sm:w-auto">
                  Trải nghiệm ngay <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink href="/register" variant="secondary" className="w-full sm:w-auto">
                  Tạo tài khoản miễn phí
                </ButtonLink>
              </div>
              <p className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500 sm:justify-start">
                <CheckCircleFill className="h-4 w-4 text-emerald-600" /> Không cần đăng ký để bắt đầu khám phá
              </p>
            </div>
            <Reveal delay={150} className="mx-auto w-full max-w-xl lg:max-w-none">
              <HeroDemo />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Nguồn học liệu */}
      <div className="border-y border-slate-200 bg-white">
        <Container className="flex flex-col items-center gap-4 py-8 md:flex-row md:justify-between">
          <p className="text-sm font-medium text-slate-500">Xây dựng trên học liệu có giấy phép mở từ</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-3">
            {SOURCES.map((s) => (
              <li key={s.name} className="text-xl font-bold tracking-tight text-slate-400">
                {s.name}
              </li>
            ))}
          </ul>
        </Container>
      </div>

      {/* Phương pháp */}
      <Section tone="white">
        <SectionHeading
          align="center"
          eyebrow="Phương pháp"
          title="Học bằng cách quan sát, thao tác và kiểm chứng"
          lead="Ba nguyên tắc thiết kế giúp kiến thức trừu tượng trở nên dễ tiếp cận, dễ hiểu và dễ ghi nhớ hơn."
        />
        <div className="mt-12 md:mt-20">
          <ValueTabs
            items={[
              {
                title: 'Quan sát trong không gian thực',
                text: 'Cấu trúc được thể hiện đúng vị trí và tương quan trong không gian ba chiều, thay cho hình minh họa phẳng buộc người học tự hình dung.',
                visual: <ModelMosaic />,
              },
              {
                title: 'Theo dõi quá trình, không chỉ kết quả',
                text: 'Mỗi bước của một quá trình được tách riêng để bạn điều khiển, tua lại và đối chiếu với lý thuyết hoặc mã nguồn tương ứng.',
                visual: <SortDemo compact />,
              },
              {
                title: 'Giải đáp có thể kiểm chứng',
                text: 'Mọi câu trả lời của trợ lý AI đều kèm trích dẫn tới học liệu gốc, giúp bạn đối chiếu và tin tưởng vào kiến thức tiếp nhận.',
                visual: <CitationCard />,
              },
            ]}
          />
        </div>
      </Section>

      {/* Tính năng */}
      <Section id="features" tone="muted">
        <SectionHeading
          align="center"
          eyebrow="Nền tảng"
          title="Một bộ công cụ cho toàn bộ quá trình học"
          lead="Từ tiếp cận khái niệm mới đến củng cố lâu dài, các công cụ vận hành liền mạch trên cùng một nền tảng."
        />
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 md:mt-20 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <Reveal as="li" key={c.key} delay={(i % 3) * 110} className="flex flex-col rounded-xl border border-slate-200 bg-white p-7 transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(15,34,88,0.35)]">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F0FB] text-[#1E3F82]">
                  <CapabilityIcon name={c.key} />
                </span>
                {c.soon && <Badge tone="amber">Sắp ra mắt</Badge>}
              </div>
              <h3 className="mt-6 text-xl font-bold tracking-tight text-[#0F2258]">{c.title}</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-600">{c.summary}</p>
              {c.href && (
                <Link href={c.href} className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1E3F82] hover:text-[#0F2258]">
                  {c.href.startsWith('/register') ? 'Bắt đầu miễn phí' : 'Khám phá'} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* Trải nghiệm */}
      <Section id="try" tone="white">
        <SectionHeading
          align="center"
          eyebrow="Trải nghiệm"
          title="Bắt đầu ngay, không cần đăng ký"
          lead="Mở một mô hình 3D hoặc chạy thử một mô phỏng. Tạo tài khoản khi bạn cần trợ lý AI, ôn tập và ghi chú cá nhân."
        />
        <div className="mt-12 md:mt-16">
          <ExperienceTabs />
        </div>
      </Section>

      {/* Quy trình */}
      <Section tone="muted">
        <div className="mb-12 md:mb-20">
          <SectionHeading eyebrow="Quy trình học" title="Ba bước cho một phiên học hiệu quả" />
        </div>
        <StepsScroll steps={STEPS} />
      </Section>

      {/* Lĩnh vực */}
      <Section tone="white">
        <SectionHeading
          eyebrow="Lĩnh vực"
          title="Một nền tảng, nhiều lĩnh vực tri thức"
          lead="Mỗi lĩnh vực được xây dựng trên cùng một phương pháp trực quan và cùng tiêu chuẩn kiểm chứng nội dung. Danh mục được mở rộng liên tục."
        >
          <ButtonLink href="/library" variant="link">
            Mở kho học liệu
          </ButtonLink>
        </SectionHeading>
        <ul className="mt-12 grid gap-6 md:mt-16 lg:grid-cols-3">
          {DOMAINS.map((d, i) => (
            <Reveal as="li" key={d.key} delay={i * 110} className="flex flex-col rounded-xl border border-slate-200 p-8">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">{d.field}</span>
                <Badge tone="green">Đang hoạt động</Badge>
              </div>
              <h3 className="mt-5 text-2xl font-bold tracking-tight text-[#0F2258]">{d.title}</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-600">{d.summary}</p>
              <ButtonLink href={d.href} variant="link" className="mt-6 self-start">
                {d.cta}
              </ButtonLink>
            </Reveal>
          ))}
          <li className="flex flex-col rounded-xl border border-dashed border-slate-300 bg-[#F4F7FC] p-8">
            <span className="text-sm font-semibold text-slate-500">Lĩnh vực tiếp theo</span>
            <h3 className="mt-5 text-2xl font-bold tracking-tight text-[#0F2258]">Bạn cần trực quan hóa chủ đề nào?</h3>
            <p className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-600">
              Kiến trúc nền tảng cho phép bổ sung lĩnh vực mới mà không thay đổi trải nghiệm học. Đề xuất của người dùng được ưu tiên xem xét.
            </p>
            <ButtonLink href="/about#contact" variant="link" className="mt-6 self-start">
              Đề xuất lĩnh vực
            </ButtonLink>
          </li>
        </ul>
      </Section>

      {/* AI có trách nhiệm */}
      <Section tone="dark" className="relative overflow-hidden">
        <SectionHeading
          dark
          eyebrow="AI có trách nhiệm"
          title="Trí tuệ nhân tạo phục vụ việc học, không thay thế sự chính xác"
          lead="Trợ lý AI của Synapse Lab được thiết kế với nguyên tắc kiểm chứng là ưu tiên hàng đầu."
        >
          <ButtonLink href="/sources#ai" variant="light">
            Tìm hiểu công nghệ AI
          </ButtonLink>
        </SectionHeading>
        <ul className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 120} className="border-t border-white/15 pt-8">
              <Icon className="h-8 w-8 text-[#8FB1E3]" aria-hidden />
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/70">{text}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* Hỏi đáp */}
      <Section id="faq" tone="white">
        <SectionHeading align="center" title="Câu hỏi thường gặp" lead="Những thông tin cần biết trước khi bắt đầu với Synapse Lab." />
        <div className="mt-12 md:mt-16">
          <Faq items={FAQS} />
        </div>
      </Section>

      {/* Kêu gọi hành động */}
      <Section tone="muted">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_max-content] md:gap-20">
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#0F2258] md:text-5xl">Sẵn sàng học theo cách trực quan hơn?</h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
              Khám phá miễn phí ngay hôm nay. Tạo tài khoản khi bạn cần trợ lý AI và lộ trình ôn tập cá nhân hóa.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <ButtonLink href="#try">Trải nghiệm ngay</ButtonLink>
            <ButtonLink href="/register" variant="secondary">
              Tạo tài khoản
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}

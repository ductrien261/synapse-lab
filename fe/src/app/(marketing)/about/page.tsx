import type { Metadata } from 'next';
import { Envelope } from 'react-bootstrap-icons';
import { CitationCard } from '@/components/marketing/Illustrations';
import { LiveStats } from '@/components/marketing/LiveStats';
import { ModelMosaic } from '@/components/marketing/ModelGallery';
import { Reveal } from '@/components/marketing/motion';
import { SortDemo } from '@/components/marketing/SortDemo';
import { StepsScroll } from '@/components/marketing/StepsScroll';
import { ButtonLink, CtaBand, PageHero, Section, SectionHeading } from '@/components/marketing/ui';
import { ValueTabs } from '@/components/marketing/ValueTabs';
import { SITE, SOURCES } from '@/lib/marketing';

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description:
    'Synapse Lab được xây dựng với sứ mệnh giúp kiến thức phức tạp trở nên trực quan, dễ tiếp cận và luôn có thể kiểm chứng.',
  alternates: { canonical: '/about' },
};

const APPROACH = [
  {
    eyebrow: 'Lắng nghe',
    title: 'Bắt đầu từ khó khăn thật của người học',
    text: 'Mỗi tính năng xuất phát từ một trở ngại cụ thể: khó hình dung cấu trúc, thiếu người giải đáp, ôn tập không hiệu quả.',
  },
  {
    eyebrow: 'Thiết kế',
    title: 'Trực quan trước, chữ sau',
    text: 'Chúng tôi ưu tiên thể hiện kiến thức bằng mô hình, chuyển động và tương tác, rồi mới bổ sung phần diễn giải.',
  },
  {
    eyebrow: 'Kiểm chứng',
    title: 'Không đánh đổi độ chính xác',
    text: 'Nội dung được đối chiếu với học liệu gốc và phê duyệt chuyên môn trước khi đến với người học.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Giới thiệu"
        title="Giúp mọi kiến thức phức tạp trở nên dễ hiểu"
        lead="Synapse Lab ra đời từ một trăn trở quen thuộc của người học: nhiều khái niệm chỉ thực sự sáng tỏ khi được nhìn thấy, chạm vào và giải thích đúng lúc."
      >
        <ButtonLink href="/library">Khám phá kho học liệu</ButtonLink>
        <ButtonLink href="#contact" variant="secondary">
          Liên hệ
        </ButtonLink>
      </PageHero>

      <Section tone="white">
        <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading eyebrow="Sứ mệnh" title="Học bằng hiểu biết, không bằng ghi nhớ máy móc" />
            <Reveal delay={150} className="mt-6 flex flex-col gap-5 text-base leading-relaxed text-slate-600 md:text-lg">
              <p>
                Chúng tôi xây dựng một nền tảng nơi kiến thức được trực quan hóa và tương tác, còn trí tuệ nhân tạo đóng vai trò người hướng dẫn
                luôn dựa trên nguồn đáng tin cậy.
              </p>
              <p>
                Synapse Lab được phát triển bởi đội ngũ sinh viên Trường Đại học Công nghệ Thông tin và Truyền thông Việt – Hàn (VKU), kết hợp
                kinh nghiệm trong phần mềm, trí tuệ nhân tạo và giáo dục.
              </p>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <ModelMosaic />
          </Reveal>
        </div>
      </Section>

      <Section tone="muted">
        <div className="mb-12 md:mb-16">
          <SectionHeading eyebrow="Synapse Lab hôm nay" title="Những con số từ hệ thống" />
        </div>
        <LiveStats />
      </Section>

      <Section tone="white">
        <SectionHeading
          align="center"
          eyebrow="Giá trị cốt lõi"
          title="Ba giá trị định hướng mọi quyết định sản phẩm"
          lead="Mỗi tính năng trên Synapse Lab đều được cân nhắc qua ba câu hỏi: có trực quan hơn không, có chính xác hơn không, có mở hơn không."
        />
        <div className="mt-12 md:mt-20">
          <ValueTabs
            items={[
              {
                title: 'Trực quan',
                text: 'Kiến thức được thể hiện bằng mô hình, chuyển động và tương tác — thứ người học có thể nhìn thấy và tự thao tác.',
                visual: <SortDemo compact />,
              },
              {
                title: 'Chính xác',
                text: 'Mọi nội dung đều có nguồn, được kiểm chứng tự động và phê duyệt chuyên môn trước khi đến tay người học.',
                visual: <CitationCard />,
              },
              {
                title: 'Mở',
                text: 'Xây dựng trên học liệu có giấy phép mở và hướng tới một cộng đồng cùng đóng góp tri thức.',
                visual: (
                  <ul className="flex flex-col gap-3">
                    {SOURCES.map((s) => (
                      <li key={s.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-5">
                        <span className="text-xl font-bold text-[#0F2258]">{s.name}</span>
                        <span className="rounded-md bg-[#E8F0FB] px-2.5 py-1 text-xs font-semibold text-[#1E3F82]">{s.license}</span>
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />
        </div>
      </Section>

      <Section tone="muted">
        <div className="mb-12 md:mb-20">
          <SectionHeading eyebrow="Cách chúng tôi làm việc" title="Nguyên tắc xây dựng sản phẩm" />
        </div>
        <StepsScroll steps={APPROACH} />
      </Section>

      <Section id="contact" tone="white">
        <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-20">
          <SectionHeading
            eyebrow="Liên hệ"
            title="Hợp tác, góp ý hoặc đề xuất lĩnh vực mới"
            lead="Chúng tôi luôn sẵn sàng lắng nghe giảng viên, người học và các tổ chức đào tạo quan tâm tới phương pháp học tập trực quan."
          />
          <Reveal delay={150}>
            {SITE.contactEmail ? (
              <a
                href={`mailto:${SITE.contactEmail}`}
                className="group flex items-center gap-5 rounded-xl border border-slate-200 p-8 transition-all hover:-translate-y-1 hover:border-[#1E3F82] hover:shadow-[0_24px_48px_-28px_rgba(15,34,88,0.45)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F0FB] text-[#1E3F82]">
                  <Envelope className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-500">Email</span>
                  <span className="block text-xl font-bold text-[#0F2258]">{SITE.contactEmail}</span>
                </span>
              </a>
            ) : (
              <div className="rounded-xl border border-slate-200 p-8">
                <p className="text-base leading-relaxed text-slate-600">
                  Kênh liên hệ chính thức đang được cập nhật. Trong thời gian này, bạn có thể bắt đầu trải nghiệm Synapse Lab miễn phí.
                </p>
                <ButtonLink href="/library" className="mt-6">
                  Trải nghiệm ngay
                </ButtonLink>
              </div>
            )}
          </Reveal>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}

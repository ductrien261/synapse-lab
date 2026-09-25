import type { Metadata } from 'next';
import { Envelope } from 'react-bootstrap-icons';
import { ButtonLink, CtaBand, PageHero, Section, SectionHeading } from '@/components/marketing/ui';
import { SITE } from '@/lib/marketing';

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description: 'Synapse Lab được xây dựng với sứ mệnh giúp kiến thức phức tạp trở nên trực quan, dễ tiếp cận và luôn có thể kiểm chứng.',
  alternates: { canonical: '/gioi-thieu' },
};

const VALUES = [
  { title: 'Trực quan', text: 'Kiến thức được thể hiện bằng hình ảnh, mô hình và chuyển động — thứ người học có thể nhìn thấy và thao tác.' },
  { title: 'Chính xác', text: 'Mọi nội dung đều có nguồn, được kiểm chứng và phê duyệt trước khi đến tay người học.' },
  { title: 'Mở', text: 'Xây dựng trên học liệu mở và hướng tới một cộng đồng cùng đóng góp tri thức.' },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Giới thiệu"
        title="Giúp mọi kiến thức phức tạp trở nên dễ hiểu"
        lead="Synapse Lab ra đời từ một trăn trở quen thuộc của người học: nhiều khái niệm chỉ thực sự dễ hiểu khi được nhìn thấy, chạm vào và giải thích đúng lúc."
      />

      <Section tone="white">
        <div className="grid gap-12 md:grid-cols-2 lg:gap-20">
          <SectionHeading eyebrow="Sứ mệnh" title="Học bằng hiểu biết, không bằng ghi nhớ máy móc" />
          <div className="flex flex-col gap-5 text-base leading-relaxed text-slate-600 md:text-lg">
            <p>
              Chúng tôi xây dựng một nền tảng nơi kiến thức được trực quan hóa và tương tác, còn trí tuệ nhân tạo đóng vai trò người hướng dẫn
              luôn dựa trên nguồn đáng tin cậy.
            </p>
            <p>
              Synapse Lab được phát triển bởi đội ngũ sinh viên Trường Đại học Công nghệ Thông tin và Truyền thông Việt – Hàn (VKU), kết hợp
              kinh nghiệm trong lĩnh vực phần mềm, trí tuệ nhân tạo và giáo dục.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading align="center" eyebrow="Giá trị cốt lõi" title="Ba giá trị định hướng mọi quyết định sản phẩm" />
        <ul className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
          {VALUES.map((v) => (
            <li key={v.title} className="rounded-xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-bold tracking-tight text-[#0F2258]">{v.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{v.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="lien-he" tone="white">
        <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-20">
          <SectionHeading
            eyebrow="Liên hệ"
            title="Hợp tác, góp ý hoặc đề xuất lĩnh vực mới"
            lead="Chúng tôi luôn sẵn sàng lắng nghe giảng viên, người học và các tổ chức đào tạo quan tâm tới phương pháp học tập trực quan."
          />
          {SITE.contactEmail ? (
            <a
              href={`mailto:${SITE.contactEmail}`}
              className="flex items-center gap-5 rounded-xl border border-slate-200 p-8 transition-colors hover:border-[#1E3F82]"
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
              <ButtonLink href="/#trai-nghiem" className="mt-6">
                Trải nghiệm ngay
              </ButtonLink>
            </div>
          )}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}

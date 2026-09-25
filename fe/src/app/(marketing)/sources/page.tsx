import type { Metadata } from 'next';
import { BoxArrowUpRight, Journals, PatchCheck, ShieldCheck } from 'react-bootstrap-icons';
import { AutoSteps } from '@/components/marketing/AutoSteps';
import { FloatingIcons } from '@/components/marketing/FloatingIcons';
import { CitationCard, ProfileCard } from '@/components/marketing/Illustrations';
import { Reveal } from '@/components/marketing/motion';
import { SourceMarquee } from '@/components/marketing/SourceMarquee';
import { StepsScroll } from '@/components/marketing/StepsScroll';
import { Badge, ButtonLink, CheckList, CtaBand, PageHero, Section, SectionHeading } from '@/components/marketing/ui';
import { SOURCES } from '@/lib/marketing';

export const metadata: Metadata = {
  title: 'Nguồn tri thức và công nghệ AI có dẫn nguồn',
  description:
    'Synapse Lab xây dựng nội dung từ học liệu có giấy phép mở như OpenStax, AnatomyTOOL, Sketchfab và vận hành trợ lý AI theo kiến trúc truy xuất học liệu, luôn kèm trích dẫn và kiểm duyệt.',
  alternates: { canonical: '/sources' },
};

const WORKFLOW = [
  {
    eyebrow: 'Tuyển chọn',
    title: 'Chỉ học liệu có giấy phép rõ ràng',
    text: 'Mỗi tài liệu được lưu kèm tác giả, phiên bản và giấy phép. Học liệu không rõ nguồn gốc không được đưa vào kho tri thức.',
  },
  {
    eyebrow: 'Soạn thảo',
    title: 'Mỗi ý đều gắn trích dẫn',
    text: 'Nội dung giải thích được soạn thảo từ các đoạn học liệu liên quan; mỗi ý gắn trích dẫn tới mục cụ thể để người học đối chiếu.',
  },
  {
    eyebrow: 'Phê duyệt',
    title: 'Chuyên môn duyệt trước khi xuất bản',
    text: 'Người phụ trách chuyên môn rà soát, chỉnh sửa và phê duyệt. Nội dung chưa được duyệt không hiển thị cho người học.',
  },
  {
    eyebrow: 'Cải tiến',
    title: 'Cập nhật theo phản hồi',
    text: 'Phản hồi của người học về câu trả lời và câu hỏi ôn tập được ghi nhận để rà soát và cải thiện nội dung theo thời gian.',
  },
];

const PIPELINE = [
  { title: 'Hiểu ngữ cảnh', text: 'Câu hỏi được kết hợp với nội dung đang xem và hồ sơ học tập để xác định đúng trọng tâm.' },
  { title: 'Truy xuất học liệu', text: 'Tìm kiếm kết hợp theo ngữ nghĩa và thuật ngữ chuyên ngành trong kho học liệu đã kiểm duyệt.' },
  { title: 'Tổng hợp có trích dẫn', text: 'Câu trả lời viết bằng tiếng Việt, mỗi ý gắn số trích dẫn tới mục cụ thể trong học liệu.' },
  { title: 'Kiểm chứng tự động', text: 'Trích dẫn không khớp nguồn bị loại bỏ; thiếu thông tin thì nói rõ thay vì suy đoán.' },
];

const PRINCIPLES = [
  { icon: Journals, title: 'Nguồn trước, câu trả lời sau', text: 'Không tìm thấy đoạn học liệu phù hợp thì không tạo câu trả lời.' },
  { icon: ShieldCheck, title: 'Minh bạch giới hạn', text: 'Người học luôn biết khi nào học liệu chưa đề cập tới vấn đề được hỏi.' },
  { icon: PatchCheck, title: 'Con người phê duyệt', text: 'Nội dung giải thích do AI soạn thảo chỉ xuất bản sau khi được phê duyệt chuyên môn.' },
];

export default function SourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Nguồn tri thức"
        title="Kiến thức có nguồn gốc, câu trả lời có kiểm chứng"
        lead="Mọi nội dung trên Synapse Lab đều truy được về học liệu gốc. Trợ lý AI chỉ tổng hợp từ nguồn đã kiểm duyệt và luôn cho bạn biết thông tin đến từ đâu."
      >
        <ButtonLink href="/library">Mở kho học liệu</ButtonLink>
        <ButtonLink href="#ai" variant="secondary">
          Cách AI hoạt động
        </ButtonLink>
      </PageHero>

      <SourceMarquee />

      {/* Nguồn */}
      <Section tone="white">
        <SectionHeading eyebrow="Đối tác học liệu" title="Nguồn đang được sử dụng" lead="Học liệu mở từ các tổ chức giáo dục uy tín, ghi công đầy đủ cho tác giả." />
        <ul className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
          {SOURCES.map((s, i) => (
            <Reveal
              as="li"
              key={s.name}
              delay={i * 120}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#1E3F82] hover:shadow-[0_24px_48px_-28px_rgba(15,34,88,0.45)]"
            >
              <span className="text-sm font-semibold text-slate-500">{s.role}</span>
              <h3 className="mt-3 text-3xl font-bold tracking-tight text-[#0F2258]">{s.name}</h3>
              <div className="mt-4">
                <Badge>{s.license}</Badge>
              </div>
              <p className="mt-5 flex-1 text-[15px] leading-relaxed text-slate-600">{s.description}</p>
              <a href={s.url} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1E3F82]">
                Truy cập nguồn <BoxArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* Quy trình nội dung */}
      <Section tone="muted">
        <div className="mb-12 md:mb-20">
          <SectionHeading eyebrow="Quy trình nội dung" title="Từ học liệu gốc đến nội dung trên nền tảng" />
        </div>
        <StepsScroll steps={WORKFLOW} />
      </Section>

      {/* Công nghệ AI */}
      <Section id="ai" tone="dark" className="relative overflow-hidden">
        <FloatingIcons dark />
        <div className="relative">
          <SectionHeading
            dark
            eyebrow="Công nghệ AI"
            title="Trợ lý AI vận hành theo kiến trúc truy xuất học liệu"
            lead="Mỗi câu trả lời đi qua bốn bước trước khi đến với người học — để tốc độ của AI không đánh đổi độ chính xác."
          />
          <div className="mt-12 md:mt-16">
            <AutoSteps steps={PIPELINE} dark />
          </div>
        </div>
      </Section>

      <Section tone="white">
        <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Trả lời trong ngữ cảnh"
              title="Hỏi ngay tại nội dung đang học"
              lead="Trợ lý hiểu mô hình hoặc phần nội dung bạn đang xem, trả lời bằng tiếng Việt và làm nổi bật các thành phần được nhắc tới."
            />
            <Reveal delay={150} className="mt-8">
              <CheckList
                items={[
                  'Trích dẫn đánh số, mở được tới đoạn học liệu gốc',
                  'Gợi ý câu hỏi tiếp theo phù hợp với tiến độ',
                  'Câu hỏi kiểm tra nhanh ngay sau câu trả lời',
                ]}
              />
            </Reveal>
          </div>
          <Reveal delay={200}>
            <CitationCard />
          </Reveal>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading align="center" eyebrow="Nguyên tắc" title="Ba cam kết khi ứng dụng AI vào giáo dục" />
        <ul className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 120} className="rounded-xl border border-slate-200 bg-white p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F0FB] text-[#1E3F82]">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-6 text-xl font-bold text-[#0F2258]">{title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{text}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section tone="white">
        <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-20">
          <Reveal>
            <ProfileCard />
          </Reveal>
          <div>
            <SectionHeading
              eyebrow="Cá nhân hóa"
              title="Hồ sơ học tập do bạn kiểm soát"
              lead="Hệ thống ghi nhận mức độ nắm vững, điểm hay nhầm lẫn và mục tiêu để điều chỉnh câu trả lời và lịch ôn tập. Mỗi tài khoản có hạn mức sử dụng AI hằng ngày để duy trì chất lượng ổn định."
            />
            <Reveal delay={150} className="mt-8">
              <CheckList
                items={['Xem đầy đủ những gì hệ thống ghi nhận về bạn', 'Chỉnh sửa mục tiêu và ghi chú dành cho trợ lý', 'Đặt lại toàn bộ dữ liệu học tập bất cứ lúc nào']}
              />
            </Reveal>
          </div>
        </div>
      </Section>

      <Section tone="muted">
        <Reveal className="relative overflow-hidden rounded-2xl bg-[#0B1A44] p-8 text-white md:p-14">
          <FloatingIcons dark />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <span className="relative flex h-2 w-2">
                <span className="mk-pulse-ring absolute inline-flex h-full w-full rounded-full bg-amber-300" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
              </span>
              Sắp ra mắt
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-[-0.03em] md:text-5xl">Cộng đồng đóng góp học liệu</h2>
            <p className="mt-5 text-base leading-relaxed text-white/75 md:text-lg">
              Giảng viên và người học sẽ có thể chia sẻ học liệu mở lên nền tảng. Mỗi đóng góp được kiểm duyệt, gắn nhãn nguồn gốc và giấy phép trước
              khi đưa vào kho tri thức chung.
            </p>
            <ButtonLink href="/about#contact" variant="light" className="mt-8">
              Đăng ký quan tâm
            </ButtonLink>
          </div>
        </Reveal>
      </Section>

      <CtaBand />
    </>
  );
}

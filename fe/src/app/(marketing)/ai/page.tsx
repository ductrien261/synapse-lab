import type { Metadata } from 'next';
import { Journals, PatchCheck, ShieldCheck } from 'react-bootstrap-icons';
import { CitationCard, ProfileCard } from '@/components/marketing/Illustrations';
import { ButtonLink, CheckList, CtaBand, PageHero, Section, SectionHeading } from '@/components/marketing/ui';

export const metadata: Metadata = {
  title: 'Công nghệ AI có dẫn nguồn',
  description:
    'Cách trợ lý AI của Synapse Lab hoạt động: truy xuất học liệu đã kiểm duyệt, trả lời kèm trích dẫn, kiểm chứng tự động và cá nhân hóa theo hồ sơ học tập do người học kiểm soát.',
  alternates: { canonical: '/ai' },
};

const PIPELINE = [
  { title: 'Hiểu câu hỏi trong ngữ cảnh', text: 'Câu hỏi được kết hợp với nội dung bạn đang xem và hồ sơ học tập để xác định đúng trọng tâm.' },
  { title: 'Truy xuất học liệu', text: 'Hệ thống tìm kiếm kết hợp theo ngữ nghĩa và thuật ngữ chuyên ngành trong kho học liệu đã kiểm duyệt.' },
  { title: 'Tổng hợp kèm trích dẫn', text: 'Câu trả lời được viết bằng tiếng Việt, mỗi ý gắn số trích dẫn tới mục cụ thể trong học liệu.' },
  { title: 'Kiểm chứng tự động', text: 'Trích dẫn không khớp nguồn bị phát hiện và loại bỏ; khi thiếu thông tin, hệ thống nói rõ thay vì suy đoán.' },
];

const PRINCIPLES = [
  { icon: Journals, title: 'Nguồn trước, câu trả lời sau', text: 'Không có đoạn học liệu phù hợp thì không tạo câu trả lời.' },
  { icon: ShieldCheck, title: 'Minh bạch giới hạn', text: 'Người học luôn biết khi nào học liệu chưa đề cập tới vấn đề được hỏi.' },
  { icon: PatchCheck, title: 'Con người phê duyệt', text: 'Nội dung giải thích do AI soạn thảo chỉ xuất bản sau khi được phê duyệt chuyên môn.' },
];

export default function AiPage() {
  return (
    <>
      <PageHero
        eyebrow="Công nghệ AI"
        title="Trợ lý AI minh bạch, luôn dẫn nguồn"
        lead="Synapse Lab ứng dụng mô hình ngôn ngữ lớn theo kiến trúc truy xuất học liệu (RAG): mọi câu trả lời đều được tổng hợp từ nguồn đã kiểm duyệt và có thể kiểm chứng."
      >
        <ButtonLink href="/register">Dùng thử trợ lý AI</ButtonLink>
        <ButtonLink href="/sources" variant="secondary">
          Xem nguồn tri thức
        </ButtonLink>
      </PageHero>

      <Section tone="white">
        <SectionHeading eyebrow="Cách hoạt động" title="Bốn bước tạo nên một câu trả lời đáng tin cậy" />
        <ol className="mt-12 grid gap-8 md:mt-16 md:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((step, i) => (
            <li key={step.title} className="border-t-2 border-[#1E3F82] pt-6">
              <span className="text-sm font-semibold tabular-nums text-[#1E3F82]">Bước {i + 1}</span>
              <h3 className="mt-3 text-xl font-bold text-[#0F2258]">{step.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="muted">
        <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Trả lời trong ngữ cảnh"
              title="Hỏi ngay tại nội dung đang học"
              lead="Trợ lý hiểu mô hình hoặc phần nội dung bạn đang xem, trả lời bằng tiếng Việt và làm nổi bật các thành phần được nhắc tới."
            />
            <div className="mt-8">
              <CheckList
                items={[
                  'Trích dẫn đánh số, mở được tới đoạn học liệu gốc',
                  'Gợi ý câu hỏi tiếp theo phù hợp với tiến độ',
                  'Câu hỏi kiểm tra nhanh ngay sau câu trả lời',
                ]}
              />
            </div>
          </div>
          <CitationCard />
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeading dark eyebrow="Nguyên tắc" title="Ba cam kết khi ứng dụng AI vào giáo dục" />
        <ul className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="border-t border-white/15 pt-8">
              <Icon className="h-8 w-8 text-[#8FB1E3]" aria-hidden />
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/70">{text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="white">
        <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-20">
          <ProfileCard />
          <div>
            <SectionHeading
              eyebrow="Cá nhân hóa"
              title="Hồ sơ học tập do bạn kiểm soát"
              lead="Hệ thống ghi nhận mức độ nắm vững, các điểm hay nhầm lẫn và mục tiêu học tập để điều chỉnh câu trả lời và lịch ôn tập."
            />
            <div className="mt-8">
              <CheckList
                items={[
                  'Xem đầy đủ những gì hệ thống ghi nhận về bạn',
                  'Chỉnh sửa mục tiêu và ghi chú dành cho trợ lý',
                  'Đặt lại toàn bộ dữ liệu học tập bất cứ lúc nào',
                ]}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid gap-12 md:grid-cols-2 lg:gap-20">
          <SectionHeading eyebrow="Sử dụng hợp lý" title="Hạn mức hằng ngày để duy trì chất lượng" />
          <p className="text-base leading-relaxed text-slate-600 md:text-lg">
            Mỗi tài khoản có hạn mức sử dụng trợ lý AI theo ngày. Cơ chế này giúp nền tảng duy trì chất lượng phản hồi ổn định và cung cấp miễn
            phí cho nhiều người học. Các câu hỏi phổ biến được phản hồi nhanh từ bộ nhớ đệm đã kiểm chứng.
          </p>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}

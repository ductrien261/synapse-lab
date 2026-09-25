import type { Metadata } from 'next';
import { BoxArrowUpRight } from 'react-bootstrap-icons';
import { Badge, ButtonLink, CheckList, CtaBand, PageHero, Section, SectionHeading } from '@/components/marketing/ui';
import { SOURCES } from '@/lib/marketing';

export const metadata: Metadata = {
  title: 'Nguồn tri thức và tiêu chuẩn nội dung',
  description:
    'Synapse Lab xây dựng nội dung từ học liệu có giấy phép mở như OpenStax, AnatomyTOOL và Sketchfab, với quy trình trích dẫn và kiểm duyệt trước khi xuất bản.',
  alternates: { canonical: '/nguon-tri-thuc' },
};

const WORKFLOW = [
  { title: 'Tuyển chọn học liệu', text: 'Chỉ tiếp nhận học liệu có giấy phép rõ ràng; mỗi tài liệu được lưu kèm tác giả, phiên bản và giấy phép.' },
  { title: 'Soạn thảo có trích dẫn', text: 'Nội dung giải thích được soạn thảo từ các đoạn học liệu liên quan, mỗi ý gắn trích dẫn tới mục cụ thể.' },
  { title: 'Phê duyệt chuyên môn', text: 'Người phụ trách chuyên môn rà soát, chỉnh sửa và phê duyệt trước khi nội dung hiển thị cho người học.' },
  { title: 'Cập nhật liên tục', text: 'Phản hồi của người học được ghi nhận để rà soát và cải thiện nội dung theo thời gian.' },
];

export default function SourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Nguồn tri thức"
        title="Học liệu mở, trích dẫn rõ ràng, kiểm duyệt chặt chẽ"
        lead="Mọi nội dung trên Synapse Lab đều truy được về nguồn gốc. Chúng tôi chỉ sử dụng học liệu có giấy phép phù hợp và ghi công đầy đủ cho tác giả."
      />

      <Section tone="white">
        <SectionHeading eyebrow="Đối tác học liệu" title="Nguồn đang được sử dụng" />
        <ul className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
          {SOURCES.map((s) => (
            <li key={s.name} className="flex flex-col rounded-xl border border-slate-200 p-8">
              <span className="text-sm font-semibold text-slate-500">{s.role}</span>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-[#0F2258]">{s.name}</h3>
              <div className="mt-3">
                <Badge>{s.license}</Badge>
              </div>
              <p className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-600">{s.description}</p>
              <a href={s.url} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#1E3F82] hover:text-[#0F2258]">
                Truy cập nguồn <BoxArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="muted">
        <SectionHeading eyebrow="Quy trình" title="Từ học liệu gốc đến nội dung trên nền tảng" />
        <ol className="mt-12 grid gap-8 md:mt-16 md:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW.map((step, i) => (
            <li key={step.title} className="border-t-2 border-[#1E3F82] pt-6">
              <span className="text-sm font-semibold tabular-nums text-[#1E3F82]">0{i + 1}</span>
              <h3 className="mt-3 text-xl font-bold text-[#0F2258]">{step.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="white">
        <div className="grid gap-12 md:grid-cols-2 lg:gap-20">
          <SectionHeading eyebrow="Tiêu chuẩn" title="Cam kết về chất lượng nội dung" />
          <CheckList
            items={[
              'Mỗi đoạn giải thích có ít nhất một trích dẫn tới học liệu gốc',
              'Ghi rõ tác giả và giấy phép trên từng mô hình 3D',
              'Không xuất bản nội dung chưa qua phê duyệt chuyên môn',
              'Thuật ngữ tiếng Việt được thống nhất trên toàn nền tảng',
            ]}
          />
        </div>
      </Section>

      <Section tone="muted">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 md:p-14">
          <div className="flex items-center gap-3">
            <Badge tone="amber">Sắp ra mắt</Badge>
          </div>
          <SectionHeading
            title="Cộng đồng đóng góp học liệu"
            lead="Giảng viên và người học sẽ có thể chia sẻ học liệu mở lên nền tảng. Mỗi đóng góp được kiểm duyệt, gắn nhãn nguồn gốc và giấy phép trước khi đưa vào kho tri thức chung."
          >
            <ButtonLink href="/gioi-thieu#lien-he" variant="secondary">
              Đăng ký quan tâm
            </ButtonLink>
          </SectionHeading>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}

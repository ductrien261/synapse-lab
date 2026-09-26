import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactLine, LegalPage } from '@/components/marketing/LegalPage';
import { SITE } from '@/lib/marketing';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description: 'Điều khoản sử dụng nền tảng học tập Synapse Lab.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Điều khoản sử dụng"
      updated="26/09/2026"
      intro={
        <p>
          Chào mừng bạn đến với Synapse Lab. Khi truy cập hoặc tạo tài khoản, bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ; nếu không đồng ý,
          bạn vui lòng ngừng sử dụng dịch vụ.
        </p>
      }
      sections={[
        {
          id: 'dich-vu',
          title: 'Dịch vụ',
          body: (
            <p>
              Synapse Lab là nền tảng học tập trực quan gồm mô hình 3D, mô phỏng, trợ lý AI và công cụ ôn tập. Một số tính năng dùng được không cần tài
              khoản; các tính năng cá nhân hóa yêu cầu tài khoản miễn phí. Tính năng có thể được bổ sung, thay đổi hoặc tạm ngừng để bảo trì và cải tiến.
            </p>
          ),
        },
        {
          id: 'tai-khoan',
          title: 'Tài khoản',
          body: (
            <ul>
              <li>Bạn cung cấp thông tin chính xác khi đăng ký và tự bảo mật mật khẩu của mình.</li>
              <li>Mỗi người chỉ sử dụng một tài khoản; không chia sẻ hoặc chuyển nhượng tài khoản.</li>
              <li>Bạn chịu trách nhiệm về hoạt động diễn ra trên tài khoản của mình.</li>
            </ul>
          ),
        },
        {
          id: 'su-dung',
          title: 'Sử dụng hợp lệ',
          body: (
            <>
              <p>Khi sử dụng Synapse Lab, bạn không được:</p>
              <ul>
                <li>Cố ý vượt hạn mức sử dụng, thu thập dữ liệu tự động hoặc gây quá tải hệ thống.</li>
                <li>Tìm cách truy cập trái phép, can thiệp hoặc làm gián đoạn dịch vụ.</li>
                <li>Dùng trợ lý AI để tạo nội dung vi phạm pháp luật, xúc phạm hoặc gây hại.</li>
                <li>Đăng tải nội dung vi phạm quyền sở hữu trí tuệ của người khác.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'noi-dung-ai',
          title: 'Nội dung do AI tạo và giới hạn trách nhiệm chuyên môn',
          body: (
            <>
              <p>
                Trợ lý AI tổng hợp câu trả lời từ học liệu đã kiểm duyệt và luôn kèm trích dẫn, tuy nhiên vẫn có thể có sai sót. Bạn nên đối chiếu với
                nguồn trích dẫn và giáo trình chính thức.
              </p>
              <p>
                <strong>Nội dung trên Synapse Lab chỉ phục vụ mục đích học tập, không phải lời khuyên y khoa, chẩn đoán hay điều trị.</strong> Không sử
                dụng nội dung để đưa ra quyết định liên quan đến sức khỏe của bất kỳ ai.
              </p>
            </>
          ),
        },
        {
          id: 'so-huu-tri-tue',
          title: 'Sở hữu trí tuệ và giấy phép học liệu',
          body: (
            <>
              <p>
                Giao diện, mã nguồn và thương hiệu Synapse Lab thuộc về đội ngũ phát triển. Học liệu bên thứ ba được sử dụng theo giấy phép của từng nguồn
                và được ghi công đầy đủ, ví dụ giáo trình OpenStax theo giấy phép CC BY 4.0; mô hình 3D từ AnatomyTOOL và Sketchfab theo giấy phép ghi
                trên từng mô hình.
              </p>
              <p>
                Ghi chú và góp ý bạn tạo ra thuộc về bạn. Bạn cho phép Synapse Lab lưu trữ và xử lý chúng để cung cấp dịch vụ. Xem chi tiết tại{' '}
                <Link href="/sources">Nguồn tri thức</Link>.
              </p>
            </>
          ),
        },
        {
          id: 'mien-tru',
          title: 'Miễn trừ và giới hạn trách nhiệm',
          body: (
            <p>
              Dịch vụ được cung cấp theo hiện trạng. Trong phạm vi pháp luật cho phép, Synapse Lab không chịu trách nhiệm đối với thiệt hại gián tiếp phát
              sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ, bao gồm việc dựa vào nội dung học tập để đưa ra quyết định chuyên môn.
            </p>
          ),
        },
        {
          id: 'cham-dut',
          title: 'Tạm khóa và chấm dứt',
          body: (
            <p>
              Chúng tôi có thể tạm khóa tài khoản vi phạm điều khoản. Bạn có thể ngừng sử dụng và yêu cầu xóa tài khoản bất cứ lúc nào{' '}
              <ContactLine email={SITE.contactEmail} />.
            </p>
          ),
        },
        {
          id: 'thay-doi',
          title: 'Thay đổi điều khoản',
          body: (
            <p>
              Điều khoản có thể được cập nhật khi sản phẩm thay đổi. Việc tiếp tục sử dụng sau khi cập nhật đồng nghĩa với việc bạn chấp nhận điều khoản
              mới. Xem thêm <Link href="/privacy">Chính sách quyền riêng tư</Link>.
            </p>
          ),
        },
        {
          id: 'luat',
          title: 'Luật áp dụng và liên hệ',
          body: (
            <p>
              Điều khoản được điều chỉnh bởi pháp luật Việt Nam. Mọi thắc mắc vui lòng liên hệ <ContactLine email={SITE.contactEmail} />.
            </p>
          ),
        },
      ]}
    />
  );
}

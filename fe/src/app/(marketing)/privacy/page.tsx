import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactLine, LegalPage } from '@/components/marketing/LegalPage';
import { SITE } from '@/lib/marketing';

export const metadata: Metadata = {
  title: 'Chính sách quyền riêng tư',
  description: 'Cách Synapse Lab thu thập, sử dụng và bảo vệ dữ liệu cá nhân của người dùng.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Chính sách quyền riêng tư"
      updated="26/09/2026"
      intro={
        <p>
          Chính sách này giải thích Synapse Lab thu thập những dữ liệu nào, dùng vào mục đích gì và bạn có những quyền gì đối với dữ liệu của mình.
          Chúng tôi chỉ thu thập dữ liệu cần thiết để cung cấp và cải thiện dịch vụ học tập, và xử lý dữ liệu theo quy định của pháp luật Việt Nam về
          bảo vệ dữ liệu cá nhân.
        </p>
      }
      sections={[
        {
          id: 'du-lieu-thu-thap',
          title: 'Dữ liệu chúng tôi thu thập',
          body: (
            <ul>
              <li>
                <strong>Thông tin tài khoản:</strong> họ tên, email, mật khẩu (được lưu dưới dạng mã hóa một chiều), chuyên ngành bạn chọn.
              </li>
              <li>
                <strong>Dữ liệu học tập:</strong> lịch sử xem nội dung, kết quả ôn tập, mức độ nắm vững, ghi chú, mục tiêu và các cuộc hội thoại với trợ lý
                AI.
              </li>
              <li>
                <strong>Góp ý:</strong> nội dung bạn gửi qua nút Góp ý, trang đang xem và email (nếu bạn cung cấp).
              </li>
              <li>
                <strong>Dữ liệu kỹ thuật:</strong> nhật ký hệ thống cần thiết để vận hành và bảo mật dịch vụ, như thời điểm truy cập và loại trình duyệt.
              </li>
              <li>
                <strong>Dữ liệu phân tích:</strong> chỉ khi bạn đồng ý, chúng tôi ghi nhận cách sử dụng sản phẩm dưới dạng sự kiện ẩn danh (ví dụ: mở mô
                hình, bắt đầu ôn tập). Không ghi lại nội dung bạn nhập và không ghi lại màn hình.
              </li>
            </ul>
          ),
        },
        {
          id: 'muc-dich',
          title: 'Mục đích sử dụng',
          body: (
            <ul>
              <li>Cung cấp tài khoản, lưu tiến độ và đồng bộ dữ liệu học tập của bạn.</li>
              <li>Cá nhân hóa câu trả lời của trợ lý AI và lịch ôn tập theo mức độ nắm vững.</li>
              <li>Phát hiện lỗi, xử lý góp ý và nâng cao chất lượng nội dung.</li>
              <li>Thống kê tổng hợp để cải thiện sản phẩm. Chúng tôi không bán dữ liệu cá nhân và không dùng dữ liệu cho quảng cáo.</li>
            </ul>
          ),
        },
        {
          id: 'ai',
          title: 'Xử lý dữ liệu bởi trí tuệ nhân tạo',
          body: (
            <>
              <p>
                Khi bạn đặt câu hỏi, nội dung câu hỏi, phần học liệu liên quan và thông tin tóm tắt về tiến độ học tập được gửi tới nhà cung cấp mô hình
                ngôn ngữ và dịch vụ tìm kiếm ngữ nghĩa để tạo câu trả lời. Chúng tôi không gửi email hay mật khẩu của bạn trong quá trình này.
              </p>
              <p>
                Vui lòng không nhập thông tin nhạy cảm như thông tin sức khỏe cá nhân vào trợ lý AI. Nội dung trên Synapse Lab chỉ phục vụ mục đích học
                tập.
              </p>
            </>
          ),
        },
        {
          id: 'cookie',
          title: 'Cookie và lưu trữ trên trình duyệt',
          body: (
            <>
              <p>Synapse Lab lưu trên trình duyệt của bạn:</p>
              <ul>
                <li>Mã đăng nhập, để bạn không phải đăng nhập lại mỗi lần truy cập (bắt buộc cho tài khoản).</li>
                <li>Tùy chọn giao diện như trạng thái thu gọn thanh bên và lựa chọn đồng ý đo lường.</li>
                <li>Cookie phân tích, chỉ khi bạn bấm Đồng ý trên thông báo đo lường.</li>
              </ul>
              <p>Bạn có thể xóa dữ liệu trình duyệt bất cứ lúc nào; khi đó bạn sẽ cần đăng nhập lại và chọn lại tùy chọn đo lường.</p>
            </>
          ),
        },
        {
          id: 'luu-tru',
          title: 'Lưu trữ và bảo mật',
          body: (
            <p>
              Dữ liệu được lưu trên hạ tầng máy chủ đám mây, truyền qua kết nối mã hóa và chỉ những thành viên có thẩm quyền mới được truy cập để vận hành
              dịch vụ. Dữ liệu học tập được giữ trong thời gian tài khoản còn hoạt động và được xóa khi bạn yêu cầu xóa tài khoản, trừ trường hợp pháp luật
              yêu cầu lưu giữ.
            </p>
          ),
        },
        {
          id: 'quyen',
          title: 'Quyền của bạn',
          body: (
            <ul>
              <li>Xem và chỉnh sửa hồ sơ học tập tại mục Cài đặt và trang Hồ sơ học tập.</li>
              <li>Đặt lại toàn bộ dữ liệu học tập bất cứ lúc nào.</li>
              <li>Rút lại sự đồng ý đo lường bằng cách xóa dữ liệu trang web trên trình duyệt.</li>
              <li>
                Yêu cầu cung cấp bản sao hoặc xóa toàn bộ dữ liệu và tài khoản <ContactLine email={SITE.contactEmail} />.
              </li>
            </ul>
          ),
        },
        {
          id: 'tre-em',
          title: 'Người dùng dưới 16 tuổi',
          body: <p>Synapse Lab hướng tới sinh viên và người trưởng thành. Người dùng dưới 16 tuổi cần có sự đồng ý của cha mẹ hoặc người giám hộ.</p>,
        },
        {
          id: 'thay-doi',
          title: 'Thay đổi chính sách',
          body: (
            <p>
              Chúng tôi có thể cập nhật chính sách này khi sản phẩm thay đổi. Ngày cập nhật được ghi ở đầu trang; thay đổi quan trọng sẽ được thông báo trong
              ứng dụng. Xem thêm <Link href="/terms">Điều khoản sử dụng</Link>.
            </p>
          ),
        },
        {
          id: 'lien-he',
          title: 'Liên hệ',
          body: (
            <p>
              Mọi câu hỏi về quyền riêng tư, vui lòng liên hệ <ContactLine email={SITE.contactEmail} />.
            </p>
          ),
        },
      ]}
    />
  );
}

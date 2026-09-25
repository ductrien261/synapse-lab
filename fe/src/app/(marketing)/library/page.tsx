import type { Metadata } from 'next';
import { Library } from '@/components/marketing/Library';
import { PageHero } from '@/components/marketing/ui';

export const metadata: Metadata = {
  title: 'Kho học liệu trực quan',
  description:
    'Kho học liệu tương tác của Synapse Lab: mô hình giải phẫu 3D có chú thích và mô phỏng giải thuật từng bước. Dùng thử ngay, không cần đăng ký.',
  alternates: { canonical: '/library' },
};

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <>
      <PageHero
        eyebrow="Kho học liệu"
        title="Học liệu tương tác, sẵn sàng để dùng thử"
        lead="Mở một mô hình giải phẫu 3D hoặc chạy mô phỏng giải thuật ngay trên trình duyệt. Không cần cài đặt, không cần đăng ký."
      />
      <Library initialTab={tab === 'algorithms' ? 'algorithms' : 'models'} />
    </>
  );
}

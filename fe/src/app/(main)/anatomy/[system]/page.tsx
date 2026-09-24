import { redirect } from 'next/navigation';

// Đường dẫn cũ /anatomy/<hệ> -> trang danh sách đã lọc theo hệ
export default async function AnatomySystemRedirect({ params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  redirect(`/anatomy?system=${encodeURIComponent(system)}`);
}

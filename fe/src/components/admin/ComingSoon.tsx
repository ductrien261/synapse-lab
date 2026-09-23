import type { ComponentType } from 'react';
import { AdminPageHeader } from './AdminPageHeader';

/** Trang giữ chỗ cho các mục quản trị chưa làm, kèm danh sách chức năng dự kiến. */
export function ComingSoon({
  title,
  description,
  icon: Icon,
  features,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  features: string[];
}) {
  return (
    <>
      <AdminPageHeader title={title} description={description} />
      <section className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 md:p-10">
        <div className="flex flex-col items-center text-center max-w-lg mx-auto">
          <span className="w-14 h-14 rounded-2xl bg-[#E8F0FB] text-[#1E3F82] flex items-center justify-center">
            <Icon className="w-6 h-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-stone-900">Đang phát triển</h2>
          <p className="text-sm text-stone-500 mt-1">Mục này sẽ có sau khi hoàn thành database schema. Dự kiến gồm:</p>
          <ul className="mt-5 w-full grid gap-2 text-left">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 rounded-xl bg-stone-50 px-4 py-2.5 text-sm text-stone-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1E3F82] shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

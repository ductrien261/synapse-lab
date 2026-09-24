import { PeopleFill } from 'react-bootstrap-icons';

export default function ClassesPage() {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#0F2258] via-[#163070] to-[#1E3F82] text-white p-6 md:p-8">
        <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full bg-[#5B8FD8]/20 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold tracking-wider uppercase text-[#E8F0FB]">
            <PeopleFill className="w-3 h-3" /> Lớp học tương tác
          </span>
          <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">Lớp học</h1>
          <p className="mt-1.5 text-sm text-white/75 max-w-xl">
            Tạo lớp, chia sẻ tài liệu và tổ chức buổi học có AI hỗ trợ.
          </p>
        </div>
      </section>

      <div className="rounded-3xl border-2 border-dashed border-stone-200 bg-white p-10 text-center">
        <p className="text-sm font-semibold text-stone-700">Module lớp học đang được phát triển.</p>
        <p className="text-xs text-stone-500 mt-1">Code nằm trong thư mục app/(main)/classes và app classroom ở backend.</p>
      </div>
    </div>
  );
}

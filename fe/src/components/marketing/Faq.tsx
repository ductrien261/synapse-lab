import { PlusLg } from 'react-bootstrap-icons';

/** Hỏi đáp dạng mở/đóng (thẻ details gốc, không cần JavaScript, tốt cho SEO). */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {items.map((item) => (
        <details key={item.q} className="group rounded-xl border border-slate-200 bg-white px-6 open:shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[17px] font-semibold text-[#0F2258] [&::-webkit-details-marker]:hidden">
            {item.q}
            <PlusLg className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-45" />
          </summary>
          <p className="pb-6 text-base leading-relaxed text-slate-600">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

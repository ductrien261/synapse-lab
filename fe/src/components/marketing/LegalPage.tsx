import type { ReactNode } from 'react';
import { Container } from './ui';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Trang pháp lý: mục lục dính bên trái, nội dung bên phải. */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <>
      <section className="border-b border-slate-200 bg-white py-14 md:py-20">
        <Container>
          <p className="mb-3 text-sm font-semibold text-[#1E3F82]">Pháp lý</p>
          <h1 className="text-4xl font-bold tracking-[-0.03em] text-[#0F2258] md:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-slate-500">Cập nhật lần cuối: {updated}</p>
        </Container>
      </section>
      <section className="bg-white py-12 md:py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-16">
            <nav aria-label="Mục lục" className="hidden lg:block">
              <ol className="sticky top-28 flex flex-col gap-2 border-l border-slate-200 text-sm">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1 pl-4 text-slate-500 hover:border-[#1E3F82] hover:text-[#0F2258]">
                      {i + 1}. {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <article className="max-w-3xl text-[15px] leading-relaxed text-slate-700 md:text-base [&_a]:font-semibold [&_a]:text-[#1E3F82] [&_li]:mt-2 [&_p]:mt-4 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
              <div className="rounded-xl bg-[#F4F7FC] p-5 [&>p:first-child]:mt-0">{intro}</div>
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-28 pt-10">
                  <h2 className="text-2xl font-bold tracking-tight text-[#0F2258]">
                    {i + 1}. {s.title}
                  </h2>
                  {s.body}
                </section>
              ))}
            </article>
          </div>
        </Container>
      </section>
    </>
  );
}

export function ContactLine({ email }: { email: string }) {
  return email ? (
    <>
      qua email <a href={`mailto:${email}`}>{email}</a> hoặc nút Góp ý trên mọi trang
    </>
  ) : (
    <>qua nút Góp ý hiển thị ở góc dưới mọi trang</>
  );
}

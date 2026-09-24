'use client';

import { BookHalf, BoxArrowUpRight, ClipboardPulse, InfoCircleFill, Lightning, PinMapFill } from 'react-bootstrap-icons';
import type { ReactNode } from 'react';
import { TranslatableText } from './TranslatableText';
import type { PartItem } from './types';

function pageLabel(start: number | null, end: number | null) {
  if (start == null) return '';
  return end && end !== start ? `tr. ${start}–${end}` : `tr. ${start}`;
}

/** Tab "Thông tin": kiến thức về bộ phận đang chọn. Mục nào chưa có dữ liệu thì ẩn. */
export function InfoTab({ part }: { part: PartItem | null }) {
  if (!part) {
    return (
      <EmptyHint
        icon={<PinMapFill className="w-5 h-5" />}
        title="Chọn một bộ phận"
        text="Bấm vào các số trên mô hình 3D hoặc chọn ở thanh bên dưới."
      />
    );
  }

  const s = part.structure;
  const published = Boolean(s?.published);
  const hasAny = published && Boolean(s?.definition || s?.function || s?.clinical_note || s?.references?.length);

  return (
    <div className="flex flex-col gap-5 p-5">
      {s?.latin_name && <p className="text-xs text-stone-500 -mt-2">Tên Latin: {s.latin_name}</p>}

      {published && s?.definition && <Section icon={<InfoCircleFill className="w-3.5 h-3.5" />} title="Định nghĩa" body={s.definition} />}
      {published && s?.function && <Section icon={<Lightning className="w-3.5 h-3.5" />} title="Chức năng" body={s.function} />}
      {published && s?.clinical_note && (
        <Section icon={<ClipboardPulse className="w-3.5 h-3.5" />} title="Liên hệ lâm sàng" body={s.clinical_note} />
      )}
      {published && s?.references && s.references.length > 0 && (
        <div>
          <SectionTitle icon={<BookHalf className="w-3.5 h-3.5" />} title="Giáo trình" />
          <ul className="mt-2 flex flex-col gap-2">
            {s.references.map((r) => (
              <li key={r.id} className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5 text-sm">
                <div className="flex items-start gap-2">
                  {r.order > 0 && <span className="font-bold text-[#1E3F82] shrink-0">[{r.order}]</span>}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-stone-800">
                      {r.document_title}
                      {pageLabel(r.page_start, r.page_end) && !r.url && (
                        <span className="ml-1.5 text-[#1E3F82]">{pageLabel(r.page_start, r.page_end)}</span>
                      )}
                    </div>
                    {r.heading && <div className="text-xs text-stone-500 mt-0.5">{r.heading}</div>}
                    {r.excerpt && <p className="text-stone-600 mt-1 line-clamp-3">“{r.excerpt}”</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1E3F82] hover:underline">
                          Đọc trong sách <BoxArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                      {r.license_name && <span className="text-stone-400">{r.license_name}</span>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasAny && (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-[#F9FBFF] px-4 py-3 text-sm text-stone-600">
          Nội dung tiếng Việt đã duyệt cho bộ phận này đang được biên soạn.
        </div>
      )}

      {part.rawContent && (
        <div className="rounded-2xl border border-stone-100 p-4">
          <div className="text-xs font-bold text-stone-700 mb-2">Mô tả của tác giả mô hình</div>
          <TranslatableText key={part.index} text={part.rawContent} />
        </div>
      )}
    </div>
  );
}

export function EmptyHint({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <span className="w-12 h-12 rounded-2xl bg-[#E8F0FB] text-[#1E3F82] flex items-center justify-center">{icon}</span>
      <p className="mt-3 text-sm font-bold text-stone-800">{title}</p>
      <p className="text-sm text-stone-500 mt-1">{text}</p>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1E3F82]">
      {icon}
      {title}
    </div>
  );
}

function Section({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div>
      <SectionTitle icon={icon} title={title} />
      <p className="mt-1.5 text-sm text-stone-700 leading-relaxed whitespace-pre-line">{body}</p>
    </div>
  );
}

'use client';

import { Fragment, type ReactNode } from 'react';
import type { TutorCitation } from '@/lib/tutor';

const CITE = /(\[\d{1,2}\])/g;

/** In đậm **...** và biến [n] thành nút trích dẫn. */
function inline(text: string, citations: TutorCitation[], onCite: (c: TutorCitation) => void): ReactNode[] {
  return text.split(CITE).flatMap((piece, i) => {
    const m = piece.match(/^\[(\d{1,2})\]$/);
    if (m) {
      const c = citations.find((x) => x.n === Number(m[1]));
      if (!c) return [];
      return [
        <button
          key={`c${i}`}
          type="button"
          onClick={() => onCite(c)}
          title={c.heading}
          className="align-super text-[10px] font-bold text-[#1E3F82] bg-[#E8F0FB] hover:bg-[#1E3F82] hover:text-white rounded px-1 mx-0.5 cursor-pointer"
        >
          {c.n}
        </button>,
      ];
    }
    return piece.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith('**') && seg.endsWith('**') ? (
        <strong key={`b${i}-${j}`} className="font-semibold text-stone-900">
          {seg.slice(2, -2)}
        </strong>
      ) : (
        <Fragment key={`t${i}-${j}`}>{seg}</Fragment>
      ),
    );
  });
}

/** Hiển thị câu trả lời: đoạn văn, gạch đầu dòng, in đậm, số trích dẫn bấm được. */
export function RichText({ text, citations, onCite }: { text: string; citations: TutorCitation[]; onCite: (c: TutorCitation) => void }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul${blocks.length}`} className="list-disc pl-5 flex flex-col gap-1">
          {list.map((li, i) => (
            <li key={i}>{inline(li, citations, onCite)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^([-*•]|\d+\.)\s+(.*)$/);
    if (bullet) {
      list.push(bullet[2]);
      continue;
    }
    flush();
    if (line) blocks.push(<p key={`p${blocks.length}`}>{inline(line.replace(/^#+\s*/, ''), citations, onCite)}</p>);
  }
  flush();
  return <div className="flex flex-col gap-2 text-sm leading-relaxed text-stone-700">{blocks}</div>;
}

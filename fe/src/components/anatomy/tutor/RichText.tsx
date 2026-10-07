'use client';

import { Fragment, type ReactNode } from 'react';

const CITE = /(\[\d{1,2}\])/g;

/** Nguồn tối thiểu để hiển thị số trích dẫn (dùng chung cho gia sư và ôn tập). */
export interface CiteLike {
  n: number;
  heading: string;
}

/** In đậm **...** và biến [n] thành nút trích dẫn. */
function inline<C extends CiteLike>(text: string, citations: C[], onCite: (c: C) => void): ReactNode[] {
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
export function RichText<C extends CiteLike>({ text, citations, onCite, highlightQuestion = false }: { text: string; citations: C[]; onCite: (c: C) => void; highlightQuestion?: boolean }) {
  if (highlightQuestion) {
    const heading = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?Câu hỏi[ \t]*:[ \t]*(?:\*\*)?/im.exec(text);
    if (heading) {
      const questionStart = heading.index + heading[0].length;
      const answer = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?(?:Giải thích đáp án|Đáp án|Lời giải)[ \t]*:[ \t]*(?:\*\*)?/im.exec(text.slice(questionStart));
      const answerStart = answer ? questionStart + answer.index : text.length;
      const before = text.slice(0, heading.index).trim();
      const question = text.slice(questionStart, answerStart).trim();
      const after = text.slice(answerStart).trim();
      return (
        <div className="flex flex-col gap-3">
          {before && <RichText text={before} citations={citations} onCite={onCite} />}
          <section className="rounded-xl border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 px-3 py-3" aria-label="Câu hỏi tình huống">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-900">Câu hỏi cần trả lời</div>
            {question && <RichText text={question} citations={citations} onCite={onCite} />}
          </section>
          {after && <RichText text={after} citations={citations} onCite={onCite} />}
        </div>
      );
    }
  }
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

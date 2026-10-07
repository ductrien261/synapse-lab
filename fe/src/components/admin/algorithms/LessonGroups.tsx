'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { ChevronDown, CodeSlash, PencilSquare } from 'react-bootstrap-icons';
import type { AlgorithmCategory } from '@/lib/algorithm-api';
import { completion, LESSON_FIELDS, type Drafts } from './drafts';

interface Props {
  groups: AlgorithmCategory[];
  drafts: Drafts;
  initiallyExpanded: boolean;
}

export function LessonGroups({ groups, drafts, initiallyExpanded }: Props) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_64px_32px] items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400 sm:grid-cols-[minmax(0,1fr)_100px_120px_32px]">
        <span>Nhóm thuật toán</span><span className="text-center">Bài học</span><span className="hidden text-center sm:block">Bản nháp</span><span />
      </div>
      <div className="divide-y divide-stone-100 border-t border-stone-100">
      {groups.map((group) => (
        <LessonGroup key={group.key} group={group} drafts={drafts} initiallyExpanded={initiallyExpanded} />
      ))}
      </div>
    </div>
  );
}

function LessonGroup({ group, drafts, initiallyExpanded }: { group: AlgorithmCategory; drafts: Drafts; initiallyExpanded: boolean }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const panelId = useId();
  const draftCount = group.algorithms.filter((algorithm) => drafts[`${group.key}/${algorithm.key}`] && drafts[`${group.key}/${algorithm.key}`].status !== 'published').length;

  return (
    <section>
      <h3>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
          className={`grid w-full grid-cols-[minmax(0,1fr)_64px_32px] items-center gap-3 px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1E3F82] sm:grid-cols-[minmax(0,1fr)_100px_120px_32px] ${expanded ? 'bg-[#F4F7FC]' : 'hover:bg-stone-50'}`}
        >
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-stone-900">{group.name}</span>
            <span className="text-xs font-normal text-stone-400">{group.name}</span>
          </span>
          <span className="text-center text-sm font-medium tabular-nums text-stone-600">{group.algorithms.length}</span>
          <span className="hidden text-center text-xs font-normal tabular-nums text-stone-500 sm:block">{draftCount > 0 ? `${draftCount} bản nháp` : '—'}</span>
          <ChevronDown className={`mx-auto h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div id={panelId} hidden={!expanded}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-t border-stone-100 text-[11px] font-bold uppercase tracking-wider text-stone-400">
              <tr><th scope="col" className="pl-4 py-3">Bài học</th><th scope="col" className="px-3 py-3">Nhóm thuật toán</th><th scope="col" className="px-3 py-3">Nội dung</th><th scope="col" className="px-3 py-3">Trạng thái</th><th scope="col" className="px-3 py-3 text-right pr-4"><span className="sr-only">Thao tác</span></th></tr>
            </thead>
            <tbody>
              {group.algorithms.map((algorithm) => {
                const path = `${group.key}/${algorithm.key}`;
                const draft = drafts[path];
                const filled = completion(draft);
                return (
                  <tr key={path} className="border-t border-stone-100 hover:bg-[#F9FBFF]">
                    <td className="pl-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex w-16 h-11 shrink-0 items-center justify-center rounded-lg bg-[#E8F0FB] text-[#1E3F82]"><CodeSlash className="w-5 h-5" /></span>
                        <div>
                          <Link href={`/admin/algorithms/${path}`} className="font-semibold text-stone-900 hover:text-[#1E3F82]">{draft?.title || algorithm.name}</Link>
                          <p className="mt-1 max-w-64 truncate text-xs text-stone-400">{algorithm.key}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5 text-stone-700"><span className="w-2 h-2 rounded-full bg-[#1E3F82]" />{group.name}</span></td>
                    <td className="px-3 py-3 min-w-[130px]">
                      {draft ? <><div className="text-xs text-stone-600 mb-1">{filled}/{LESSON_FIELDS.length} mục nội dung</div><div className="h-1.5 rounded-full bg-stone-100 overflow-hidden"><div className="h-full bg-[#1E3F82]" style={{ width: `${filled / LESSON_FIELDS.length * 100}%` }} /></div></> : <span className="text-xs text-stone-400">Chưa có nội dung nháp</span>}
                    </td>
                    <td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap text-xs font-bold px-2.5 py-1 rounded-full ${draft?.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{draft?.status === 'published' ? 'Đã xuất bản' : draft ? 'Nháp' : 'Chưa có bản nháp'}</span></td>
                    <td className="px-3 py-3 pr-4 text-right"><Link href={`/admin/algorithms/${path}`} className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82]"><PencilSquare className="w-3.5 h-3.5" /> Soạn</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

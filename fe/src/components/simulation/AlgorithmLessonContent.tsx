'use client';

import { useId, useState } from 'react';
import { ArrowRight, Lightbulb, PencilSquare } from 'react-bootstrap-icons';
import { AlgorithmApplications } from './AlgorithmApplications';
import { AlgorithmPracticePanel } from './AlgorithmPracticePanel';
import type { AlgorithmContentDto } from '@/lib/algorithm-api';
import { lessonImageUrl } from './lesson-image';

export function AlgorithmLessonContent({ content }: { content: AlgorithmContentDto }) {
  const [applicationsOpen, setApplicationsOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const applicationsPanelId = useId();
  const practicePanelId = useId();
  const applications = content.lesson_fields?.applications
    || (Array.isArray(content.applications) ? content.applications.join('\n') : '');
  const scenarios = content.application_scenarios ?? [];
  const blocks = content.lesson_blocks ?? [];
  const exercises = blocks.filter(block => block.kind !== 'theory' && Boolean(lessonImageUrl(block)));
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="flex flex-col rounded-2xl border border-[#DDE6F5] bg-white p-5">
        <PencilSquare className="mb-3 h-5 w-5 text-[#1E3F82]" />
        <h2 className="text-sm font-bold text-[#243355]">Luyện tập ngay</h2>
        <p className="mb-5 mt-2 flex-1 text-xs leading-6 text-stone-500">Vận dụng kiến thức qua câu hỏi và hình minh họa.</p>
        <button type="button" disabled={!exercises.length} aria-expanded={practiceOpen} aria-controls={practicePanelId} onClick={() => setPracticeOpen(open => !open)} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#1E3F82] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#163070] disabled:opacity-40">{!exercises.length ? 'Chưa có bài tập' : practiceOpen ? 'Thu gọn' : 'Luyện tập'}<ArrowRight /></button>
      </section>
      <section className="flex flex-col rounded-2xl border border-[#D9E69B] bg-[#F8FAEC] p-5">
        <Lightbulb className="mb-3 h-5 w-5 text-[#1E3F82]" />
        <h2 className="text-sm font-bold text-[#243355]">Ứng dụng thực tế</h2>
        <p className="mb-5 mt-2 flex-1 text-xs leading-6 text-stone-500">Khám phá cách áp dụng thuật toán và những điều cần lưu ý.</p>
        <button type="button" disabled={!scenarios.length && !applications.trim()} aria-expanded={applicationsOpen} aria-controls={applicationsPanelId} onClick={() => setApplicationsOpen(open => !open)} className="inline-flex items-center gap-2 self-start rounded-xl border border-[#1E3F82]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#1E3F82] transition-colors hover:bg-[#E8F0FB] disabled:opacity-40">{applicationsOpen ? 'Thu gọn' : 'Tìm hiểu ngay'}<ArrowRight /></button>
      </section>
    </div>
    {practiceOpen && <div id={practicePanelId}><AlgorithmPracticePanel exercises={exercises} /></div>}
    {applicationsOpen && <section id={applicationsPanelId} className="rounded-2xl border border-[#D9E69B] bg-white p-5">{scenarios.length ? <AlgorithmApplications scenarios={scenarios} /> : <><h3 className="text-sm font-bold text-[#243355]">Ứng dụng thực tế & lưu ý</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-600">{applications}</p></>}</section>}
  </div>;
}

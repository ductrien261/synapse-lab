'use client';

import { useEffect, useRef, useState } from 'react';
import { CardChecklist, ChevronRight, FileEarmarkText, Lightbulb, PatchQuestion, Stars, X } from 'react-bootstrap-icons';
import { classroomApi, type PresentationResource } from './classroom-api';

const tools = [
  {
    id: 'quiz',
    title: 'Trắc nghiệm nhanh',
    description: 'Câu hỏi kiểm tra kiến thức ngay trong lớp.',
    detail: 'Tạo bộ câu hỏi từ chủ đề hoặc tài liệu đang dạy, rồi cho cả lớp cùng trả lời.',
    icon: PatchQuestion,
    color: 'bg-violet-100 text-violet-700',
    example: '5 câu hỏi · 4 đáp án · Kết quả tức thì',
  },
  {
    id: 'exercise',
    title: 'Bài tập thực hành',
    description: 'Nhiệm vụ để học viên luyện tập sau bài giảng.',
    detail: 'Soạn bài tập theo mức độ và chủ đề, kèm hướng dẫn để học viên tự làm.',
    icon: CardChecklist,
    color: 'bg-blue-100 text-blue-700',
    example: 'Mục tiêu · Đề bài · Gợi ý làm bài',
  },
  {
    id: 'questions',
    title: 'Gợi ý câu hỏi',
    description: 'Câu hỏi mở để dẫn dắt thảo luận.',
    detail: 'Gợi ý câu hỏi theo nội dung bài học để giáo viên tương tác với cả lớp.',
    icon: Lightbulb,
    color: 'bg-amber-100 text-amber-700',
    example: 'Khởi động · Thảo luận · Vận dụng',
  },
  {
    id: 'summary',
    title: 'Tóm tắt bài học',
    description: 'Ý chính và nội dung cần ôn tập.',
    detail: 'Phác thảo phần tổng kết ngắn gọn dựa trên tài liệu giáo viên chọn.',
    icon: FileEarmarkText,
    color: 'bg-emerald-100 text-emerald-700',
    example: 'Ý chính · Thuật ngữ · Việc cần nhớ',
  },
] as const;

type ToolId = (typeof tools)[number]['id'];

export function ClassroomAiPanel({ roomCode, open, onClose }: { roomCode: string; open: boolean; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState<ToolId>('quiz');
  const [quizzes, setQuizzes] = useState<PresentationResource[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const selected = tools.find((tool) => tool.id === selectedId) ?? tools[0];
  const loading = !loaded;

  useEffect(() => {
    if (!open || selectedId !== 'quiz') return;
    let active = true;
    classroomApi.presentation(roomCode).then((state) => {
      if (!active) return;
      const available = state.resources.filter((item) => item.kind === 'quiz');
      setIsModerator(state.is_moderator);
      setQuizzes(available);
      setError('');
      setSelectedQuizId((current) => available.some((item) => item.id === current) ? current : available[0]?.id ?? null);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải trắc nghiệm.');
    }).finally(() => {
      if (active) setLoaded(true);
    });
    return () => { active = false; };
  }, [open, roomCode, selectedId]);

  const startQuiz = async () => {
    if (!selectedQuizId || pending) return;
    setPending(true);
    setError('');
    try {
      await classroomApi.presentationAction(roomCode, { action: 'start_quiz', resource_id: selectedQuizId });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể phát trắc nghiệm.');
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return <>
    <button type="button" aria-label="Đóng công cụ AI" onClick={onClose} className="absolute inset-0 z-20 bg-black/45" />
    <aside id="classroom-ai-panel" role="dialog" aria-modal="true" aria-labelledby="classroom-ai-title" className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[560px] flex-col overflow-y-auto bg-[#F6F7FB] text-stone-900 shadow-2xl sm:w-[min(560px,92vw)]">
      <div className="flex items-start justify-between gap-3 border-b border-violet-100 bg-white px-5 py-5">
        <div><div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700"><Stars size={13} /> Công cụ lớp học</div><h2 id="classroom-ai-title" className="text-lg font-extrabold">Công cụ AI cho lớp học</h2><p className="mt-1 text-xs leading-5 text-stone-500">Chọn nội dung để tương tác ngay trong buổi học.</p></div>
        <button ref={closeRef} type="button" aria-label="Đóng bảng công cụ AI" onClick={onClose} className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-violet-600"><X size={18} /></button>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const active = selected.id === tool.id;
          return <button key={tool.id} type="button" aria-pressed={active} onClick={() => setSelectedId(tool.id)} className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-violet-600 ${active ? 'border-violet-400 ring-2 ring-violet-100' : 'border-stone-200 hover:border-violet-200'}`}>
            <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tool.color}`}><Icon size={18} /></span>
            <span className="block text-sm font-bold">{tool.title}</span>
            <span className="mt-1 block text-xs leading-5 text-stone-500">{tool.description}</span>
          </button>;
        })}
      </div>

      {selectedId === 'quiz' ? <div className="mx-4 mb-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:mx-5">
        <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Trắc nghiệm đã soạn</p><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">Phát cho lớp</span></div>
        <p className="mt-2 text-xs leading-5 text-stone-500">Chọn quiz từ Xưởng thiết kế bài dạy. Người học sẽ thấy câu hỏi bật ở giữa màn hình lớp.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
        {loading ? <p role="status" className="mt-4 text-sm text-stone-500">Đang tải trắc nghiệm…</p> : isModerator === false ? <p className="mt-4 text-sm text-stone-500">Giáo viên sẽ chọn và phát trắc nghiệm cho lớp.</p> : quizzes.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-stone-200 p-4 text-sm text-stone-500">Lớp chưa có trắc nghiệm. Hãy tạo quiz trong Xưởng thiết kế bài dạy.</p> : <div className="mt-4 grid gap-2">{quizzes.map((quiz) => <button key={quiz.id} type="button" aria-pressed={selectedQuizId === quiz.id} onClick={() => setSelectedQuizId(quiz.id)} className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-violet-600 ${selectedQuizId === quiz.id ? 'border-violet-500 bg-violet-50 text-violet-900' : 'border-stone-200 hover:border-violet-200'}`}><span className="min-w-0 truncate">{quiz.title}</span><span className="shrink-0 text-[11px] font-normal text-stone-500">{quiz.section_title}</span></button>)}</div>}
        {isModerator && quizzes.length > 0 && <button type="button" disabled={!selectedQuizId || pending} onClick={() => void startQuiz()} className="mt-4 w-full rounded-lg bg-violet-700 px-4 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50">{pending ? 'Đang phát…' : 'Phát trắc nghiệm cho lớp'}</button>}
      </div> : <div className="mx-4 mb-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:mx-5">
        <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Xem trước công cụ</p><span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-500">Sắp có</span></div>
        <h3 className="mt-3 text-base font-extrabold">{selected.title}</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">{selected.detail}</p>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#F5F6FA] px-3 py-3 text-xs font-medium text-stone-600"><ChevronRight className="shrink-0 text-violet-600" />{selected.example}</div>
      </div>}
    </aside>
  </>;
}

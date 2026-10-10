'use client';

import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { QuestionResultsCard } from './InteractiveQuestionResults';

export type QuestionKind = 'multiple_choice' | 'poll' | 'true_false';
export type QuestionDraft = {
  kind: QuestionKind;
  question: string;
  options: string[];
  correctOption: number | null;
  durationSeconds: number;
};
export type LiveQuestionDeck = { id: string; startedAt: number; questions: QuestionDraft[] };
export type LiveQuestionResults = { deck: LiveQuestionDeck; counts: number[][] };

export const QUESTION_TOPIC = 'synapse.demo.question.v1';
export const ANSWER_TOPIC = 'synapse.demo.answer.v1';
export const RESULTS_TOPIC = 'synapse.demo.results.v1';

const multipleChoiceExamples: QuestionDraft[] = [
  {
    kind: 'multiple_choice',
    question: 'Buồng tim nào bơm máu giàu oxy vào động mạch chủ?',
    options: ['Tâm thất trái', 'Tâm thất phải', 'Tâm nhĩ trái', 'Tâm nhĩ phải'],
    correctOption: 0,
    durationSeconds: 60,
  },
  {
    kind: 'multiple_choice',
    question: 'Máu từ tâm thất phải đi đến cơ quan nào để trao đổi khí?',
    options: ['Phổi', 'Gan', 'Thận', 'Não'],
    correctOption: 0,
    durationSeconds: 60,
  },
  {
    kind: 'multiple_choice',
    question: 'Van nào nằm giữa tâm nhĩ trái và tâm thất trái?',
    options: ['Van hai lá', 'Van ba lá', 'Van động mạch phổi', 'Van động mạch chủ'],
    correctOption: 0,
    durationSeconds: 60,
  },
  {
    kind: 'multiple_choice',
    question: 'Buồng tim nào nhận máu giàu oxy từ tĩnh mạch phổi?',
    options: ['Tâm nhĩ trái', 'Tâm nhĩ phải', 'Tâm thất trái', 'Tâm thất phải'],
    correctOption: 0,
    durationSeconds: 60,
  },
  {
    kind: 'multiple_choice',
    question: 'Chức năng chính của van tim là gì?',
    options: ['Giúp máu chảy một chiều', 'Tạo hồng cầu', 'Trao đổi oxy', 'Điều hòa thân nhiệt'],
    correctOption: 0,
    durationSeconds: 60,
  },
];

const examples: Record<Exclude<QuestionKind, 'multiple_choice'>, QuestionDraft> = {
  poll: {
    kind: 'poll',
    question: 'Phần nào của bài học Tim bạn muốn ôn lại kỹ hơn?',
    options: ['Cấu tạo bốn buồng tim', 'Đường đi của máu', 'Các van tim', 'Hoạt động điện của tim'],
    correctOption: null,
    durationSeconds: 90,
  },
  true_false: {
    kind: 'true_false',
    question: 'Tâm thất phải bơm máu lên phổi để trao đổi khí.',
    options: ['Đúng', 'Sai'],
    correctOption: 0,
    durationSeconds: 45,
  },
};

const topicSuggestions = ['Cấu tạo tim', 'Đường đi của máu', 'Các van tim'];
const exampleQuestion = (question: string, options: string[], correctOption: number): QuestionDraft => ({
  kind: 'multiple_choice', question, options, correctOption, durationSeconds: 60,
});

const bloodFlowExamples: QuestionDraft[] = [
  exampleQuestion('Máu từ cơ thể trở về buồng tim nào trước tiên?', ['Tâm nhĩ phải', 'Tâm nhĩ trái', 'Tâm thất phải', 'Tâm thất trái'], 0),
  exampleQuestion('Tâm thất phải bơm máu vào mạch nào?', ['Động mạch phổi', 'Động mạch chủ', 'Tĩnh mạch phổi', 'Tĩnh mạch chủ'], 0),
  exampleQuestion('Máu giàu oxy từ phổi trở về tim qua mạch nào?', ['Tĩnh mạch phổi', 'Động mạch phổi', 'Tĩnh mạch chủ', 'Động mạch chủ'], 0),
  exampleQuestion('Tâm thất trái đẩy máu vào mạch nào để nuôi cơ thể?', ['Động mạch chủ', 'Động mạch phổi', 'Tĩnh mạch phổi', 'Tĩnh mạch chủ'], 0),
  exampleQuestion('Thứ tự nào đúng với vòng tuần hoàn phổi?', ['Tâm thất phải → phổi → tâm nhĩ trái', 'Tâm thất trái → phổi → tâm nhĩ phải', 'Tâm nhĩ phải → động mạch chủ → phổi', 'Tâm nhĩ trái → tĩnh mạch chủ → phổi'], 0),
];

const valveExamples: QuestionDraft[] = [
  exampleQuestion('Van ba lá nằm giữa hai buồng tim nào?', ['Tâm nhĩ phải và tâm thất phải', 'Tâm nhĩ trái và tâm thất trái', 'Hai tâm nhĩ', 'Hai tâm thất'], 0),
  exampleQuestion('Van hai lá nằm giữa hai buồng tim nào?', ['Tâm nhĩ trái và tâm thất trái', 'Tâm nhĩ phải và tâm thất phải', 'Tâm thất phải và động mạch phổi', 'Tâm thất trái và động mạch chủ'], 0),
  exampleQuestion('Van động mạch phổi nằm ở lối ra của buồng tim nào?', ['Tâm thất phải', 'Tâm thất trái', 'Tâm nhĩ phải', 'Tâm nhĩ trái'], 0),
  exampleQuestion('Van động mạch chủ nằm giữa những cấu trúc nào?', ['Tâm thất trái và động mạch chủ', 'Tâm thất phải và động mạch phổi', 'Tâm nhĩ trái và tâm thất trái', 'Tâm nhĩ phải và tâm thất phải'], 0),
  exampleQuestion('Vai trò chính của các van tim là gì?', ['Giữ dòng máu đi một chiều', 'Tạo tế bào máu', 'Trao đổi khí ở phổi', 'Tạo xung điện cho tim'], 0),
];

type TopicCategory = 'heart' | 'blood' | 'valves' | 'custom';
function topicCategory(topic: string): TopicCategory {
  const value = topic.toLocaleLowerCase('vi');
  if (value.includes('van')) return 'valves';
  if (/máu|mạch|tuần hoàn/.test(value)) return 'blood';
  if (/tim|buồng|tâm nhĩ|tâm thất/.test(value)) return 'heart';
  return 'custom';
}

function makeDrafts(kind: QuestionKind, count: number, topic: string): QuestionDraft[] {
  const category = topicCategory(topic);
  if (kind === 'multiple_choice') {
    const bank = category === 'valves' ? valveExamples : category === 'blood' ? bloodFlowExamples : category === 'heart' ? multipleChoiceExamples : [];
    if (bank.length) return bank.slice(0, count).map((item) => ({ ...item, options: [...item.options] }));
    return Array.from({ length: count }, (_, index) => exampleQuestion(index === 0 && topic.endsWith('?') ? topic : `Câu ${index + 1} về ${topic}`, ['', '', '', ''], 0));
  }
  if (category === 'custom') return [{
    kind,
    question: kind === 'poll' ? `Bạn muốn tìm hiểu thêm điều gì về ${topic}?` : topic.endsWith('?') ? '' : topic,
    options: kind === 'poll' ? ['Khái niệm', 'Ví dụ minh họa', 'Ứng dụng thực tế', 'Bài tập ôn luyện'] : ['Đúng', 'Sai'],
    correctOption: kind === 'poll' ? null : 0,
    durationSeconds: kind === 'poll' ? 90 : 45,
  }];
  if (category === 'blood') return [kind === 'poll'
    ? { ...examples.poll, question: 'Phần nào của đường đi của máu bạn muốn ôn lại?', options: ['Máu về tim', 'Máu lên phổi', 'Máu về từ phổi', 'Máu đi nuôi cơ thể'] }
    : { ...examples.true_false, question: 'Máu giàu oxy từ phổi trở về tâm nhĩ trái qua tĩnh mạch phổi.' }];
  if (category === 'valves') return [kind === 'poll'
    ? { ...examples.poll, question: 'Bạn muốn ôn lại van tim nào?', options: ['Van ba lá', 'Van hai lá', 'Van động mạch phổi', 'Van động mạch chủ'] }
    : { ...examples.true_false, question: 'Van hai lá nằm giữa tâm nhĩ trái và tâm thất trái.' }];
  return [{ ...examples[kind], options: [...examples[kind].options] }];
}

export const questionKindLabel: Record<QuestionKind, string> = {
  multiple_choice: 'Trắc nghiệm',
  poll: 'Khảo sát ý kiến',
  true_false: 'Đúng / Sai',
};

export function isLiveQuestionDeck(value: unknown): value is LiveQuestionDeck {
  if (!value || typeof value !== 'object') return false;
  const deck = value as Partial<LiveQuestionDeck>;
  return typeof deck.id === 'string' && deck.id.length > 0
    && typeof deck.startedAt === 'number'
    && Array.isArray(deck.questions) && deck.questions.length >= 1 && deck.questions.length <= 5
    && deck.questions.every(isQuestionDraft);
}

function isLiveQuestionResults(value: unknown): value is LiveQuestionResults {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<LiveQuestionResults>;
  return isLiveQuestionDeck(result.deck) && Array.isArray(result.counts)
    && result.counts.length === result.deck.questions.length
    && result.counts.every((row, index) => Array.isArray(row)
      && row.length === result.deck!.questions[index].options.length
      && row.every((count) => Number.isSafeInteger(count) && count >= 0));
}

function isQuestionDraft(value: unknown): value is QuestionDraft {
  if (!value || typeof value !== 'object') return false;
  const question = value as Partial<QuestionDraft>;
  return (question.kind === 'multiple_choice' || question.kind === 'poll' || question.kind === 'true_false')
    && typeof question.question === 'string' && question.question.length > 0
    && Array.isArray(question.options) && question.options.length >= 2 && question.options.length <= 4
    && question.options.every((option) => typeof option === 'string' && option.length > 0)
    && typeof question.durationSeconds === 'number' && question.durationSeconds > 0;
}

export function QuestionComposer({ onPresent, onDone }: { onPresent: (drafts: QuestionDraft[]) => Promise<void>; onDone: () => void }) {
  const [kind, setKind] = useState<QuestionKind>('multiple_choice');
  const [topic, setTopic] = useState('');
  const [quizCount, setQuizCount] = useState(1);
  const [created, setCreated] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuestionDraft[]>([]);
  const [singleQuestion, setSingleQuestion] = useState<QuestionDraft | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const drafts = kind === 'multiple_choice' ? quizQuestions : singleQuestion ? [singleQuestion] : [];
  const draft = drafts[activeIndex] || drafts[0];
  const valid = drafts.length > 0 && drafts.every((item) => item.question.trim() && item.options.every((option) => option.trim()));

  const updateDraft = (update: (current: QuestionDraft) => QuestionDraft) => {
    if (kind === 'multiple_choice') {
      setQuizQuestions((current) => current.map((item, index) => index === activeIndex ? update(item) : item));
    } else {
      setSingleQuestion((current) => current ? update(current) : current);
    }
  };

  const updateOption = (index: number, value: string) => updateDraft((current) => ({
    ...current,
    options: current.options.map((option, itemIndex) => itemIndex === index ? value : option),
  }));

  return <form onSubmit={async (event) => {
    event.preventDefault();
    if (!created) {
      if (!topic.trim()) return;
      const generated = makeDrafts(kind, quizCount, topic.trim());
      if (kind === 'multiple_choice') setQuizQuestions(generated);
      else setSingleQuestion(generated[0]);
      setActiveIndex(0);
      setCreated(true);
      return;
    }
    if (!valid || pending) return;
    setPending(true);
    setError('');
    try {
      await onPresent(drafts.map((item) => ({ ...item, question: item.question.trim(), options: item.options.map((option) => option.trim()) })));
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa thể trình chiếu câu hỏi.');
    } finally {
      setPending(false);
    }
  }} className="space-y-3">
    <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">Chọn loại câu hỏi, nhập nội dung hoặc chọn gợi ý rồi tạo bản nháp để chỉnh sửa</p>
    {!created && <><div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Loại câu hỏi">
      {(['multiple_choice', 'poll', 'true_false'] as const).map((itemKind) => <button key={itemKind} type="button" onClick={() => { setKind(itemKind); setError(''); }} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${kind === itemKind ? 'border-[#243F88] bg-blue-50 text-[#243F88]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{questionKindLabel[itemKind]}</button>)}
    </div>
    <label className="block text-xs font-semibold text-slate-700">Nội dung muốn tạo câu hỏi
      <textarea rows={3} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ví dụ: Đường đi của máu qua tim, hoặc nhập nội dung Ngân muốn hỏi lớp…" className="mt-1 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm font-normal leading-5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
    </label>
    <div><p className="mb-2 text-xs font-semibold text-slate-500">Gợi ý nhanh</p><div className="flex flex-wrap gap-1.5">{topicSuggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setTopic(suggestion)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${topic === suggestion ? 'border-[#243F88] bg-blue-50 text-[#243F88]' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>{suggestion}</button>)}</div></div>
    {kind === 'multiple_choice' && <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-700">Số câu trắc nghiệm
      <select value={quizCount} onChange={(event) => setQuizCount(Number(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#243F88]">{[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count} câu</option>)}</select>
    </label>}
    <button type="submit" disabled={!topic.trim()} className="w-full rounded-xl bg-[#243F88] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1B326D] disabled:cursor-not-allowed disabled:opacity-50">Tạo ngay</button></>}
    {created && <><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-[#243F88]">{questionKindLabel[kind]} · {drafts.length} câu</p><button type="button" onClick={() => { setCreated(false); setError(''); }} className="text-xs font-semibold text-slate-500 hover:text-[#243F88]">Đổi lựa chọn</button></div>
    {topicCategory(topic) === 'custom' && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Chủ đề này chưa có câu mẫu. Hãy điền câu hỏi, các đáp án và kiểm tra đáp án đúng trước khi trình chiếu.</p>}
    {drafts.length > 1 && <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chọn câu để chỉnh sửa">{drafts.map((_, index) => <button key={index} type="button" onClick={() => setActiveIndex(index)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${activeIndex === index ? 'bg-[#243F88] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>Câu {index + 1}</button>)}</div>}
    <label className="block text-xs font-semibold text-slate-700">Câu hỏi
      <textarea rows={2} value={draft.question} onChange={(event) => updateDraft((current) => ({ ...current, question: event.target.value }))} className="mt-1 w-full resize-y rounded-lg border border-slate-300 p-2.5 text-sm font-normal outline-none focus:border-blue-500" />
    </label>
    <fieldset className="space-y-1.5"><legend className="mb-1 text-xs font-semibold text-slate-700">{draft.kind === 'poll' ? 'Các lựa chọn' : 'Đáp án'}</legend>
      {draft.options.map((option, index) => <label key={`${draft.kind}-${index}`} className="flex items-center gap-2"><span className="w-4 shrink-0 text-xs font-bold text-slate-500">{String.fromCharCode(65 + index)}</span><input value={option} onChange={(event) => updateOption(index, event.target.value)} aria-label={`Lựa chọn ${String.fromCharCode(65 + index)}`} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-sm outline-none focus:border-blue-500" /></label>)}
    </fieldset>
    <div className="grid grid-cols-2 gap-2">
      {draft.kind !== 'poll' && <label className="text-xs font-semibold text-slate-700">Đáp án đúng<select value={draft.correctOption ?? 0} onChange={(event) => updateDraft((current) => ({ ...current, correctOption: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal">{draft.options.map((_, index) => <option key={index} value={index}>{String.fromCharCode(65 + index)}</option>)}</select></label>}
      <label className="text-xs font-semibold text-slate-700">Thời gian trả lời<select value={draft.durationSeconds} onChange={(event) => updateDraft((current) => ({ ...current, durationSeconds: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal"><option value={30}>30 giây</option><option value={45}>45 giây</option><option value={60}>60 giây</option><option value={90}>90 giây</option></select></label>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    <button type="submit" disabled={!valid || pending} className="w-full rounded-xl bg-[#243F88] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1B326D] disabled:opacity-50">{pending ? 'Đang trình chiếu…' : 'Xong và trình chiếu'}</button>
    </>}
  </form>;
}

export function LiveQuestionOverlay({ isModerator }: { isModerator: boolean }) {
  const room = useRoomContext();
  const [deck, setDeck] = useState<LiveQuestionDeck | null>(null);
  const [results, setResults] = useState<LiveQuestionResults | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isModerator) return;
    const receive = (payload: Uint8Array, _participant?: unknown, _kind?: unknown, topic?: string) => {
      if (topic !== QUESTION_TOPIC && topic !== RESULTS_TOPIC) return;
      try {
        const value: unknown = JSON.parse(new TextDecoder().decode(payload));
        if (topic === RESULTS_TOPIC) {
          if (!isLiveQuestionResults(value)) return;
          setDeck(null);
          setResults(value);
          return;
        }
        if (!isLiveQuestionDeck(value)) return;
        setResults(null);
        setDeck(value);
        setQuestionIndex(0);
        setQuestionStartedAt(Date.now());
        setChoice(null);
        setError('');
      } catch { /* Ignore unrelated or malformed room data. */ }
    };
    room.on(RoomEvent.DataReceived, receive);
    return () => { room.off(RoomEvent.DataReceived, receive); };
  }, [room, isModerator]);

  useEffect(() => {
    const question = deck?.questions[questionIndex];
    if (!question) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((questionStartedAt + question.durationSeconds * 1000 - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [deck, questionIndex, questionStartedAt]);

  const question = deck?.questions[questionIndex];
  if (isModerator) return null;
  if (results) return <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
    <section role="dialog" aria-modal="true" aria-label="Kết quả câu hỏi tương tác" className="my-auto w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
      <QuestionResultsCard deck={results.deck} counts={results.counts} />
      <button type="button" onClick={() => setResults(null)} className="mt-5 w-full rounded-xl bg-[#243F88] px-4 py-3 text-sm font-bold text-white hover:bg-[#1B326D]">Về phòng học</button>
    </section>
  </div>;
  if (!deck || !question) return null;

  const advance = () => {
    if (questionIndex + 1 >= deck.questions.length) {
      setDeck(null);
      return;
    }
    setQuestionIndex((current) => current + 1);
    setQuestionStartedAt(Date.now());
    setChoice(null);
    setError('');
  };

  const submit = async () => {
    if (choice === null || pending || remaining <= 0) return;
    setPending(true);
    setError('');
    try {
      const answer = { deckId: deck.id, questionIndex, selectedOption: choice };
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(answer)), { reliable: true, topic: ANSWER_TOPIC });
      advance();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa gửi được câu trả lời.');
    } finally {
      setPending(false);
    }
  };

  return <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
    <form role="dialog" aria-modal="true" aria-labelledby="live-question-title" onSubmit={(event) => { event.preventDefault(); void submit(); }} className="my-auto w-full max-w-[500px] rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 shadow-[0_12px_40px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3 text-xs font-semibold"><span className="text-[#243F88]">{questionKindLabel[question.kind]}{deck.questions.length > 1 ? ` · Câu ${questionIndex + 1}/${deck.questions.length}` : ''}</span><span className={remaining <= 10 ? 'text-rose-600' : 'text-stone-500'}>Còn {remaining} giây</span></div>
      <h2 id="live-question-title" className="mb-5 text-base font-bold leading-7 sm:text-lg">{question.question}</h2>
      <fieldset disabled={pending || remaining <= 0} className="grid gap-2.5"><legend className="sr-only">Chọn câu trả lời</legend>
        {question.options.map((option, index) => <label key={index} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm leading-6 ${choice === index ? 'border-[#243F88] bg-blue-50' : 'border-stone-200 hover:border-blue-200'}`}><input type="radio" name="live-question-answer" checked={choice === index} onChange={() => setChoice(index)} className="mt-1 accent-[#243F88]" /><span><strong className="mr-2 text-[#243F88]">{String.fromCharCode(65 + index)}.</strong>{option}</span></label>)}
      </fieldset>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {remaining <= 0 && <p className="mt-4 text-xs text-stone-500">Đã hết thời gian trả lời.</p>}
      {remaining <= 0
        ? <button type="button" onClick={advance} className="mt-5 w-full rounded-xl bg-[#243F88] px-4 py-3 text-sm font-bold text-white">{questionIndex + 1 < deck.questions.length ? 'Câu tiếp theo' : 'Về phòng học'}</button>
        : <button type="submit" disabled={choice === null || pending} className="mt-5 w-full rounded-xl bg-[#243F88] px-4 py-3 text-sm font-bold text-white hover:bg-[#1B326D] disabled:opacity-50">{pending ? 'Đang gửi…' : questionIndex + 1 < deck.questions.length ? 'Gửi và tiếp tục' : 'Gửi câu trả lời'}</button>}
    </form>
  </div>;
}

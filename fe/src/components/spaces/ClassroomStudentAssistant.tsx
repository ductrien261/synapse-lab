'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ArrowUp, Book, FileEarmarkText, Lightbulb, Link45deg, ListUl, Stars, Trash, X } from 'react-bootstrap-icons';
import { classroomApi, type ClassroomAssistantMessage, type PresentationState } from './classroom-api';
import { CLASSROOM_ASSISTANT_ACTION_EVENT, type ClassroomAssistantAction } from './classroom-assistant-events';

interface Props {
  roomCode: string;
  presentation: PresentationState;
  focusPage: number;
  getActiveContext?: () => { page: number; text: string } | null;
}

const INITIAL_SUGGESTIONS = [
  'Tóm tắt trang này',
  'Giải thích khái niệm',
  'Làm rõ câu hỏi trong trang',
  'Liên hệ kiến thức',
];

const SUGGESTION_ICONS = [Book, Lightbulb, ListUl, Link45deg];
const MAX_QUESTION_LENGTH = 8000;

export function ClassroomStudentAssistant({ roomCode, presentation, focusPage, getActiveContext }: Props) {
  const stage = presentation.stage;
  const page = focusPage;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ClassroomAssistantMessage[]>([]);
  const [suggestions, setSuggestions] = useState(INITIAL_SUGGESTIONS);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const previousResourceRef = useRef(stage?.id);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const appendContext = useCallback((contextPage: number, text: string) => {
    const excerpt = text.trim().slice(0, MAX_QUESTION_LENGTH - 80);
    if (!excerpt) return;
    const contextText = `Đoạn ở trang ${contextPage}: “${excerpt}”`;
    setInput((current) => {
      if (current.includes(contextText)) return current;
      return [current.trim(), contextText].filter(Boolean).join('\n\n').slice(0, MAX_QUESTION_LENGTH);
    });
  }, []);

  const ask = useCallback(async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || pending || !stage || stage.kind !== 'pdf') return;
    const questionPage = page;
    const history = messages.slice(-12);
    setMessages((current) => [...current, { role: 'user', content: question, page: questionPage }]);
    setInput('');
    setPending(true);
    setError('');
    try {
      const result = await classroomApi.classroomAssistant(roomCode, {
        resourceId: stage.id,
        page: questionPage,
        question,
        history,
      });
      setMessages((current) => [...current, {
        role: 'assistant',
        content: result.answer,
        page: result.context.page,
        used_external_knowledge: result.used_external_knowledge,
      }]);
      setSuggestions(result.suggested_questions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Trợ lý chưa thể trả lời câu hỏi này.');
    } finally {
      setPending(false);
    }
  }, [messages, page, pending, roomCode, stage]);

  useEffect(() => {
    if (previousResourceRef.current === stage?.id) return;
    previousResourceRef.current = stage?.id;
    setMessages([]);
    setSuggestions(INITIAL_SUGGESTIONS);
    setError('');
  }, [stage?.id]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, pending]);

  useEffect(() => {
    const handleAction = (event: Event) => {
      const action = (event as CustomEvent<ClassroomAssistantAction>).detail;
      setOpen(true);
      if (action.kind === 'explain') {
        void ask(`Hãy giải thích chi tiết đoạn sau ở trang ${action.page}: “${action.text}”`);
        return;
      }
      appendContext(action.page, action.text);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener(CLASSROOM_ASSISTANT_ACTION_EVENT, handleAction);
    return () => window.removeEventListener(CLASSROOM_ASSISTANT_ACTION_EVENT, handleAction);
  }, [appendContext, ask]);

  if (!stage || stage.kind !== 'pdf') return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  const clearConversation = () => {
    setMessages([]);
    setSuggestions(INITIAL_SUGGESTIONS);
    setError('');
  };

  const closeAssistant = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openAssistant = () => {
    const context = getActiveContext?.();
    if (context) appendContext(context.page, context.text);
    setOpen(true);
  };

  return <>
    <button ref={triggerRef} type="button" aria-label={`Hỏi AI về trang ${page}`} title={`Hỏi AI · Trang ${page}`} aria-expanded={open} aria-controls="classroom-student-assistant" tabIndex={open ? -1 : 0} onClick={openAssistant} className={`synapse-student-assistant-trigger ${open ? 'is-open' : ''}`}>
      <Image src="/images/logo-icon.png" alt="" aria-hidden="true" width={28} height={28} className="synapse-student-assistant-logo h-7 w-7 object-contain" />
    </button>

    <aside id="classroom-student-assistant" role="dialog" aria-label="Trợ lý học tập" aria-hidden={!open} className={`synapse-student-assistant-panel flex flex-col overflow-hidden rounded-[24px] border border-violet-100 bg-white text-slate-900 shadow-2xl ${open ? 'is-open' : ''}`}>
      <header className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2"><Stars size={16} className="shrink-0 text-violet-700" /><h2 className="truncate text-sm font-extrabold text-[#17152F]">Trợ lý học tập AI</h2><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-600">Beta</span></div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && <button type="button" onClick={clearConversation} aria-label="Xóa cuộc trò chuyện" title="Xóa cuộc trò chuyện" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><Trash size={15} /></button>}
            <button type="button" onClick={closeAssistant} aria-label="Đóng trợ lý" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"><FileEarmarkText size={17} /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-[#0F2258]">{stage.title}</p><p className="mt-0.5 text-[10px] text-slate-500">Trang {page}/{stage.preview_page_count || '?'} · Đang theo dõi tài liệu này</p></div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#FCFBFF] px-4 py-3">
        {messages.length === 0 && <div className="flex min-h-full flex-col justify-center pb-8">
          <div className="text-center"><span className="mx-auto grid h-14 w-14 rotate-[-8deg] place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-violet-600 text-white shadow-lg shadow-violet-200"><Stars size={25} /></span><p className="mt-5 text-lg font-extrabold tracking-tight text-[#17152F]">Bạn muốn tìm hiểu gì ở trang {page}?</p><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">Tôi có thể giải thích nội dung, tóm tắt ý chính, làm rõ khái niệm hoặc liên hệ kiến thức.</p></div>
          <div className="mt-7 grid grid-cols-2 gap-2.5">{suggestions.map((suggestion, index) => { const Icon = SUGGESTION_ICONS[index % SUGGESTION_ICONS.length]; return <button key={suggestion} type="button" onClick={() => void ask(suggestion)} className="group flex min-h-12 items-center gap-2.5 rounded-xl border border-violet-100 bg-white px-3 py-2 text-left text-[10px] font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-100"><Icon size={14} /></span>{suggestion}</button>; })}</div>
        </div>}

        {messages.length > 0 && <>
          <div className="space-y-3">
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'ml-8' : 'mr-5'}>
              <div className={`rounded-2xl px-3 py-2.5 text-xs leading-5 ${message.role === 'user' ? 'rounded-br-md bg-gradient-to-br from-indigo-600 to-violet-600 text-white' : 'rounded-bl-md border border-violet-100 bg-white text-slate-700 shadow-sm'}`}><p className="whitespace-pre-wrap">{message.content}</p></div>
              <div className={`mt-1 flex items-center gap-1.5 text-[9px] font-semibold text-slate-400 ${message.role === 'user' ? 'justify-end' : ''}`}><span>{message.role === 'user' ? 'Bạn hỏi' : 'AI trả lời'} · Trang {message.page}</span>{message.role === 'assistant' && message.used_external_knowledge && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700">Có kiến thức mở rộng</span>}</div>
            </div>)}
            {pending && <div className="mr-5 rounded-2xl rounded-bl-md border border-violet-100 bg-white px-3 py-3 shadow-sm"><span className="inline-flex items-center gap-2 text-xs text-slate-500"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />Đang đọc trang {page}…</span></div>}
            <div ref={messagesEndRef} />
          </div>
          {!pending && <div className="mt-3 flex flex-wrap gap-1.5">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void ask(suggestion)} className="rounded-full border border-violet-200 bg-white px-2.5 py-1.5 text-left text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50">{suggestion}</button>)}</div>}
        </>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">{error}</p>}
      </div>

      <form onSubmit={submit} className="flex shrink-0 items-end gap-2 bg-white p-4 pt-3">
        <textarea ref={inputRef} rows={1} maxLength={MAX_QUESTION_LENGTH} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (input.trim()) void ask(input); } }} placeholder={`Hỏi bất kỳ điều gì về trang ${page}…`} aria-label="Câu hỏi cho trợ lý AI" className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-3 text-xs leading-5 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        <button type="submit" disabled={pending || !input.trim()} aria-label="Gửi câu hỏi" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-40"><ArrowUp size={17} /></button>
      </form>
    </aside>
  </>;
}

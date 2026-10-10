'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRoomContext } from '@livekit/components-react';
import { ArrowCounterclockwise, ArrowLeft, ChatDots, Check2, Cursor, Eraser, HandIndex, Highlighter, JournalText, Pencil, PencilSquare, RecordCircleFill, Robot, Send, Sticky, ThreeDotsVertical, X } from 'react-bootstrap-icons';
import { RoomEvent } from 'livekit-client';
import { classroomApi, type AnnotationTool, type PresentationState } from './classroom-api';
import { PRESENTATION_UPDATE_TOPIC } from './LocalPresentationPanel';
import { ANSWER_TOPIC, QUESTION_TOPIC, RESULTS_TOPIC, QuestionComposer, type LiveQuestionDeck, type QuestionDraft } from './InteractiveQuestionDemo';
import { QuestionResultsCard } from './InteractiveQuestionResults';

const items = [
  {
    id: 'record',
    title: 'Quay màn hình',
    hint: 'Quay lại buổi học',
    detail: 'Khi hoàn thiện, bạn có thể ghi hình phần đang trình chiếu trong buổi học.',
    icon: RecordCircleFill,
    tone: 'bg-rose-50 text-rose-600',
  },
  {
    id: 'transcript',
    title: 'Ghi chép tự động',
    hint: 'Theo dõi nội dung đang nói',
    icon: JournalText,
    tone: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'notes',
    title: 'Ghi chú cá nhân',
    hint: 'Lưu ý quan trọng của riêng bạn',
    icon: PencilSquare,
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'ask_ai',
    title: 'Trợ lý AI',
    hint: 'Hỏi thêm về bài học',
    icon: Robot,
    tone: 'bg-violet-50 text-violet-700',
  },
  {
    id: 'ask_presenter',
    title: 'Gửi câu hỏi cho người trình chiếu',
    hint: 'Gửi câu hỏi cho giáo viên',
    icon: ChatDots,
    tone: 'bg-cyan-50 text-cyan-700',
  },
  {
    id: 'hand',
    title: 'Giơ tay',
    hint: 'Báo hiệu muốn phát biểu',
    icon: HandIndex,
    tone: 'bg-emerald-50 text-emerald-700',
  },
] as const;

type ItemId = (typeof items)[number]['id'];

interface Props {
  isModerator: boolean;
  roomCode: string;
  presentation: PresentationState | null;
  onPresentationChange: (state: PresentationState) => void;
  annotationTool: AnnotationTool;
  onAnnotationToolChange: (tool: AnnotationTool) => void;
}

export function InteractionToolbar({ isModerator, roomCode, presentation, onPresentationChange, annotationTool, onAnnotationToolChange }: Props) {
  const room = useRoomContext();
  const [controlBar, setControlBar] = useState<HTMLElement | null>(null);
  const [openItemId, setOpenItemId] = useState<ItemId | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [annotationOpenFor, setAnnotationOpenFor] = useState<string | null>(null);
  const [annotationPending, setAnnotationPending] = useState(false);
  const [annotationError, setAnnotationError] = useState('');
  const [selectedMoreId, setSelectedMoreId] = useState<ItemId | null>(null);
  const [note, setNote] = useState('Tâm thất trái bơm máu giàu oxy vào động mạch chủ. Cần phân biệt với tâm thất phải bơm máu lên phổi.');
  const [savedNote, setSavedNote] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiReply, setAiReply] = useState<{ question: string; answer: string } | null>(null);
  const [presenterQuestion, setPresenterQuestion] = useState('Vì sao thành tâm thất trái dày hơn thành tâm thất phải?');
  const [sentQuestions, setSentQuestions] = useState<string[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [presentedQuestion, setPresentedQuestion] = useState<LiveQuestionDeck | null>(null);
  const [responseCount, setResponseCount] = useState(0);
  const [optionCounts, setOptionCounts] = useState<number[][]>([]);
  const [questionTab, setQuestionTab] = useState<'create' | 'results'>('create');
  const [shareResultsPending, setShareResultsPending] = useState(false);
  const [shareResultsMessage, setShareResultsMessage] = useState('');
  const [pollNotification, setPollNotification] = useState(false);
  const answeredIdentities = useRef(new Set<string>());
  const toolsRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const annotationPanelId = useId();
  const selectedMore = items.find((item) => item.id === selectedMoreId);
  const canAnnotate = isModerator && presentation?.on_stage && presentation.stage?.kind === 'pdf';
  const annotationOpen = Boolean(canAnnotate && annotationOpenFor === presentation?.stage?.id);

  useEffect(() => {
    if (!isModerator || !presentedQuestion) return;
    const retryTimers = new Set<number>();
    const receiveAnswer = (payload: Uint8Array, participant?: { identity: string }, _kind?: unknown, topic?: string) => {
      if (topic !== ANSWER_TOPIC || !participant) return;
      try {
        const answer: unknown = JSON.parse(new TextDecoder().decode(payload));
        if (!answer || typeof answer !== 'object') return;
        const { deckId, questionIndex, selectedOption } = answer as { deckId?: unknown; questionIndex?: unknown; selectedOption?: unknown };
        if (deckId !== presentedQuestion.id || !Number.isInteger(questionIndex) || typeof questionIndex !== 'number' || questionIndex < 0 || questionIndex >= presentedQuestion.questions.length) return;
        if (!Number.isInteger(selectedOption) || typeof selectedOption !== 'number' || selectedOption < 0 || selectedOption >= presentedQuestion.questions[questionIndex].options.length) return;
        const responseKey = `${participant.identity}:${questionIndex}`;
        if (answeredIdentities.current.has(responseKey)) return;
        answeredIdentities.current.add(responseKey);
        setResponseCount(answeredIdentities.current.size);
        setOptionCounts((current) => current.map((row, rowIndex) => rowIndex === questionIndex
          ? row.map((count, optionIndex) => optionIndex === selectedOption ? count + 1 : count)
          : row));
        if (presentedQuestion.questions.length === 1 && presentedQuestion.questions[0].kind === 'poll'
          && room.remoteParticipants.size > 0 && answeredIdentities.current.size >= room.remoteParticipants.size) {
          setPollNotification(true);
        }
      } catch { /* Ignore unrelated or malformed room data. */ }
    };
    const sendToNewParticipant = (participant: { identity: string }) => {
      if (Date.now() >= presentedQuestion.startedAt + presentedQuestion.questions.reduce((total, question) => total + question.durationSeconds * 1000, 0)) return;
      const timer = window.setTimeout(() => {
        retryTimers.delete(timer);
        const payload = new TextEncoder().encode(JSON.stringify({ ...presentedQuestion, questions: presentedQuestion.questions.map((question) => ({ ...question, correctOption: null })) }));
        void room.localParticipant.publishData(payload, { reliable: true, topic: QUESTION_TOPIC, destinationIdentities: [participant.identity] }).catch(() => {});
      }, 500);
      retryTimers.add(timer);
    };
    room.on(RoomEvent.DataReceived, receiveAnswer);
    room.on(RoomEvent.ParticipantConnected, sendToNewParticipant);
    return () => {
      room.off(RoomEvent.DataReceived, receiveAnswer);
      room.off(RoomEvent.ParticipantConnected, sendToNewParticipant);
      retryTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [room, isModerator, presentedQuestion]);

  useEffect(() => {
    if (!isModerator || !presentedQuestion || presentedQuestion.questions.length !== 1 || presentedQuestion.questions[0].kind !== 'poll') return;
    const question = presentedQuestion.questions[0];
    const timer = window.setTimeout(() => setPollNotification(true), Math.max(0, presentedQuestion.startedAt + question.durationSeconds * 1000 - Date.now()));
    return () => window.clearTimeout(timer);
  }, [isModerator, presentedQuestion]);

  useEffect(() => {
    const findControlBar = () => {
      const target = document.querySelector<HTMLElement>('.lk-video-conference .lk-control-bar');
      if (target) {
        setControlBar(target);
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(findControlBar);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(findControlBar);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!controlBar) return;
    const label = (selector: string, title: string) => {
      const button = controlBar.querySelector<HTMLButtonElement>(selector);
      if (button && button.title !== title) {
        button.title = title;
        button.setAttribute('aria-label', title);
      }
    };
    const labelControls = () => {
      label('button[data-lk-source="microphone"]', 'Microphone');
      label('button[data-lk-source="camera"]', 'Camera');
      const microphone = controlBar.querySelector<HTMLButtonElement>('button[data-lk-source="microphone"]');
      const camera = controlBar.querySelector<HTMLButtonElement>('button[data-lk-source="camera"]');
      const micMenu = microphone?.parentElement?.querySelector<HTMLButtonElement>('.lk-button-group-menu button');
      const cameraMenu = camera?.parentElement?.querySelector<HTMLButtonElement>('.lk-button-group-menu button');
      if (micMenu) micMenu.title = 'Chọn microphone';
      if (cameraMenu) cameraMenu.title = 'Chọn camera';
      const screen = controlBar.querySelector<HTMLButtonElement>('button[data-lk-source="screen_share"]');
      if (screen) {
        const title = screen.dataset.lkEnabled === 'true' ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình';
        screen.title = title;
        screen.setAttribute('aria-label', title);
      }
      label('button.lk-chat-toggle', 'Trò chuyện');
      label('button.lk-disconnect-button', 'Rời phòng');
    };
    labelControls();
    const observer = new MutationObserver(labelControls);
    observer.observe(controlBar, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-lk-enabled'] });
    return () => observer.disconnect();
  }, [controlBar]);

  useEffect(() => {
    if (!openItemId && !moreOpen && !selectedMoreId && !annotationOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenItemId(null);
        setMoreOpen(false);
        setSelectedMoreId(null);
        setAnnotationOpenFor(null);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!toolsRef.current?.contains(event.target as Node)) {
        setOpenItemId(null);
        setMoreOpen(false);
        setSelectedMoreId(null);
        setAnnotationOpenFor(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [openItemId, moreOpen, selectedMoreId, annotationOpen]);

  const undoAnnotation = async () => {
    if (!canAnnotate || !presentation?.stage || annotationPending) return;
    setAnnotationPending(true);
    setAnnotationError('');
    try {
      const next = await classroomApi.presentationAction(roomCode, {
        action: 'annotation_undo', resource_id: presentation.stage.id, page: presentation.stage_page,
      });
      onPresentationChange(next);
      void room.localParticipant.publishData(new TextEncoder().encode('updated'), { reliable: true, topic: PRESENTATION_UPDATE_TOPIC }).catch(() => {});
    } catch (reason) {
      setAnnotationError(reason instanceof Error ? reason.message : 'Không thể hoàn tác ghi chú.');
    } finally {
      setAnnotationPending(false);
    }
  };

  const askAi = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const answer = /van|valve/i.test(trimmed)
      ? 'Tim có bốn van chính: van ba lá, van động mạch phổi, van hai lá và van động mạch chủ. Các van giúp máu đi theo một chiều và hạn chế dòng máu chảy ngược.'
      : /thất trái|ventricle/i.test(trimmed)
        ? 'Tâm thất trái nhận máu giàu oxy từ tâm nhĩ trái, rồi co bóp đẩy máu qua van động mạch chủ để nuôi cơ thể. Thành cơ của buồng này dày hơn tâm thất phải vì phải tạo áp lực lớn hơn.'
        : 'Máu từ cơ thể về tâm nhĩ phải, xuống tâm thất phải rồi lên phổi. Sau khi nhận oxy, máu về tâm nhĩ trái, xuống tâm thất trái và được bơm ra động mạch chủ.';
    setAiReply({ question: trimmed, answer });
    setAiQuestion('');
  };

  const presentQuestion = async (drafts: QuestionDraft[]) => {
    const question: LiveQuestionDeck = { questions: drafts, id: crypto.randomUUID(), startedAt: Date.now() };
    await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ ...question, questions: drafts.map((draft) => ({ ...draft, correctOption: null })) })), { reliable: true, topic: QUESTION_TOPIC });
    answeredIdentities.current.clear();
    setResponseCount(0);
    setOptionCounts(drafts.map((draft) => draft.options.map(() => 0)));
    setPresentedQuestion(question);
    setQuestionTab('results');
    setShareResultsMessage('');
    setPollNotification(false);
  };

  const shareResults = async () => {
    if (!presentedQuestion || shareResultsPending) return;
    setShareResultsPending(true);
    setShareResultsMessage('');
    try {
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ deck: presentedQuestion, counts: optionCounts })), { reliable: true, topic: RESULTS_TOPIC });
      setShareResultsMessage('Đã chiếu kết quả cho người học.');
    } catch (reason) {
      setShareResultsMessage(reason instanceof Error ? reason.message : 'Chưa chiếu được kết quả.');
    } finally {
      setShareResultsPending(false);
    }
  };

  if (!controlBar) return null;

  return createPortal(<div ref={toolsRef} className="synapse-utility-actions flex shrink-0 items-center gap-2">
    {isModerator && pollNotification && presentedQuestion?.questions[0]?.kind === 'poll' && <div role="status" className="fixed bottom-[max(104px,calc(env(safe-area-inset-bottom)+104px))] right-4 z-[100] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-blue-200 bg-white p-4 text-slate-900 shadow-[0_20px_60px_-12px_rgba(15,34,88,0.35)] sm:right-6">
      <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#243F88]"><Check2 size={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#0F2258]">Khảo sát đã kết thúc</p><p className="mt-0.5 text-xs text-slate-600">{responseCount} người đã trả lời</p></div><button type="button" aria-label="Đóng thông báo khảo sát" onClick={() => setPollNotification(false)} className="text-slate-400 hover:text-slate-700"><X size={17} /></button></div>
      <button type="button" onClick={() => { setPollNotification(false); setMoreOpen(false); setOpenItemId(null); setSelectedMoreId('ask_presenter'); setQuestionTab('results'); }} className="mt-3 w-full rounded-xl bg-[#243F88] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1B326D]">Xem số người chọn từng đáp án</button>
    </div>}
    <div className="relative shrink-0">
      <button type="button" aria-label="Quay màn hình" title="Quay màn hình" aria-expanded={openItemId === 'record'} onClick={() => { setMoreOpen(false); setAnnotationOpenFor(null); setOpenItemId(openItemId === 'record' ? null : 'record'); }} className="lk-button synapse-utility-button"><RecordCircleFill size={16} className="text-rose-400" aria-hidden="true" /><span>Quay màn hình</span></button>
      {openItemId === 'record' && <aside role="dialog" aria-label="Quay màn hình" className="absolute bottom-[calc(100%+12px)] right-0 z-50 w-[min(300px,calc(100vw-2.5rem))] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_24px_64px_-16px_rgba(15,34,88,0.35)]"><div className="flex items-start justify-between gap-2"><h2 className="text-sm font-bold text-[#0F2258]">Quay màn hình</h2><button type="button" aria-label="Đóng" onClick={() => setOpenItemId(null)} className="text-slate-500 hover:text-slate-800"><X size={16} /></button></div><p className="mt-2 text-xs leading-5 text-slate-600">Khi hoàn thiện, bạn có thể ghi hình phần đang trình chiếu trong buổi học.</p><p className="mt-3 text-[11px] font-medium text-slate-400">Giao diện mẫu · Chưa kích hoạt</p></aside>}
    </div>
    {canAnnotate && <div className="relative shrink-0">
      <button type="button" aria-label="Công cụ ghi chú PDF" title="Công cụ ghi chú PDF" aria-expanded={annotationOpen} aria-controls={annotationPanelId} onClick={() => { setMoreOpen(false); setSelectedMoreId(null); setOpenItemId(null); setAnnotationOpenFor(annotationOpen ? null : presentation?.stage?.id || null); }} className={`lk-button synapse-utility-button !px-3 ${annotationTool !== 'none' ? '!bg-blue-700 !text-white' : ''}`}><PencilSquare size={20} aria-hidden="true" /></button>
      {annotationOpen && <aside id={annotationPanelId} role="dialog" aria-label="Công cụ ghi chú PDF" className="absolute bottom-[calc(100%+12px)] right-0 z-50 w-[min(290px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-[0_24px_64px_-16px_rgba(15,34,88,0.35)]">
        <p className="mb-2 px-1 text-sm font-bold text-[#0F2258]">Ghi chú trên PDF</p>
        {([
          ['none', Cursor, 'Di chuyển'],
          ['pen', Pencil, 'Bút vẽ'],
          ['highlighter', Highlighter, 'Tô sáng'],
          ['text', Sticky, 'Ghi chú chữ'],
          ['eraser', Eraser, 'Tẩy ghi chú'],
        ] as const).map(([tool, Icon, label]) => <button key={tool} type="button" aria-pressed={annotationTool === tool} onClick={() => { onAnnotationToolChange(tool); setAnnotationError(''); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold ${annotationTool === tool ? 'bg-blue-50 text-[#1E3F82]' : 'text-slate-700 hover:bg-slate-50'}`}><Icon size={17} aria-hidden="true" />{label}</button>)}
        <div className="mt-2 border-t border-slate-100 pt-2"><button type="button" disabled={annotationPending || !presentation.stage_annotations.length} onClick={() => void undoAnnotation()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ArrowCounterclockwise size={17} aria-hidden="true" />Hoàn tác ghi chú cuối</button></div>
        {annotationError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700">{annotationError}</p>}
      </aside>}
    </div>}
    <div className="relative shrink-0">
      <button type="button" aria-label="Tiện ích" title="Tiện ích" aria-expanded={moreOpen || Boolean(selectedMore)} aria-controls={panelId} onClick={() => { setOpenItemId(null); setAnnotationOpenFor(null); setSelectedMoreId(null); setMoreOpen((value) => !value); }} className="lk-button synapse-utility-button"><ThreeDotsVertical size={16} aria-hidden="true" /><span>Tiện ích</span></button>
      {(moreOpen || selectedMore) && <aside id={panelId} role="dialog" aria-label={selectedMore?.title || 'Tiện ích'} className="absolute bottom-[calc(100%+12px)] right-0 z-50 max-h-[min(560px,calc(100dvh-11rem))] w-[min(390px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_24px_64px_-16px_rgba(15,34,88,0.35)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {selectedMore && <button type="button" aria-label="Quay lại tiện ích" onClick={() => { setSelectedMoreId(null); setMoreOpen(true); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ArrowLeft size={17} /></button>}
            <h2 className="truncate text-base font-bold text-[#0F2258]">{selectedMoreId === 'ask_presenter' && isModerator ? 'Câu hỏi tương tác' : selectedMore?.title || 'Tiện ích'}</h2>
          </div>
          <button type="button" aria-label="Đóng tiện ích" onClick={() => { setMoreOpen(false); setSelectedMoreId(null); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={17} /></button>
        </div>
        {moreOpen && <div className="space-y-1">{items.filter((item) => item.id !== 'record' && (!isModerator || item.id !== 'hand')).map((item) => {
          const Icon = item.icon;
          return <button key={item.id} type="button" onClick={() => { setSelectedMoreId(item.id); setMoreOpen(false); if (item.id === 'ask_presenter') setPollNotification(false); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm font-medium hover:bg-slate-50"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><Icon size={19} /></span>{item.id === 'ask_presenter' && isModerator ? 'Câu hỏi tương tác' : item.title}</button>;
        })}</div>}
        {selectedMore && <div className="space-y-4 text-sm">
          {!(selectedMoreId === 'ask_presenter' && isModerator) && <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">Dữ liệu mẫu về bài học Tim · Thao tác chỉ hiển thị trên máy này</p>}
          {selectedMoreId === 'transcript' && <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500">Bản ghi mẫu của buổi học</p>
            {[
              ['00:42', 'Giáo viên', 'Tim có bốn buồng: hai tâm nhĩ ở trên và hai tâm thất ở dưới.'],
              ['02:15', 'Giáo viên', 'Tâm thất phải đưa máu lên phổi để trao đổi khí.'],
              ['04:08', 'Giáo viên', 'Tâm thất trái bơm máu giàu oxy vào động mạch chủ để nuôi cơ thể.'],
            ].map(([time, speaker, content]) => <div key={time} className="rounded-xl border border-slate-200 p-3"><div className="mb-1 flex items-center justify-between text-xs font-semibold"><span className="text-[#1E3F82]">{speaker}</span><time className="text-slate-400">{time}</time></div><p className="leading-5 text-slate-700">{content}</p></div>)}
          </div>}
          {selectedMoreId === 'notes' && <div>
            <label htmlFor="synapse-personal-note" className="mb-2 block text-xs font-semibold text-slate-600">Ghi chú cho bài học Tim</label>
            <textarea id="synapse-personal-note" rows={6} value={note} onChange={(event) => { setNote(event.target.value); setSavedNote(''); }} placeholder="Viết điều bạn muốn ghi nhớ…" className="w-full resize-y rounded-xl border border-slate-300 p-3 leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <button type="button" disabled={!note.trim()} onClick={() => setSavedNote(note)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3F82] px-4 py-2.5 font-semibold text-white disabled:opacity-50"><Check2 />Lưu ghi chú mẫu</button>
            {savedNote && <p role="status" className="mt-2 text-xs text-emerald-700">Đã lưu trong phiên demo này.</p>}
          </div>}
          {selectedMoreId === 'ask_ai' && <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500">Chọn câu hỏi gợi ý hoặc nhập câu hỏi của bạn</p>
            <div className="flex flex-wrap gap-2">{['Tâm thất trái có vai trò gì?', 'Máu qua tim theo thứ tự nào?', 'Các van tim có chức năng gì?'].map((question) => <button key={question} type="button" onClick={() => { setAiQuestion(question); setAiReply(null); }} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-left text-xs font-medium text-violet-800 hover:bg-violet-100">{question}</button>)}</div>
            {aiReply && <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="mb-2 font-semibold text-slate-800">{aiReply.question}</p><p className="text-xs font-semibold text-violet-700">Trả lời mẫu</p><p className="mt-1 leading-6 text-slate-700">{aiReply.answer}</p></div>}
            <form onSubmit={(event) => { event.preventDefault(); askAi(aiQuestion); }} className="flex gap-2"><input value={aiQuestion} onChange={(event) => { setAiQuestion(event.target.value); setAiReply(null); }} aria-label="Hỏi trợ lý AI" placeholder="Hỏi về bài học…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-violet-500" /><button type="submit" disabled={!aiQuestion.trim()} className="shrink-0 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white disabled:opacity-50">Hỏi AI</button></form>
          </div>}
          {selectedMoreId === 'ask_presenter' && isModerator && <div>
            {presentedQuestion && <div role="tablist" aria-label="Câu hỏi tương tác" className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"><button type="button" role="tab" aria-selected={questionTab === 'create'} onClick={() => setQuestionTab('create')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${questionTab === 'create' ? 'bg-white text-[#243F88] shadow-sm' : 'text-slate-600'}`}>Tạo câu hỏi</button><button type="button" role="tab" aria-selected={questionTab === 'results'} onClick={() => setQuestionTab('results')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${questionTab === 'results' ? 'bg-white text-[#243F88] shadow-sm' : 'text-slate-600'}`}>Kết quả · {responseCount}</button></div>}
            {(!presentedQuestion || questionTab === 'create') && <QuestionComposer onPresent={presentQuestion} onDone={() => setSelectedMoreId(null)} />}
            {presentedQuestion && questionTab === 'results' && <><QuestionResultsCard key={presentedQuestion.id} deck={presentedQuestion} counts={optionCounts} /><button type="button" disabled={shareResultsPending} onClick={() => void shareResults()} className="mt-5 w-full rounded-xl bg-[#243F88] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1B326D] disabled:opacity-50">{shareResultsPending ? 'Đang chiếu…' : 'Chiếu kết quả cho lớp'}</button>{shareResultsMessage && <p role="status" className="mt-2 text-center text-xs text-slate-600">{shareResultsMessage}</p>}</>}
          </div>}
          {selectedMoreId === 'ask_presenter' && !isModerator && <div>
            <label htmlFor="synapse-presenter-question" className="mb-2 block text-xs font-semibold text-slate-600">Câu hỏi dành cho người trình chiếu</label>
            <form onSubmit={(event) => { event.preventDefault(); const question = presenterQuestion.trim(); if (!question) return; setSentQuestions((current) => [question, ...current]); setPresenterQuestion(''); }}>
              <textarea id="synapse-presenter-question" rows={4} value={presenterQuestion} onChange={(event) => setPresenterQuestion(event.target.value)} placeholder="Ví dụ: Vì sao thành tâm thất trái dày hơn tâm thất phải?" className="w-full resize-y rounded-xl border border-slate-300 p-3 leading-6 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
              <button type="submit" disabled={!presenterQuestion.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3F82] px-4 py-2.5 font-semibold text-white disabled:opacity-50"><Send size={15} />Thêm câu hỏi mẫu</button>
            </form>
            {sentQuestions.length > 0 && <div role="status" className="mt-4 space-y-2"><p className="text-xs font-semibold text-slate-500">Câu hỏi đã thêm trong phiên demo</p>{sentQuestions.map((question, index) => <p key={`${index}-${question}`} className="rounded-lg bg-cyan-50 p-3 leading-5 text-slate-700">{question}</p>)}</div>}
          </div>}
          {selectedMoreId === 'hand' && !isModerator && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
            <HandIndex size={36} className="mx-auto text-emerald-700" />
            <p className="mt-3 font-semibold text-slate-900">{handRaised ? 'Bạn đang giơ tay' : 'Bạn muốn phát biểu?'}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{handRaised ? 'Dấu hiệu giơ tay đang bật trong phiên demo.' : 'Bấm nút bên dưới để thử trạng thái giơ tay.'}</p>
            <button type="button" onClick={() => setHandRaised((value) => !value)} className={`mt-4 w-full rounded-xl px-4 py-2.5 font-semibold text-white ${handRaised ? 'bg-slate-700' : 'bg-emerald-700'}`}>{handRaised ? 'Hạ tay' : 'Giơ tay'}</button>
          </div>}
        </div>}
      </aside>}
    </div>
  </div>, controlBar);
}

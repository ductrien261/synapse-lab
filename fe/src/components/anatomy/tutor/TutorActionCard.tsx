'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';
import { tutorApi, type TutorAction, type TutorActionData, type TutorCitation } from '@/lib/tutor';
import { RichText } from './RichText';

export function TutorActionCard({ messageId, kind, initial, citations, onCite }: {
  messageId: number;
  kind: TutorAction;
  initial: TutorActionData;
  citations: TutorCitation[];
  onCite: (citation: TutorCitation) => void;
}) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const questions = kind === 'quiz' ? data.questions ?? [data] : [data];
  const current = questions[quizIndex] ?? questions[0];

  const answer = async (choice: number) => {
    if (busy || current.answered_index !== undefined) return;
    setBusy(true);
    setError('');
    try {
      setData(await tutorApi.answerAction(messageId, choice, quizIndex));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa chấm được đáp án.');
    } finally {
      setBusy(false);
    }
  };

  if (kind === 'summary') {
    return (
      <div className="rounded-xl border border-[#C5D5EE] bg-[#F7F9FD] p-3">
        <h3 className="mb-2 text-sm font-bold text-[#1E3F82]">Tóm tắt kiến thức</h3>
        <ul className="space-y-2 pl-4 list-disc text-sm text-stone-700">
          {data.items?.map((item, index) => <li key={index}><RichText text={item} citations={citations} onCite={onCite} /></li>)}
        </ul>
      </div>
    );
  }

  if (kind === 'flashcards') {
    const cards = data.cards ?? [];
    const card = cards[cardIndex];
    if (!card) return null;
    const move = (delta: number) => {
      setCardIndex((value) => (value + delta + cards.length) % cards.length);
      setFlipped(false);
    };
    return (
      <div className="rounded-xl border border-[#C5D5EE] bg-[#F7F9FD] p-3">
        <div className="mb-2 text-xs font-bold text-[#1E3F82]">Flashcard {cardIndex + 1}/{cards.length}</div>
        <div className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{flipped ? 'Mặt sau' : 'Mặt trước'}</span>
          <div className="text-sm font-semibold text-stone-800">{flipped ? <RichText text={card.back} citations={citations} onCite={onCite} /> : card.front}</div>
          <button type="button" onClick={() => setFlipped((value) => !value)} className="text-xs font-semibold text-[#1E3F82] hover:underline">{flipped ? 'Xem câu hỏi' : 'Xem đáp án'}</button>
        </div>
        <div className="mt-2 flex justify-between">
          <button type="button" onClick={() => move(-1)} className="flex items-center gap-1 text-xs font-semibold text-[#1E3F82]"><ArrowLeft /> Trước</button>
          <button type="button" onClick={() => move(1)} className="flex items-center gap-1 text-xs font-semibold text-[#1E3F82]">Tiếp <ArrowRight /></button>
        </div>
      </div>
    );
  }

  const answered = current.answered_index !== undefined;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#C5D5EE] bg-[#F7F9FD] p-3">
      <div className="text-xs font-bold text-[#1E3F82]">{kind === 'scenario' ? 'Tình huống giả định' : `Bài tập trắc nghiệm · Câu ${quizIndex + 1}/${questions.length}`}</div>
      <div className="text-sm font-semibold text-stone-800"><RichText text={current.question ?? ''} citations={citations} onCite={onCite} highlightQuestion={kind === 'scenario'} /></div>
      {current.options?.map((option, index) => (
        <button
          key={index}
          type="button"
          disabled={answered || busy}
          onClick={() => void answer(index)}
          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${answered && index === current.correct_index ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : answered && index === current.answered_index ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-stone-200 bg-white text-stone-700 hover:border-[#1E3F82]/40 disabled:cursor-default'}`}
        >
          <span className="mr-1.5 font-bold">{String.fromCharCode(65 + index)}.</span>{option}
        </button>
      ))}
      {answered && (
        <div className={`rounded-lg px-3 py-2 text-sm ${current.correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
          <div className="mb-1 flex items-center gap-1.5 font-bold">
            {current.correct ? <CheckCircleFill className="h-4 w-4" /> : <XCircleFill className="h-4 w-4" />}
            {current.correct ? 'Chính xác!' : 'Chưa đúng, xem lời giải nhé'}
          </div>
          <RichText text={current.explanation ?? ''} citations={citations} onCite={onCite} />
        </div>
      )}
      {kind === 'quiz' && questions.length > 1 && (
        <div className="mt-1 flex items-center justify-between text-xs font-semibold text-[#1E3F82]">
          <button type="button" disabled={quizIndex === 0} onClick={() => setQuizIndex((index) => index - 1)} className="inline-flex items-center gap-1 disabled:opacity-40"><ArrowLeft /> Trước</button>
          <span>{questions.filter((question) => question.answered_index !== undefined).length}/{questions.length} đã trả lời</span>
          <button type="button" disabled={quizIndex === questions.length - 1} onClick={() => setQuizIndex((index) => index + 1)} className="inline-flex items-center gap-1 disabled:opacity-40">Tiếp <ArrowRight /></button>
        </div>
      )}
      {error && <div className="text-xs text-rose-600">{error}</div>}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { CheckCircleFill, Lightning, XCircleFill } from 'react-bootstrap-icons';
import { refreshAiQuota } from '@/lib/ai';
import { tutorApi, type QuickCheck, type TutorCitation } from '@/lib/tutor';
import { RichText } from './RichText';

/** "Kiểm tra nhanh": 1 câu trắc nghiệm sinh từ chính nguồn của câu trả lời. */
export function QuickCheckCard({
  messageId,
  initial,
  citations,
  onCite,
}: {
  messageId: number;
  initial: QuickCheck | null;
  citations: TutorCitation[];
  onCite: (c: TutorCitation) => void;
}) {
  const [qc, setQc] = useState<QuickCheck | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setQc(await tutorApi.quickCheck(messageId));
      refreshAiQuota();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa tạo được câu hỏi');
    } finally {
      setLoading(false);
    }
  };

  const answer = async (choice: number) => {
    try {
      setQc(await tutorApi.answerQuickCheck(messageId, choice));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được câu trả lời');
    }
  };

  if (!qc) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C5D5EE] bg-white text-xs font-bold text-[#1E3F82] hover:bg-[#F4F7FC] disabled:opacity-60 cursor-pointer"
        >
          {loading ? <span className="w-3 h-3 rounded-full border-2 border-[#1E3F82] border-t-transparent animate-spin" /> : <Lightning className="w-3.5 h-3.5" />}
          {loading ? 'Đang ra câu hỏi...' : 'Kiểm tra nhanh'}
        </button>
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    );
  }

  const answered = qc.answered_index !== undefined;
  return (
    <div className="rounded-xl border border-[#C5D5EE] bg-[#F7F9FD] p-3 flex flex-col gap-2">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#1E3F82]">Kiểm tra nhanh</div>
      <p className="text-sm font-semibold text-stone-800">{qc.question}</p>
      <div className="flex flex-col gap-1.5">
        {qc.options.map((o, i) => {
          const isCorrect = answered && i === qc.correct_index;
          const isWrongPick = answered && i === qc.answered_index && !qc.correct;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => void answer(i)}
              className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                isCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : isWrongPick
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-[#1E3F82]/40 disabled:hover:border-stone-200 cursor-pointer disabled:cursor-default'
              }`}
            >
              <span className="font-bold mr-1.5">{String.fromCharCode(65 + i)}.</span>
              {o}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`rounded-lg px-3 py-2 text-sm ${qc.correct ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <div className={`flex items-center gap-1.5 font-bold mb-1 ${qc.correct ? 'text-emerald-700' : 'text-amber-700'}`}>
            {qc.correct ? <CheckCircleFill className="w-4 h-4" /> : <XCircleFill className="w-4 h-4" />}
            {qc.correct ? 'Chính xác!' : 'Chưa đúng, xem lại nhé'}
          </div>
          {qc.explanation && <RichText text={qc.explanation} citations={citations} onCite={onCite} />}
        </div>
      )}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}

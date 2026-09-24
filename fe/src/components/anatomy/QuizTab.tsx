'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ArrowRepeat, CheckCircleFill, Controller, SkipForwardFill, XCircleFill } from 'react-bootstrap-icons';
import { partName, type PartItem } from './types';

const ROUND = 10;

type Feedback = { type: 'correct' } | { type: 'wrong'; picked: PartItem } | { type: 'reveal' } | null;

/**
 * Tab "Tương tác": thử thách nhận diện.
 * Hệ thống đưa ra tên bộ phận, học viên bấm đúng số trên mô hình (hoặc trên thanh bên dưới).
 */
export function QuizTab({
  parts,
  onSelect,
  onPick,
  onActiveChange,
}: {
  parts: PartItem[];
  onSelect: (index: number) => void;
  /** đăng ký nhận sự kiện người dùng chọn một bộ phận */
  onPick: (fn: (index: number) => void) => () => void;
  onActiveChange: (active: boolean) => void;
}) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro');
  const [target, setTarget] = useState<number | null>(null);
  const [asked, setAsked] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [missedFirstTry, setMissedFirstTry] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const ignoreNext = useRef(false);

  useEffect(() => {
    onActiveChange(phase === 'playing');
    return () => onActiveChange(false);
  }, [phase, onActiveChange]);

  const nextQuestion = (prevTarget: number | null) => {
    const pool = parts.filter((p) => p.index !== prevTarget);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setTarget(pick.index);
    setMissedFirstTry(false);
    setFeedback(null);
  };

  const start = () => {
    setAsked(1);
    setCorrect(0);
    setPhase('playing');
    nextQuestion(null);
  };

  const advance = () => {
    if (asked >= ROUND) {
      setPhase('done');
      setTarget(null);
      return;
    }
    setAsked((n) => n + 1);
    nextQuestion(target);
  };

  // Chấm điểm mỗi khi người dùng chọn một bộ phận (trên mô hình hoặc thanh bên dưới)
  const grade = useEffectEvent((index: number) => {
    if (ignoreNext.current) {
      ignoreNext.current = false;
      return;
    }
    if (phase !== 'playing' || target === null || feedback?.type === 'correct') return;
    if (index === target) {
      if (!missedFirstTry) setCorrect((n) => n + 1);
      setFeedback({ type: 'correct' });
    } else {
      const picked = parts.find((p) => p.index === index);
      setMissedFirstTry(true);
      if (picked) setFeedback({ type: 'wrong', picked });
    }
  });
  useEffect(() => onPick((index) => grade(index)), [onPick]);

  const reveal = () => {
    if (target === null) return;
    ignoreNext.current = true;
    setMissedFirstTry(true);
    setFeedback({ type: 'reveal' });
    onSelect(target);
  };

  if (parts.length < 2) {
    return (
      <div className="p-5 text-sm text-stone-500">Mô hình cần ít nhất 2 chú thích để chơi thử thách nhận diện.</div>
    );
  }

  if (phase === 'intro' || phase === 'done') {
    const pct = Math.round((correct / ROUND) * 100);
    return (
      <div className="flex flex-col items-center text-center px-6 py-8 gap-3">
        <span className="w-14 h-14 rounded-2xl bg-[#E8F0FB] text-[#1E3F82] flex items-center justify-center">
          <Controller className="w-6 h-6" />
        </span>
        {phase === 'intro' ? (
          <>
            <h3 className="text-base font-bold text-stone-900">Thử thách nhận diện</h3>
            <p className="text-sm text-stone-500">
              Hệ thống đưa ra tên một bộ phận, bạn bấm đúng số của nó trên mô hình 3D. {ROUND} câu mỗi lượt.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-base font-bold text-stone-900">Hoàn thành!</h3>
            <p className="text-3xl font-extrabold text-[#1E3F82] tabular-nums">
              {correct}/{ROUND}
            </p>
            <p className="text-sm text-stone-500">
              {pct >= 80 ? 'Rất tốt, bạn nắm vững mô hình này.' : pct >= 50 ? 'Khá ổn, ôn lại vài bộ phận nhé.' : 'Xem lại tab Thông tin rồi thử lần nữa nhé.'}
            </p>
          </>
        )}
        <button
          type="button"
          onClick={start}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold cursor-pointer"
        >
          {phase === 'intro' ? <Controller className="w-4 h-4" /> : <ArrowRepeat className="w-4 h-4" />}
          {phase === 'intro' ? 'Bắt đầu' : 'Chơi lại'}
        </button>
      </div>
    );
  }

  const targetPart = parts.find((p) => p.index === target);

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
        <span>
          Câu {asked}/{ROUND}
        </span>
        <span>
          Đúng: <span className="text-emerald-600 font-bold">{correct}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div className="h-full bg-[#1E3F82] transition-[width]" style={{ width: `${((asked - 1) / ROUND) * 100}%` }} />
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#0F2258] to-[#1E3F82] text-white p-5 text-center">
        <div className="text-[11px] font-bold uppercase tracking-wider text-white/60">Tìm trên mô hình</div>
        <div className="mt-1 text-lg font-extrabold">{targetPart ? partName(targetPart) : ''}</div>
      </div>

      {feedback?.type === 'correct' && (
        <FeedbackBox tone="ok" icon={<CheckCircleFill className="w-4 h-4" />} text="Chính xác!" />
      )}
      {feedback?.type === 'wrong' && (
        <FeedbackBox
          tone="bad"
          icon={<XCircleFill className="w-4 h-4" />}
          text={`Chưa đúng — số (${feedback.picked.index + 1}) là “${partName(feedback.picked)}”. Thử lại nhé.`}
        />
      )}
      {feedback?.type === 'reveal' && targetPart && (
        <FeedbackBox tone="info" icon={<SkipForwardFill className="w-4 h-4" />} text={`Đáp án là số (${targetPart.index + 1}).`} />
      )}

      <div className="flex gap-2">
        {feedback?.type === 'correct' || feedback?.type === 'reveal' ? (
          <button
            type="button"
            onClick={advance}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold cursor-pointer"
          >
            {asked >= ROUND ? 'Xem kết quả' : 'Câu tiếp theo'}
          </button>
        ) : (
          <button
            type="button"
            onClick={reveal}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:border-[#1E3F82]/40 hover:text-[#1E3F82] text-sm font-bold cursor-pointer"
          >
            Xem đáp án
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setPhase('intro');
            setTarget(null);
          }}
          className="px-4 py-2.5 rounded-xl text-stone-500 hover:text-stone-800 text-sm font-semibold cursor-pointer"
        >
          Dừng
        </button>
      </div>
    </div>
  );
}

function FeedbackBox({ tone, icon, text }: { tone: 'ok' | 'bad' | 'info'; icon: React.ReactNode; text: string }) {
  const cls =
    tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : tone === 'bad' ? 'bg-rose-50 text-rose-700' : 'bg-[#E8F0FB] text-[#1E3F82]';
  return (
    <div className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ${cls}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

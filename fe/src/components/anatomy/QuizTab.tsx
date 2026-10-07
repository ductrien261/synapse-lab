'use client';

import Link from 'next/link';
import { track } from '@/lib/analytics';
import { useEffect, useEffectEvent, useState } from 'react';
import {
  ArrowRight,
  BoxArrowUpRight,
  CheckCircleFill,
  Controller,
  Flag,
  Lightbulb,
  PersonLinesFill,
  Stars,
  XCircleFill,
} from 'react-bootstrap-icons';
import { refreshAiQuota } from '@/lib/ai';
import {
  KIND_LABEL,
  learnerApi,
  reviewIn,
  type AnswerResult,
  type QuizItemPublic,
  type ReviewSession,
  type SourceRef,
} from '@/lib/learner';
import { RichText } from './tutor/RichText';
import { partName, type PartItem } from './types';

type Phase = 'intro' | 'loading' | 'question' | 'grading' | 'result' | 'summary';

interface Done {
  name: string;
  kind: QuizItemPublic['kind'];
  correct: boolean;
  misconception: string;
}

/**
 * Tab "Ôn tập" thích ứng: AI chọn bộ phận bạn cần ôn (đến hạn, chưa học, còn yếu) và dạng câu
 * phù hợp mức nắm vững (nhận diện 3D -> trắc nghiệm/tình huống -> tự luận), chấm + phản hồi hiểu nhầm.
 */
export function QuizTab({
  modelUid,
  parts,
  onSelect,
  onPick,
  onActiveChange,
}: {
  modelUid: string;
  parts: PartItem[];
  onSelect: (index: number) => void;
  /** đăng ký nhận sự kiện người dùng chọn một bộ phận */
  onPick: (fn: (index: number) => void) => () => void;
  onActiveChange: (active: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [item, setItem] = useState<QuizItemPublic | null>(null);
  const [reason, setReason] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [done, setDone] = useState<Done[]>([]);
  const [error, setError] = useState('');
  const [reported, setReported] = useState(false);
  const [openSource, setOpenSource] = useState<SourceRef | null>(null);
  const [lastChoice, setLastChoice] = useState<number | null>(null);

  // Câu nhận diện đang chờ trả lời: ẩn tên chú thích trên 3D để không lộ đáp án
  const identifying = phase === 'question' && item?.kind === 'identify';
  useEffect(() => {
    onActiveChange(identifying);
    return () => onActiveChange(false);
  }, [identifying, onActiveChange]);

  const loadItem = async (s: ReviewSession) => {
    setPhase('loading');
    setError('');
    setResult(null);
    setText('');
    setReported(false);
    setOpenSource(null);
    try {
      const res = await learnerApi.item(s.id);
      setItem(res.item);
      setReason(res.reason);
      setPhase('question');
      refreshAiQuota();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được câu hỏi');
      setPhase('intro');
    }
  };

  const start = async () => {
    setError('');
    setDone([]);
    setPhase('loading');
    try {
      track('review_started', { model: modelUid });
      const s = await learnerApi.startReview(modelUid);
      setSession(s);
      await loadItem(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa bắt đầu được');
      setPhase('intro');
    }
  };

  const submit = async (answer: { choice?: number; picked_index?: number | null; text?: string }) => {
    if (!session || !item) return;
    setPhase('grading');
    try {
      const res = await learnerApi.answer(session.id, item.id, answer);
      setResult(res);
      setSession(res.session);
      setDone((d) => [...d, { name: item.structure.name_vi || item.structure.name_en, kind: item.kind, correct: res.correct, misconception: res.misconception }]);
      setPhase('result');
      if (item.kind === 'identify' && res.correct_index !== null) onSelect(res.correct_index);
      if (item.kind === 'short') refreshAiQuota();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa chấm được');
      setPhase('question');
    }
  };

  const next = () => {
    if (!session) return;
    if (session.finished) setPhase('summary');
    else void loadItem(session);
  };

  // Câu nhận diện: người học bấm vào bộ phận trên mô hình (hoặc thanh bên dưới)
  const onPartPicked = useEffectEvent((index: number) => {
    if (phase === 'question' && item?.kind === 'identify') void submit({ picked_index: index });
  });
  useEffect(() => onPick((index) => onPartPicked(index)), [onPick]);

  const partLabel = (index: number | null) => {
    const p = parts.find((x) => x.index === index);
    return p ? partName(p) : '';
  };

  if (phase === 'intro' || phase === 'summary') {
    const correct = done.filter((d) => d.correct).length;
    return (
      <div className="flex flex-col items-center text-center px-6 py-8 gap-3">
        <span className="w-14 h-14 rounded-2xl bg-[#E8F0FB] text-[#1E3F82] flex items-center justify-center">
          <Controller className="w-6 h-6" />
        </span>
        {phase === 'intro' ? (
          <>
            <h3 className="text-base font-bold text-stone-900">Ôn tập cùng AI</h3>
            <p className="text-sm text-stone-500">
              AI chọn những bộ phận bạn <b>cần ôn</b> (đến hạn, chưa học, còn yếu) và ra câu hỏi hợp với mức hiện tại của bạn: bấm trên mô hình 3D,
              trắc nghiệm, tình huống lâm sàng hoặc tự luận.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-base font-bold text-stone-900">Xong lượt ôn tập!</h3>
            <p className="text-3xl font-extrabold text-[#1E3F82] tabular-nums">
              {correct}/{done.length}
            </p>
            <ul className="w-full text-left flex flex-col gap-1.5 mt-1">
              {done.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {d.correct ? <CheckCircleFill className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" /> : <XCircleFill className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" />}
                  <span>
                    <b className="text-stone-800">{d.name}</b> <span className="text-stone-400">· {KIND_LABEL[d.kind]}</span>
                    {d.misconception && <span className="block text-xs text-amber-700">AI ghi nhận: {d.misconception}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1E3F82] hover:underline">
              <PersonLinesFill className="w-4 h-4" /> Xem hồ sơ học tập
            </Link>
          </>
        )}
        {error && <div className="w-full rounded-xl bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</div>}
        <button
          type="button"
          onClick={() => void start()}
          className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold cursor-pointer"
        >
          <Stars className="w-4 h-4" /> {phase === 'intro' ? 'Bắt đầu (5 câu)' : 'Ôn thêm 5 câu'}
        </button>
      </div>
    );
  }

  if (phase === 'loading' || !item || !session) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-sm text-stone-500">
        <span className="w-6 h-6 rounded-full border-2 border-[#1E3F82] border-t-transparent animate-spin" />
        Đang chuẩn bị câu hỏi riêng cho bạn...
        <span className="text-xs text-stone-400">Câu mới do AI soạn có thể mất vài giây.</span>
      </div>
    );
  }

  const total = session.plan.length;
  const position = Math.min(result ? session.position : session.position + 1, total);

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Tiến độ */}
      <div>
        <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
          <span>
            Câu {position}/{total} · <span className="font-semibold text-[#1E3F82]">{KIND_LABEL[item.kind]}</span>
          </span>
          {reason && <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{reason}</span>}
        </div>
        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full bg-[#1E3F82] transition-[width] duration-500" style={{ width: `${(position / total) * 100}%` }} />
        </div>
      </div>

      <p className="text-sm font-semibold text-stone-900 leading-relaxed">{item.question}</p>

      {/* Trả lời */}
      {item.kind === 'identify' && phase === 'question' && (
        <div className="rounded-xl bg-[#F4F7FC] border border-[#DDE6F5] px-3 py-2.5 text-sm text-stone-600 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
          <span>
            Bấm vào số trên mô hình 3D (hoặc chọn ở thanh bên dưới).{' '}
            <button type="button" onClick={() => void submit({ picked_index: null })} className="font-bold text-[#1E3F82] hover:underline cursor-pointer">
              Mình chưa biết
            </button>
          </span>
        </div>
      )}

      {(item.kind === 'mcq' || item.kind === 'case') && (
        <div className="flex flex-col gap-2">
          {item.options.map((o, i) => {
            const answered = phase === 'result' && result;
            const isCorrect = answered && i === result.correct_index;
            const isPicked = answered && !result.correct && i === lastChoice;
            return (
              <button
                key={i}
                type="button"
                disabled={phase !== 'question'}
                onClick={() => {
                  setLastChoice(i);
                  void submit({ choice: i });
                }}
                className={`text-left text-sm px-3 py-2.5 rounded-xl border transition-colors ${
                  isCorrect
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : isPicked
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
      )}

      {item.kind === 'short' && (
        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={phase !== 'question'}
            rows={4}
            maxLength={2000}
            placeholder="Trả lời bằng lời của bạn (1–3 câu)..."
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm leading-relaxed focus:outline-none focus:border-[#1E3F82] disabled:bg-stone-50"
          />
          {phase === 'question' && (
            <button
              type="button"
              disabled={!text.trim()}
              onClick={() => void submit({ text })}
              className="self-end px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              Nộp bài
            </button>
          )}
        </div>
      )}

      {phase === 'grading' && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span className="w-4 h-4 rounded-full border-2 border-[#1E3F82] border-t-transparent animate-spin" />
          {item.kind === 'short' ? 'AI đang chấm bài của bạn...' : 'Đang chấm...'}
        </div>
      )}

      {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</div>}

      {/* Kết quả + phản hồi */}
      {phase === 'result' && result && (
        <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${result.correct ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
          <div className={`flex items-center gap-2 font-bold ${result.correct ? 'text-emerald-700' : 'text-amber-700'}`}>
            {result.correct ? <CheckCircleFill className="w-5 h-5" /> : <XCircleFill className="w-5 h-5" />}
            {item.kind === 'short'
              ? `Đạt ${Math.round(result.score * 100)}%`
              : result.correct
                ? 'Chính xác!'
                : item.kind === 'identify' && result.correct_index !== null
                  ? `Chưa đúng — đây mới là ${partLabel(result.correct_index) || 'bộ phận cần tìm'} (đã chỉ trên mô hình)`
                  : 'Chưa đúng'}
          </div>

          {result.misconception && (
            <div className="rounded-xl bg-white border border-amber-200 px-3 py-2 text-sm text-amber-800">
              <b>AI ghi nhận:</b> {result.misconception}. Mình sẽ ưu tiên giúp bạn phân biệt phần này ở các lượt sau.
            </div>
          )}

          {item.kind === 'short' && result.rubric.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {result.rubric.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  {result.hits.includes(i) ? <CheckCircleFill className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" /> : <XCircleFill className="w-4 h-4 mt-0.5 text-stone-300 shrink-0" />}
                  <RichText text={r} citations={result.citations} onCite={setOpenSource} />
                </li>
              ))}
            </ul>
          )}

          {result.feedback && <RichText text={result.feedback} citations={result.citations} onCite={setOpenSource} />}
          {result.explanation && item.kind !== 'identify' && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">{item.kind === 'short' ? 'Đáp án mẫu' : 'Giải thích'}</div>
              <RichText text={result.explanation} citations={result.citations} onCite={setOpenSource} />
            </div>
          )}

          {openSource && (
            <div className="rounded-xl bg-white border border-stone-200 p-3 text-xs">
              <div className="font-semibold text-stone-800">
                [{openSource.n}] {openSource.heading}
              </div>
              <p className="mt-1 text-stone-600 leading-relaxed line-clamp-5">“{openSource.excerpt}”</p>
              {openSource.url && (
                <a href={openSource.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-bold text-[#1E3F82] hover:underline">
                  Đọc trong sách <BoxArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <span>
              Hồ sơ đã cập nhật · {reviewIn(result.mastery.next_review_at)}
            </span>
            {item.source === 'ai' && (
              <button
                type="button"
                disabled={reported}
                onClick={() => {
                  setReported(true);
                  void learnerApi.report(item.id).catch(() => undefined);
                }}
                className="inline-flex items-center gap-1 hover:text-rose-600 disabled:text-stone-400 cursor-pointer"
              >
                <Flag className="w-3 h-3" /> {reported ? 'Đã báo câu hỏi' : 'Báo câu hỏi sai'}
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold cursor-pointer"
            >
              {session.finished ? 'Xem kết quả' : 'Câu tiếp'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

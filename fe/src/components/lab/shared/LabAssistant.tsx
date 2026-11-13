'use client';

import { useState } from 'react';
import { ApiError, getAccessToken } from '@/lib/api';
import { labAiApi, type LabAiLab, type LabAiMode, type LabAiResult } from '@/lib/lab-ai';
import { Card } from './LabUi';

interface Props {
  lab: LabAiLab;
  /** Giai đoạn hiện tại (gửi kèm để trợ lý hiểu ngữ cảnh) */
  stage: string;
  /** Lấy số liệu mô phỏng đã tính sẵn tại thời điểm bấm hỏi */
  getState: () => Record<string, unknown>;
  /** Cho phép xin gợi ý (dùng ở bước tính toán) */
  canHint?: boolean;
}

/**
 * Trợ lý AI giải thích. Chỉ đọc số liệu mô phỏng và giải thích; không tự tính vật lý.
 */
export function LabAssistant({ lab, stage, getState, canHint = false }: Props) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<LabAiResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const loggedIn = typeof window !== 'undefined' && Boolean(getAccessToken());

  const ask = async (mode: LabAiMode) => {
    if (busy) return;
    if (mode === 'ask' && !question.trim()) {
      setError('Hãy nhập câu hỏi trước khi gửi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      setResult(await labAiApi.explain({ lab, mode, stage, state: getState(), question: mode === 'ask' ? question.trim() : '' }));
    } catch (e) {
      setResult(null);
      setError(e instanceof ApiError ? e.message : 'Không gọi được trợ lý. Hãy thử lại sau.');
    } finally {
      setBusy(false);
    }
  };

  const btn = 'rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-[#1E3F82]/40 disabled:opacity-50';

  return (
    <Card title="Trợ lý giải thích">
      {!loggedIn ? (
        <p className="text-sm text-stone-500">Đăng nhập để hỏi trợ lý AI về số liệu trong bài.</p>
      ) : (
        <>
          <p className="text-xs text-stone-400">Trợ lý chỉ đọc số liệu của bài và giải thích, không tự tính thay bạn.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={busy} onClick={() => ask('explain')}>
              Giải thích tình huống này
            </button>
            {canHint && (
              <button type="button" className={btn} disabled={busy} onClick={() => ask('hint')}>
                Gợi ý cho bước này
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask('ask')}
              maxLength={500}
              placeholder="Hỏi một điều bạn thắc mắc"
              aria-label="Câu hỏi cho trợ lý"
              className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm"
            />
            <button type="button" className={btn} disabled={busy} onClick={() => ask('ask')}>
              Hỏi
            </button>
          </div>
          {busy && <p className="text-sm text-stone-400">Đang suy nghĩ…</p>}
          {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}
          {result && !busy && (
            <div className="rounded-lg bg-[#EEF3FC] px-3 py-2 text-sm text-stone-700">
              <p className="font-semibold text-[#0F2258]">{result.title}</p>
              <p className="mt-1 whitespace-pre-line">{result.content}</p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

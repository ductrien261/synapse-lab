'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, getAccessToken } from '@/lib/api';
import { labAiApi, type LabAiLab, type LabAiMode } from '@/lib/lab-ai';
import { Card } from './LabUi';

interface Props {
  lab: LabAiLab;
  /** Mô tả bài (chỉ cần khi lab là 'generic', tức bài không phải ba bài viết tay) */
  context?: string;
  /** Giai đoạn hiện tại (gửi kèm để trợ lý hiểu ngữ cảnh) */
  stage: string;
  /** Lấy số liệu mô phỏng đã tính sẵn tại thời điểm bấm hỏi */
  getState: () => Record<string, unknown>;
  /** Cho phép xin gợi ý (dùng ở bước tính toán và đi dây) */
  canHint?: boolean;
}

interface Msg {
  role: 'user' | 'assistant' | 'error';
  text: string;
}

/** Số lượt gần nhất gửi kèm để trợ lý trả lời nối tiếp */
const HISTORY_TURNS = 8;
/** Giữ cuộc trò chuyện của từng bài khi người học đổi bước (mất khi tải lại trang) */
const chats = new Map<string, Msg[]>();

/**
 * Trợ lý giải thích dạng trò chuyện. Nhớ các lượt trước trong cùng bài, nhưng chỉ đọc số liệu mô phỏng
 * hiện tại và giải thích, không tự tính vật lý.
 */
export function LabAssistant({ lab, context, stage, getState, canHint = false }: Props) {
  const [msgs, setMsgsState] = useState<Msg[]>(() => chats.get(lab) ?? []);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const loggedIn = typeof window !== 'undefined' && Boolean(getAccessToken());

  const setMsgs = (next: Msg[]) => {
    chats.set(lab, next);
    setMsgsState(next);
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, busy]);

  const ask = async (mode: LabAiMode, label?: string) => {
    if (busy) return;
    const text = mode === 'ask' ? question.trim() : (label ?? '');
    if (mode === 'ask' && !text) return;
    const history = msgs
      .filter((m): m is Msg & { role: 'user' | 'assistant' } => m.role !== 'error')
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.text }));
    const withUser: Msg[] = [...msgs, { role: 'user', text }];
    setMsgs(withUser);
    if (mode === 'ask') setQuestion('');
    setBusy(true);
    try {
      const r = await labAiApi.explain({ lab, mode, stage, state: getState(), question: mode === 'ask' ? text : '', history, context });
      setMsgs([...withUser, { role: 'assistant', text: r.content }]);
    } catch (e) {
      setMsgs([...withUser, { role: 'error', text: e instanceof ApiError ? e.message : 'Không gọi được trợ lý. Hãy thử lại sau.' }]);
    } finally {
      setBusy(false);
    }
  };

  const btn = 'rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-[#1E3F82]/40 disabled:opacity-50';

  return (
    <Card title="Trợ lý giải thích">
      {!loggedIn ? (
        <p className="text-sm text-stone-500">Đăng nhập để trò chuyện với trợ lý AI về bài đang làm.</p>
      ) : (
        <>
          <p className="text-xs text-stone-400">Trợ lý nhớ cuộc trò chuyện, chỉ đọc số liệu của bài và giải thích, không tự tính thay bạn.</p>
          <div ref={listRef} className="flex max-h-72 min-h-16 flex-col gap-2 overflow-y-auto rounded-lg bg-stone-50 p-2" aria-live="polite">
            {msgs.length === 0 && <p className="px-1 py-2 text-sm text-stone-400">Hãy hỏi bất cứ điều gì về bài này, hoặc bấm một gợi ý bên dưới.</p>}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[92%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'self-end bg-[#1E3F82] text-white' : m.role === 'error' ? 'self-start bg-amber-50 text-amber-800' : 'self-start bg-[#EEF3FC] text-stone-700'
                }`}
              >
                {m.text}
              </div>
            ))}
            {busy && <p className="self-start px-1 text-sm text-stone-400">Đang suy nghĩ…</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={busy} onClick={() => ask('explain', 'Giải thích tình huống này')}>
              Giải thích tình huống này
            </button>
            {canHint && (
              <button type="button" className={btn} disabled={busy} onClick={() => ask('hint', 'Gợi ý cho bước này')}>
                Gợi ý cho bước này
              </button>
            )}
            {msgs.length > 0 && (
              <button type="button" className="px-1 text-xs font-semibold text-stone-400 hover:text-stone-600" disabled={busy} onClick={() => setMsgs([])}>
                Xóa cuộc trò chuyện
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask('ask')}
              maxLength={500}
              placeholder="Nhắn cho trợ lý…"
              aria-label="Tin nhắn cho trợ lý"
              className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm"
            />
            <button type="button" className={btn} disabled={busy || !question.trim()} onClick={() => ask('ask')}>
              Gửi
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

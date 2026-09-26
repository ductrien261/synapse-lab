'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import {
  BoxArrowUpRight,
  ChatLeftText,
  CheckCircleFill,
  ClockHistory,
  ExclamationTriangleFill,
  HandThumbsDown,
  HandThumbsDownFill,
  HandThumbsUp,
  HandThumbsUpFill,
  Lightning,
  PinMapFill,
  PlusLg,
  Robot,
  Send,
  Stars,
  Trash,
  XLg,
} from 'react-bootstrap-icons';
import { TokenQuotaCard } from '@/components/ai/TokenQuotaCard';
import { refreshAiQuota } from '@/lib/ai';
import { tutorApi, type ConversationSummary, type TutorCitation, type TutorMessage } from '@/lib/tutor';
import { QuickCheckCard } from './tutor/QuickCheckCard';
import { RichText } from './tutor/RichText';
import { partName, type PartItem } from './types';

interface Draft {
  question: string;
  text: string;
  status: string;
}

function userMessage(content: string, partIndex: number | null): TutorMessage {
  return {
    id: -Date.now(), role: 'user', content, status: '', part_index: partIndex, citations: [], highlights: [],
    suggestions: [], from_cache: false, feedback: null, quick_check: null, created_at: '',
  };
}

/**
 * Tab "Hỏi AI" — gia sư Synapse: trả lời dần từng chữ, chỉ dựa trên giáo trình, có trích dẫn,
 * làm sáng bộ phận trên mô hình 3D, kiểm tra nhanh và 👍/👎.
 */
export function AskAiTab({
  part,
  parts,
  modelTitle,
  modelUid,
  onFocusPart,
}: {
  part: PartItem | null;
  parts: PartItem[];
  modelTitle: string;
  modelUid: string;
  onFocusPart: (index: number) => void;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [cite, setCite] = useState<TutorCitation | null>(null);
  const [history, setHistory] = useState<ConversationSummary[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  const subject = part ? partName(part) : modelTitle;
  const starters = part
    ? [`${subject} có chức năng gì?`, `${subject} nằm ở đâu, liên quan với cấu trúc nào?`, `Bệnh lý thường gặp liên quan tới ${subject}?`]
    : ['Mô hình này mô tả điều gì?', 'Những bộ phận quan trọng cần nhớ trong mô hình?'];

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, draft?.text]);

  useEffect(() => () => abort.current?.abort(), []);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || draft) return;
    setInput('');
    setError('');
    setDraft({ question: q, text: '', status: 'Đang tìm trong giáo trình...' });
    const controller = new AbortController();
    abort.current = controller;
    const partIndex = part?.index ?? null;
    let failed = '';
    try {
      track('ai_question_asked', { model: modelUid });
      await tutorApi.ask(
        { question: q, model_uid: modelUid, part_index: partIndex, conversation_id: conversationId },
        {
          onMeta: setConversationId,
          onStatus: (text) => setDraft((d) => (d ? { ...d, status: text } : d)),
          onToken: (text) => setDraft((d) => (d ? { ...d, text: d.text + text, status: '' } : d)),
          onReplace: (text) => setDraft((d) => (d ? { ...d, text, status: '' } : d)),
          onDone: (msg) => {
            setMessages((list) => [...list, userMessage(q, partIndex), msg]);
            // Làm sáng bộ phận đầu tiên được nhắc tới trên mô hình 3D
            if (msg.highlights.length > 0 && msg.highlights[0] !== partIndex) onFocusPart(msg.highlights[0]);
          },
          onError: (message) => {
            failed = message;
          },
        },
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) failed = err instanceof Error ? err.message : 'Không gửi được câu hỏi';
    } finally {
      setDraft(null);
      abort.current = null;
      refreshAiQuota();
    }
    if (failed) {
      setError(failed);
      setInput(q);
    }
  };

  const newConversation = () => {
    abort.current?.abort();
    setConversationId(null);
    setMessages([]);
    setError('');
    setShowHistory(false);
  };

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) {
      tutorApi
        .conversations(modelUid)
        .then(setHistory)
        .catch(() => setHistory([]));
    }
  };

  const loadConversation = (id: string) => {
    tutorApi
      .conversation(id)
      .then((c) => {
        setConversationId(c.id);
        setMessages(c.messages);
        setShowHistory(false);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Không mở được cuộc trò chuyện'));
  };

  const removeConversation = (id: string) => {
    tutorApi
      .deleteConversation(id)
      .then(() => {
        setHistory((h) => h?.filter((c) => c.id !== id) ?? null);
        if (id === conversationId) newConversation();
      })
      .catch(() => undefined);
  };

  const setFeedback = (m: TutorMessage, value: 1 | -1) => {
    const next = m.feedback === value ? 0 : value;
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, feedback: next || null } : x)));
    tutorApi.feedback(m.id, next).catch(() => undefined);
  };

  const partLabel = (index: number) => {
    const p = parts.find((x) => x.index === index);
    return p ? partName(p) : `#${index + 1}`;
  };

  const empty = messages.length === 0 && !draft;
  const last = messages[messages.length - 1];

  return (
    <div className="flex flex-col min-h-full">
      {/* Thanh trên */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-800">
          <Robot className="w-4 h-4 text-[#1E3F82]" /> Gia sư Synapse
        </span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Lịch sử trò chuyện" onClick={toggleHistory} active={showHistory}>
            <ClockHistory className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton label="Cuộc trò chuyện mới" onClick={newConversation}>
            <PlusLg className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>
      <div className="px-4 pb-2">
        <TokenQuotaCard compact />
      </div>

      {showHistory && (
        <div className="mx-4 mb-2 rounded-xl border border-stone-200 bg-white max-h-56 overflow-y-auto">
          {history === null ? (
            <div className="p-3 text-xs text-stone-500">Đang tải...</div>
          ) : history.length === 0 ? (
            <div className="p-3 text-xs text-stone-500">Chưa có cuộc trò chuyện nào với mô hình này.</div>
          ) : (
            history.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 px-3 py-2 border-t first:border-t-0 border-stone-100 text-sm ${c.id === conversationId ? 'bg-[#F4F7FC]' : ''}`}
              >
                <button type="button" onClick={() => loadConversation(c.id)} className="flex-1 min-w-0 text-left truncate text-stone-700 hover:text-[#1E3F82] cursor-pointer">
                  <ChatLeftText className="w-3 h-3 inline mr-1.5 text-stone-400" />
                  {c.title || 'Cuộc trò chuyện'}
                </button>
                <button type="button" onClick={() => removeConversation(c.id)} className="text-stone-300 hover:text-rose-600 cursor-pointer" aria-label="Xóa">
                  <Trash className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Nội dung */}
      <div className="flex-1 flex flex-col gap-4 px-4 pb-4">
        {empty && (
          <>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                <Stars className="w-3.5 h-3.5 text-amber-500" /> Câu hỏi gợi ý
              </div>
              <div className="flex flex-col gap-2">
                {starters.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void ask(q)}
                    className="text-left rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-700 bg-white hover:border-[#1E3F82]/40 hover:bg-[#F7F9FD] cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-[#1E3F82] text-white text-sm px-3.5 py-2">
              {m.content}
            </div>
          ) : (
            <div key={m.id} className="flex flex-col gap-2">
              <div className="rounded-2xl rounded-bl-md bg-white border border-stone-200/90 px-3.5 py-3">
                <RichText text={m.content} citations={m.citations} onCite={setCite} />
                <StatusLine message={m} />
              </div>

              {m.highlights.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <PinMapFill className="w-3 h-3 text-[#1E3F82]" />
                  {m.highlights.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onFocusPart(i)}
                      className="px-2 py-0.5 rounded-full bg-[#E8F0FB] text-[#1E3F82] font-semibold hover:bg-[#1E3F82] hover:text-white cursor-pointer"
                    >
                      {partLabel(i)}
                    </button>
                  ))}
                </div>
              )}

              {m.id > 0 && (
                <div className="flex flex-wrap items-start gap-2">
                  {m.citations.length > 0 && (
                    <QuickCheckCard key={m.id} messageId={m.id} initial={m.quick_check} citations={m.citations} onCite={setCite} />
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <IconButton label="Hữu ích" onClick={() => setFeedback(m, 1)} active={m.feedback === 1}>
                      {m.feedback === 1 ? <HandThumbsUpFill className="w-3.5 h-3.5" /> : <HandThumbsUp className="w-3.5 h-3.5" />}
                    </IconButton>
                    <IconButton label="Chưa tốt" onClick={() => setFeedback(m, -1)} active={m.feedback === -1}>
                      {m.feedback === -1 ? <HandThumbsDownFill className="w-3.5 h-3.5" /> : <HandThumbsDown className="w-3.5 h-3.5" />}
                    </IconButton>
                  </div>
                </div>
              )}

              {m === last && m.suggestions.length > 0 && !draft && (
                <div className="flex flex-wrap gap-1.5">
                  {m.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void ask(s)}
                      className="text-xs px-2.5 py-1 rounded-full border border-stone-200 bg-white text-stone-600 hover:border-[#1E3F82]/40 hover:text-[#1E3F82] cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}

        {draft && (
          <>
            <div className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-[#1E3F82] text-white text-sm px-3.5 py-2">{draft.question}</div>
            <div className="rounded-2xl rounded-bl-md bg-white border border-stone-200/90 px-3.5 py-3">
              {draft.text ? (
                <RichText text={`${draft.text} ▍`} citations={[]} onCite={() => undefined} />
              ) : (
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[#1E3F82] border-t-transparent animate-spin" />
                  {draft.status || 'Đang suy nghĩ...'}
                </div>
              )}
              {draft.text && draft.status && <div className="mt-2 text-xs text-stone-500">{draft.status}</div>}
            </div>
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 text-rose-700 text-sm px-3 py-2">
            <ExclamationTriangleFill className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}
        <div ref={bottom} />
      </div>

      {/* Nguồn đang xem */}
      {cite && (
        <div className="sticky bottom-[68px] mx-4 mb-2 rounded-xl border border-stone-200 bg-white shadow-lg p-3 text-xs">
          <div className="flex items-start gap-2">
            <span className="font-bold text-[#1E3F82]">[{cite.n}]</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-800">{cite.document_title}</div>
              <div className="text-stone-500">
                {cite.heading}
                {cite.page_label && ` · ${cite.page_label}`}
              </div>
            </div>
            <button type="button" onClick={() => setCite(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer" aria-label="Đóng">
              <XLg className="w-3 h-3" />
            </button>
          </div>
          <p className="mt-2 text-stone-600 leading-relaxed line-clamp-6">“{cite.excerpt}…”</p>
          {cite.url && (
            <a href={cite.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-[#1E3F82] hover:underline">
              Đọc trong sách <BoxArrowUpRight className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Ô nhập */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="sticky bottom-0 p-3 border-t border-stone-100 bg-white"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 pl-4 pr-1.5 py-1.5 focus-within:border-[#1E3F82]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1000}
            placeholder={part ? `Hỏi về ${subject}...` : 'Hỏi về mô hình này...'}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || Boolean(draft)}
            aria-label="Gửi"
            className="w-9 h-9 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white flex items-center justify-center disabled:bg-stone-300 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function StatusLine({ message }: { message: TutorMessage }) {
  const items: { icon: React.ReactNode; text: string; cls: string }[] = [];
  if (message.status === 'ok' && message.citations.length > 0)
    items.push({ icon: <CheckCircleFill className="w-3 h-3" />, text: `Đã đối chiếu ${message.citations.length} nguồn giáo trình`, cls: 'text-emerald-700' });
  if (message.status === 'unverified')
    items.push({ icon: <ExclamationTriangleFill className="w-3 h-3" />, text: 'Một vài ý chưa có trích dẫn, hãy kiểm tra lại nguồn', cls: 'text-amber-700' });
  if (message.from_cache) items.push({ icon: <Lightning className="w-3 h-3" />, text: 'Câu trả lời có sẵn · 0 token', cls: 'text-sky-700' });
  if (items.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-stone-100 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
      {items.map((it) => (
        <span key={it.text} className={`inline-flex items-center gap-1 ${it.cls}`}>
          {it.icon} {it.text}
        </span>
      ))}
    </div>
  );
}

function IconButton({ label, onClick, active = false, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
        active ? 'bg-[#E8F0FB] text-[#1E3F82]' : 'text-stone-400 hover:text-[#1E3F82] hover:bg-stone-100'
      }`}
    >
      {children}
    </button>
  );
}

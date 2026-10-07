'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { BoxArrowUpRight, CheckLg, HandThumbsDownFill, HandThumbsUpFill, SlashCircle, ArrowCounterclockwise } from 'react-bootstrap-icons';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import {
  FEEDBACK_KINDS,
  FEEDBACK_STATUS,
  qualityApi,
  type FeedbackItem,
  type FeedbackStatus,
  type QualitySummary,
  type RatedAnswer,
  type ReportedQuiz,
} from '@/lib/feedback';

type Tab = 'feedback' | 'answers' | 'quiz';

const KIND_LABEL = Object.fromEntries(FEEDBACK_KINDS.map((k) => [k.key, k.label]));
const time = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

export default function QualityPage() {
  const [tab, setTab] = useState<Tab>('feedback');
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    qualityApi.summary().then(setSummary).catch(() => undefined);
  }, [tick]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'feedback', label: 'Góp ý', count: summary?.feedback_new },
    { key: 'answers', label: 'Câu trả lời AI', count: summary?.answers_down_open },
    { key: 'quiz', label: 'Câu ôn tập bị báo', count: summary?.quiz_open },
  ];

  return (
    <>
      <AdminPageHeader title="Góp ý & chất lượng" description="Góp ý của người dùng, đánh giá câu trả lời AI và câu ôn tập bị báo sai." />

      {summary && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat label="Góp ý mới" value={summary.feedback_new} />
          <Stat label="Câu trả lời 👍" value={summary.answers_up} tone="text-emerald-600" />
          <Stat label="Câu trả lời 👎" value={summary.answers_down} tone="text-rose-600" />
          <Stat label="Câu ôn tập cần xem" value={summary.quiz_open} tone="text-amber-600" />
        </div>
      )}

      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`relative shrink-0 px-4 py-3 text-sm font-bold cursor-pointer ${tab === t.key ? 'text-[#1E3F82]' : 'text-stone-500 hover:text-stone-800'}`}
          >
            {t.label}
            {!!t.count && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 text-xs tabular-nums">{t.count}</span>}
            {tab === t.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#1E3F82]" />}
          </button>
        ))}
      </div>

      {tab === 'feedback' && <FeedbackTab onChange={refresh} />}
      {tab === 'answers' && <AnswersTab onChange={refresh} />}
      {tab === 'quiz' && <QuizTab onChange={refresh} />}
    </>
  );
}

function Stat({ label, value, tone = 'text-stone-900' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 px-4 py-3">
      <div className={`text-2xl font-extrabold tabular-nums ${tone}`}>{value}</div>
      <div className="text-xs font-semibold text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="bg-white rounded-2xl border border-stone-200/90 px-6 py-14 text-center text-sm text-stone-500">{text}</div>;
}

function Loading() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 rounded-2xl bg-stone-200/60 animate-pulse" />
      ))}
    </div>
  );
}

// ------------------------------------------------------------ Góp ý
function FeedbackTab({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<FeedbackStatus | ''>('new');
  const [kind, setKind] = useState('');
  const [data, setData] = useState<{ key: string; items: FeedbackItem[] } | null>(null);
  const key = `${status}|${kind}`;

  useEffect(() => {
    let cancelled = false;
    qualityApi
      .feedback({ status, kind })
      .then((res) => {
        if (!cancelled) setData({ key, items: res.results });
      })
      .catch(() => {
        if (!cancelled) setData({ key, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [status, kind, key]);

  const update = async (item: FeedbackItem, patch: Partial<Pick<FeedbackItem, 'status' | 'admin_note'>>) => {
    const next = await qualityApi.updateFeedback(item.id, patch);
    setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === item.id ? next : x)).filter((x) => !status || x.status === status) } : d));
    onChange();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus | '')} className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm" aria-label="Trạng thái">
          <option value="">Mọi trạng thái</option>
          {Object.entries(FEEDBACK_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm" aria-label="Loại">
          <option value="">Mọi loại</option>
          {FEEDBACK_KINDS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      {data?.key !== key ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <Empty text="Không có góp ý nào." />
      ) : (
        data.items.map((f) => (
          <article key={f.id} className="bg-white rounded-2xl border border-stone-200/90 p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-md bg-[#E8F0FB] text-[#1E3F82] font-bold">{KIND_LABEL[f.kind]}</span>
              <span className="text-stone-500">{time(f.created_at)}</span>
              <span className="text-stone-500">· {f.is_guest ? 'Khách' : f.user_name || 'Thành viên'}</span>
              {f.email && <a href={`mailto:${f.email}`} className="text-[#1E3F82] font-semibold hover:underline">{f.email}</a>}
              <select
                value={f.status}
                onChange={(e) => void update(f, { status: e.target.value as FeedbackStatus })}
                className="ml-auto px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold"
                aria-label="Đổi trạng thái"
              >
                {Object.entries(FEEDBACK_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm leading-relaxed text-stone-800 whitespace-pre-line">{f.message}</p>
            {f.page_url && (
              <Link href={f.page_url} target="_blank" className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-stone-500 hover:text-[#1E3F82]">
                {f.page_url} <BoxArrowUpRight className="w-3 h-3" />
              </Link>
            )}
            <textarea
              defaultValue={f.admin_note}
              onBlur={(e) => e.target.value !== f.admin_note && void update(f, { admin_note: e.target.value })}
              rows={2}
              placeholder="Ghi chú nội bộ (tự lưu khi rời ô)"
              className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </article>
        ))
      )}
    </div>
  );
}

// ------------------------------------------------------------ Câu trả lời AI
function AnswersTab({ onChange }: { onChange: () => void }) {
  const [value, setValue] = useState<'-1' | '1' | ''>('-1');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [data, setData] = useState<{ key: string; items: RatedAnswer[] } | null>(null);
  const [notice, setNotice] = useState('');
  const key = `${value}|${onlyOpen}`;

  useEffect(() => {
    let cancelled = false;
    qualityApi
      .answers({ value, reviewed: onlyOpen ? '0' : '' })
      .then((res) => {
        if (!cancelled) setData({ key, items: res.results });
      })
      .catch(() => {
        if (!cancelled) setData({ key, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [value, onlyOpen, key]);

  const act = async (a: RatedAnswer, action: 'reviewed' | 'purge_cache') => {
    const res = await qualityApi.answerAction(a.id, action);
    setNotice(action === 'purge_cache' ? `Đã gỡ ${res.purged} câu trả lời khỏi bộ nhớ đệm.` : 'Đã đánh dấu đã xem.');
    setData((d) => (d ? { ...d, items: onlyOpen ? d.items.filter((x) => x.id !== a.id) : d.items.map((x) => (x.id === a.id ? { ...x, reviewed: true } : x)) } : d));
    onChange();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex p-1 rounded-xl bg-white border border-stone-200 text-xs font-bold">
          {(
            [
              ['-1', 'Chưa tốt'],
              ['1', 'Hữu ích'],
              ['', 'Tất cả'],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setValue(v)} className={`px-3 py-1.5 rounded-lg cursor-pointer ${value === v ? 'bg-[#1E3F82] text-white' : 'text-stone-500'}`}>
              {label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} className="w-4 h-4 accent-[#1E3F82]" />
          Chỉ hiện chưa xem
        </label>
        {notice && <span className="text-sm text-emerald-700">{notice}</span>}
      </div>
      {data?.key !== key ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <Empty text="Chưa có câu trả lời nào trong mục này." />
      ) : (
        data.items.map((a) => (
          <article key={a.id} className="bg-white rounded-2xl border border-stone-200/90 p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              {a.value === 1 ? <HandThumbsUpFill className="w-4 h-4 text-emerald-600" /> : <HandThumbsDownFill className="w-4 h-4 text-rose-600" />}
              <span>{time(a.created_at)}</span>
              <span>· {a.user_email}</span>
              {a.model && (
                <Link href={`/anatomy/models/${a.model.uid}`} target="_blank" className="font-semibold text-[#1E3F82] hover:underline">
                  · {a.model.title}
                </Link>
              )}
              {a.from_cache && <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold">Từ bộ nhớ đệm</span>}
              {a.status && a.status !== 'ok' && <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-bold">{a.status}</span>}
              {a.reviewed && <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold">Đã xem</span>}
            </div>
            <p className="text-sm font-bold text-stone-900">Hỏi: {a.question || '—'}</p>
            <details className="group">
              <summary className="cursor-pointer text-sm leading-relaxed text-stone-700 line-clamp-3 group-open:line-clamp-none whitespace-pre-line">{a.answer}</summary>
              {a.citations.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-xs text-stone-500">
                  {a.citations.map((c) => (
                    <li key={c.n}>
                      [{c.n}] {c.document_title} {c.heading ? `— ${c.heading}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </details>
            {a.note && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">Ghi chú người học: {a.note}</p>}
            <div className="flex flex-wrap gap-2">
              {!a.reviewed && (
                <button type="button" onClick={() => void act(a, 'reviewed')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:border-[#1E3F82] cursor-pointer">
                  <CheckLg className="w-3.5 h-3.5" /> Đã xem
                </button>
              )}
              <button type="button" onClick={() => void act(a, 'purge_cache')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-rose-600 hover:border-rose-400 cursor-pointer" title="Không dùng lại câu trả lời này cho người hỏi sau">
                <SlashCircle className="w-3.5 h-3.5" /> Gỡ khỏi bộ nhớ đệm
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

// ------------------------------------------------------------ Câu ôn tập bị báo
function QuizTab({ onChange }: { onChange: () => void }) {
  const [items, setItems] = useState<ReportedQuiz[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    qualityApi
      .quiz()
      .then((res) => {
        if (!cancelled) setItems(res.results);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = async (q: ReportedQuiz, data: { status?: ReportedQuiz['status']; reset_reports?: boolean }) => {
    const next = await qualityApi.updateQuiz(q.id, data);
    setItems((list) => (list ?? []).map((x) => (x.id === q.id ? next : x)));
    onChange();
  };

  if (items === null) return <Loading />;
  if (items.length === 0) return <Empty text="Chưa có câu ôn tập nào bị báo." />;

  return (
    <div className="flex flex-col gap-4">
      {items.map((q) => (
        <article key={q.id} className="bg-white rounded-2xl border border-stone-200/90 p-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-600 font-bold">{q.reports} lượt báo</span>
            <span
              className={`px-2 py-1 rounded-md font-bold ${
                q.status === 'active' ? 'bg-emerald-50 text-emerald-700' : q.status === 'review' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {q.status === 'active' ? 'Đang dùng' : q.status === 'review' ? 'Chờ duyệt' : 'Đã tắt'}
            </span>
            <span className="text-stone-500">
              {q.structure.name} · đã hỏi {q.served} lần · đúng {q.correct_count}
            </span>
          </div>
          <p className="text-sm font-bold text-stone-900">{q.question}</p>
          {q.options.length > 0 && (
            <ol className="flex flex-col gap-1.5">
              {q.options.map((o, i) => (
                <li
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${i === q.correct_index ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'bg-stone-50 text-stone-700'}`}
                >
                  {String.fromCharCode(65 + i)}. {o}
                </li>
              ))}
            </ol>
          )}
          {q.explanation && <p className="text-sm text-stone-600">Giải thích: {q.explanation}</p>}
          <div className="flex flex-wrap gap-2">
            {q.status !== 'active' && (
              <button type="button" onClick={() => void update(q, { status: 'active', reset_reports: true })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-emerald-700 hover:border-emerald-400 cursor-pointer">
                <ArrowCounterclockwise className="w-3.5 h-3.5" /> Câu hỏi đúng, dùng lại
              </button>
            )}
            {q.status === 'active' && (
              <button type="button" onClick={() => void update(q, { reset_reports: true })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:border-[#1E3F82] cursor-pointer">
                <CheckLg className="w-3.5 h-3.5" /> Xóa lượt báo
              </button>
            )}
            {q.status !== 'disabled' && (
              <button type="button" onClick={() => void update(q, { status: 'disabled' })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-rose-600 hover:border-rose-400 cursor-pointer">
                <SlashCircle className="w-3.5 h-3.5" /> Tắt câu hỏi
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

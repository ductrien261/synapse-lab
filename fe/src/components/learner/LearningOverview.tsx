'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowCounterclockwise, CheckCircleFill, ExclamationTriangleFill, GearFill, Trash } from 'react-bootstrap-icons';
import { BOX_LABEL, learnerApi, reviewIn, type LearnerProfileData, type MisconceptionRow } from '@/lib/learner';

/** Hồ sơ học tập: tiến độ, những chỗ hay nhầm, mức nắm vững — những gì AI ghi nhớ về bạn. */
export function LearningOverview() {
  const [data, setData] = useState<LearnerProfileData | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    learnerApi
      .profile()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được hồ sơ học tập');
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const mis = (m: MisconceptionRow, action: 'resolve' | 'reopen' | 'delete') => {
    const run =
      action === 'delete'
        ? learnerApi.deleteMisconception(m.id)
        : learnerApi.setMisconception(m.id, action === 'resolve' ? 'resolved' : 'active');
    run.then(() => setReload((n) => n + 1)).catch(() => undefined);
  };

  if (error) return <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3">{error}</div>;
  if (!data) return <div className="h-72 rounded-3xl bg-stone-200/60 animate-pulse" />;

  const active = data.misconceptions.filter((m) => m.status === 'active');
  const resolved = data.misconceptions.filter((m) => m.status === 'resolved');
  const s = data.stats;
  const label = (list: [string, string][], key: string) => list.find(([k]) => k === key)?.[1] ?? key;

  return (
    <>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Bộ phận đã học" value={s.concepts} />
        <Stat label="Đã vững" value={s.mastered} tone="text-emerald-600" />
        <Stat label="Đến hạn ôn" value={s.due_now} tone={s.due_now > 0 ? 'text-amber-600' : 'text-stone-900'} />
        <Stat label="Tỉ lệ đúng" value={s.accuracy === null ? '—' : `${Math.round(s.accuracy * 100)}%`} hint={`${s.attempts} câu đã làm`} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600 bg-white rounded-2xl border border-stone-200/90 px-4 py-3">
        <span>AI đang dạy bạn theo kiểu:</span>
        <b className="text-stone-800">{label(data.choices.level, data.preferences.level)}</b>·
        <b className="text-stone-800">{label(data.choices.style, data.preferences.style)}</b>
        {data.preferences.goals && <span className="text-stone-500">· Mục tiêu: {data.preferences.goals}</span>}
        <Link href="/settings" className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-[#1E3F82] hover:underline">
          <GearFill className="w-3 h-3" /> Đổi trong Cài đặt
        </Link>
      </div>

      {/* Hiểu nhầm */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <ExclamationTriangleFill className="w-4 h-4 text-amber-500" /> Những chỗ bạn hay nhầm
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          AI ghi nhận khi bạn trả lời sai; gia sư sẽ chủ động làm rõ và ra câu hỏi để bạn phân biệt. Làm đúng nhiều lần thì mục tự chuyển sang “đã hiểu”.
        </p>
        {active.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">Chưa có hiểu nhầm nào đang theo dõi. 🎉</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {active.map((m) => (
              <MisRow key={m.id} m={m} onResolve={() => mis(m, 'resolve')} onDelete={() => mis(m, 'delete')} />
            ))}
          </ul>
        )}
        {resolved.length > 0 && (
          <div className="mt-4">
            <button type="button" onClick={() => setShowResolved((v) => !v)} className="text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer">
              {showResolved ? 'Ẩn' : 'Xem'} {resolved.length} mục đã hiểu
            </button>
            {showResolved && (
              <ul className="mt-2 flex flex-col gap-2">
                {resolved.map((m) => (
                  <MisRow key={m.id} m={m} onReopen={() => mis(m, 'reopen')} onDelete={() => mis(m, 'delete')} />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Mức nắm vững */}
      <section className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-base font-bold text-stone-900">Mức nắm vững từng bộ phận</h2>
          <p className="text-sm text-stone-500 mt-1">Làm đúng thì khoảng cách ôn lại dài dần (10 phút → 1 → 2 → 4 → 7 → 16 ngày); làm sai thì ôn lại sớm.</p>
        </div>
        {data.mastery.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-stone-500">
            Chưa có dữ liệu. Mở một mô hình 3D và vào tab <b>Ôn tập</b> để bắt đầu.{' '}
            <Link href="/anatomy" className="font-bold text-[#1E3F82] hover:underline">
              Đi tới Giải phẫu 3D
            </Link>
          </p>
        ) : (
          <ul>
            {data.mastery.map((r) => (
              <li key={r.structure_id} className="flex flex-wrap items-center gap-3 px-6 py-3 border-t border-stone-100">
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm font-semibold text-stone-800">{r.name_vi || r.name_en}</div>
                  <div className="text-xs text-stone-500">
                    {r.correct}/{r.attempts} đúng{r.models.length > 0 && ` · ${r.models.join(', ')}`}
                  </div>
                </div>
                <div className="flex items-center gap-1" title={BOX_LABEL[r.box]}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`w-2.5 h-2.5 rounded-full ${i <= r.box ? (r.box >= 4 ? 'bg-emerald-500' : 'bg-[#1E3F82]') : 'bg-stone-200'}`} />
                  ))}
                </div>
                <div className="w-28 text-right text-xs">
                  <div className="font-semibold text-stone-700">{BOX_LABEL[r.box]}</div>
                  <div className={reviewIn(r.next_review_at) === 'đến hạn ôn' ? 'text-amber-600 font-semibold' : 'text-stone-400'}>{reviewIn(r.next_review_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, hint, tone = 'text-stone-900' }: { label: string; value: number | string; hint?: string; tone?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 px-4 py-3">
      <div className={`text-2xl font-extrabold tabular-nums ${tone}`}>{value}</div>
      <div className="text-xs font-semibold text-stone-500 mt-0.5">{label}</div>
      {hint && <div className="text-[11px] text-stone-400">{hint}</div>}
    </div>
  );
}

function MisRow({ m, onResolve, onReopen, onDelete }: { m: MisconceptionRow; onResolve?: () => void; onReopen?: () => void; onDelete: () => void }) {
  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5 ${m.status === 'active' ? 'border-amber-200 bg-amber-50/50' : 'border-stone-200 bg-stone-50'}`}>
      <div className="flex-1 min-w-[200px]">
        <div className="text-sm text-stone-800">{m.text}</div>
        <div className="text-xs text-stone-500">
          {m.structure && `${m.structure} · `}gặp {m.evidence} lần · {m.source === 'grade' ? 'từ bài tự luận' : 'từ trắc nghiệm'}
        </div>
      </div>
      {onResolve && (
        <button type="button" onClick={onResolve} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
          <CheckCircleFill className="w-3.5 h-3.5" /> Mình hiểu rồi
        </button>
      )}
      {onReopen && (
        <button type="button" onClick={onReopen} className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:underline cursor-pointer">
          <ArrowCounterclockwise className="w-3.5 h-3.5" /> Theo dõi lại
        </button>
      )}
      <button type="button" onClick={onDelete} className="text-stone-400 hover:text-rose-600 cursor-pointer" aria-label="Xóa">
        <Trash className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

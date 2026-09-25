'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowCounterclockwise, CheckLg, ClockHistory, Controller, ExclamationTriangleFill, Trash } from 'react-bootstrap-icons';
import { BOX_LABEL, learnerApi, reviewIn, type LearnerProfileData, type MasteryRow, type MisconceptionRow } from '@/lib/learner';

export function hasLearningData(d: LearnerProfileData) {
  return d.stats.attempts > 0 || d.mastery.length > 0 || d.misconceptions.length > 0;
}

/** Chưa ôn tập lần nào: 1 thẻ gọn thay vì các khung trống. */
export function LearningEmpty() {
  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 px-6 py-10 flex flex-col items-center text-center gap-3">
      <span className="w-12 h-12 rounded-2xl bg-[#E8F0FB] text-[#1E3F82] flex items-center justify-center">
        <Controller className="w-6 h-6" />
      </span>
      <h2 className="text-base font-bold text-stone-900">Chưa có hồ sơ học tập</h2>
      <p className="text-sm text-stone-500 max-w-md">
        Làm vài lượt ôn tập ở mô hình 3D. AI sẽ ghi nhớ tiến độ và những chỗ bạn hay nhầm để nhắc bạn ôn đúng lúc.
      </p>
      <Link href="/anatomy" className="mt-1 px-5 py-2.5 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold">
        Bắt đầu ôn tập
      </Link>
    </section>
  );
}

/** Hồ sơ học tập: số liệu + mức nắm vững (trái) + cần ôn & chỗ hay nhầm (phải). */
export function LearningOverview({ data, onChanged }: { data: LearnerProfileData; onChanged: () => void }) {
  const [showResolved, setShowResolved] = useState(false);
  const s = data.stats;
  const active = data.misconceptions.filter((m) => m.status === 'active');
  const resolved = data.misconceptions.filter((m) => m.status === 'resolved');
  const now = Date.now();
  const due = data.mastery.filter((r) => r.next_review_at && new Date(r.next_review_at).getTime() <= now).slice(0, 6);

  const act = (m: MisconceptionRow, action: 'resolve' | 'reopen' | 'delete') => {
    const run =
      action === 'delete'
        ? learnerApi.deleteMisconception(m.id)
        : learnerApi.setMisconception(m.id, action === 'resolve' ? 'resolved' : 'active');
    run.then(onChanged).catch(() => undefined);
  };

  return (
    <>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Bộ phận đã học" value={s.concepts} />
        <Stat label="Đã vững" value={s.mastered} tone="text-emerald-600" />
        <Stat label="Đến hạn ôn" value={s.due_now} tone={s.due_now > 0 ? 'text-amber-600' : 'text-stone-900'} />
        <Stat label="Tỉ lệ đúng" value={s.accuracy === null ? '—' : `${Math.round(s.accuracy * 100)}%`} hint={`${s.attempts} câu đã làm`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <Card title="Mức nắm vững" subtitle="Làm đúng thì lâu mới ôn lại, làm sai thì ôn lại sớm.">
          {data.mastery.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-stone-500">Chưa có bộ phận nào.</p>
          ) : (
            <ul>
              {data.mastery.map((r) => (
                <MasteryItem key={r.structure_id} r={r} />
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Cần ôn bây giờ" icon={<ClockHistory className="w-4 h-4 text-amber-500" />}>
            {due.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-stone-500">Không có bộ phận nào đến hạn.</p>
            ) : (
              <ul className="px-5 pb-4 flex flex-col gap-1.5">
                {due.map((r) => (
                  <li key={r.structure_id} className="text-sm text-stone-700 flex justify-between gap-2">
                    <span className="truncate">{r.name_vi || r.name_en}</span>
                    <span className="text-xs text-stone-400 shrink-0">{r.models[0] ?? ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Chỗ hay nhầm" icon={<ExclamationTriangleFill className="w-4 h-4 text-amber-500" />}>
            {active.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-stone-500">Chưa có chỗ nhầm nào đang theo dõi.</p>
            ) : (
              <ul className="px-3 pb-3 flex flex-col gap-1">
                {active.map((m) => (
                  <MisItem key={m.id} m={m} onResolve={() => act(m, 'resolve')} onDelete={() => act(m, 'delete')} />
                ))}
              </ul>
            )}
            {resolved.length > 0 && (
              <div className="px-5 pb-4">
                <button type="button" onClick={() => setShowResolved((v) => !v)} className="text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer">
                  {showResolved ? 'Ẩn' : 'Xem'} {resolved.length} mục đã hiểu
                </button>
                {showResolved && (
                  <ul className="mt-2 -mx-2 flex flex-col gap-1">
                    {resolved.map((m) => (
                      <MisItem key={m.id} m={m} onReopen={() => act(m, 'reopen')} onDelete={() => act(m, 'delete')} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Card({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          {icon} {title}
        </h2>
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function MasteryItem({ r }: { r: MasteryRow }) {
  const when = reviewIn(r.next_review_at);
  return (
    <li className="flex items-center gap-3 px-5 py-3 border-t border-stone-100">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-stone-800 truncate">{r.name_vi || r.name_en}</div>
        <div className="text-xs text-stone-500 truncate">
          {r.correct}/{r.attempts} đúng{r.models.length > 0 && ` · ${r.models.join(', ')}`}
        </div>
      </div>
      <div className="flex items-center gap-1" title={BOX_LABEL[r.box]}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`w-2 h-2 rounded-full ${i <= r.box ? (r.box >= 4 ? 'bg-emerald-500' : 'bg-[#1E3F82]') : 'bg-stone-200'}`} />
        ))}
      </div>
      <div className="w-24 text-right text-xs">
        <div className="font-semibold text-stone-700">{BOX_LABEL[r.box]}</div>
        <div className={when === 'đến hạn ôn' ? 'text-amber-600 font-semibold' : 'text-stone-400'}>{when}</div>
      </div>
    </li>
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

function MisItem({ m, onResolve, onReopen, onDelete }: { m: MisconceptionRow; onResolve?: () => void; onReopen?: () => void; onDelete: () => void }) {
  return (
    <li className="group flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-stone-50">
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${m.status === 'active' ? 'text-stone-800' : 'text-stone-500 line-through'}`}>{m.text}</div>
        <div className="text-[11px] text-stone-400">
          {m.structure && `${m.structure} · `}gặp {m.evidence} lần
        </div>
      </div>
      {onResolve && (
        <button type="button" onClick={onResolve} title="Mình hiểu rồi" className="p-1 rounded-lg text-stone-400 hover:text-emerald-600 cursor-pointer">
          <CheckLg className="w-4 h-4" />
        </button>
      )}
      {onReopen && (
        <button type="button" onClick={onReopen} title="Theo dõi lại" className="p-1 rounded-lg text-stone-400 hover:text-[#1E3F82] cursor-pointer">
          <ArrowCounterclockwise className="w-3.5 h-3.5" />
        </button>
      )}
      <button type="button" onClick={onDelete} title="Xóa" className="p-1 rounded-lg text-stone-300 hover:text-rose-600 cursor-pointer">
        <Trash className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

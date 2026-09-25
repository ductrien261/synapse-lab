'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowCounterclockwise,
  CheckCircleFill,
  ExclamationTriangleFill,
  EyeFill,
  Trash,
} from 'react-bootstrap-icons';
import { BOX_LABEL, learnerApi, reviewIn, type LearnerProfileData, type MisconceptionRow } from '@/lib/learner';

/** "AI hiểu gì về bạn": minh bạch mọi điều AI ghi nhớ — xem, sửa, xóa được. */
export default function LearningProfilePage() {
  const [data, setData] = useState<LearnerProfileData | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [goals, setGoals] = useState('');
  const [saved, setSaved] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    learnerApi
      .profile()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setGoals(d.preferences.goals);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được hồ sơ');
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const savePref = async (patch: Partial<LearnerProfileData['preferences']>) => {
    setSaved('');
    try {
      await learnerApi.updatePreferences(patch);
      setSaved('Đã lưu. Gia sư AI sẽ dùng thông tin này từ câu hỏi tiếp theo.');
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được');
    }
  };

  const mis = (m: MisconceptionRow, action: 'resolve' | 'reopen' | 'delete') => {
    const run =
      action === 'delete'
        ? learnerApi.deleteMisconception(m.id)
        : learnerApi.setMisconception(m.id, action === 'resolve' ? 'resolved' : 'active');
    run.then(() => setReload((n) => n + 1)).catch(() => undefined);
  };

  if (error) return <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-3">{error}</div>;
  if (!data) return <div className="h-96 rounded-3xl bg-stone-200/60 animate-pulse" />;

  const active = data.misconceptions.filter((m) => m.status === 'active');
  const resolved = data.misconceptions.filter((m) => m.status === 'resolved');
  const s = data.stats;

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-4xl">
      <section className="rounded-3xl bg-gradient-to-br from-[#0F2258] to-[#1E3F82] text-white p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/70">
          <EyeFill className="w-3.5 h-3.5" /> Minh bạch
        </div>
        <h1 className="mt-1 text-2xl font-extrabold">AI hiểu gì về bạn</h1>
        <p className="mt-2 text-sm text-white/80 max-w-2xl leading-relaxed">
          Đây là tất cả những gì gia sư AI ghi nhớ để cá nhân hóa việc học: mức nắm vững từng bộ phận, những chỗ bạn hay nhầm và cách bạn muốn được
          giải thích. Bạn có thể sửa hoặc xóa bất cứ lúc nào.
        </p>
      </section>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Bộ phận đã học" value={s.concepts} />
        <Stat label="Đã vững" value={s.mastered} tone="text-emerald-600" />
        <Stat label="Đến hạn ôn" value={s.due_now} tone={s.due_now > 0 ? 'text-amber-600' : 'text-stone-900'} />
        <Stat label="Tỉ lệ đúng" value={s.accuracy === null ? '—' : `${Math.round(s.accuracy * 100)}%`} hint={`${s.attempts} câu đã làm`} />
      </div>

      {/* Cách học */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-stone-900">Bạn muốn AI dạy thế nào?</h2>
          <p className="text-sm text-stone-500 mt-1">Gia sư dựa vào đây để chọn độ sâu và cách giải thích.</p>
        </div>
        <ChoiceRow label="Trình độ" value={data.preferences.level} choices={data.choices.level} onChange={(level) => void savePref({ level })} />
        <ChoiceRow label="Cách giải thích" value={data.preferences.style} choices={data.choices.style} onChange={(style) => void savePref({ style })} />
        <label className="block">
          <span className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">Mục tiêu (không bắt buộc)</span>
          <div className="flex gap-2">
            <input
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              maxLength={300}
              placeholder="Ví dụ: ôn thi giữa kỳ giải phẫu tim mạch"
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82]"
            />
            <button
              type="button"
              disabled={goals === data.preferences.goals}
              onClick={() => void savePref({ goals })}
              className="px-4 py-2.5 rounded-xl bg-[#1E3F82] text-white text-sm font-bold disabled:opacity-40 cursor-pointer"
            >
              Lưu
            </button>
          </div>
        </label>
        {saved && <p className="text-sm text-emerald-700">{saved}</p>}
      </section>

      {/* Hiểu nhầm */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <ExclamationTriangleFill className="w-4 h-4 text-amber-500" /> Những chỗ bạn hay nhầm
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          AI ghi nhận khi bạn chọn đáp án sai hoặc bài tự luận có ý chưa đúng. Gia sư sẽ chủ động làm rõ và ra câu hỏi để bạn phân biệt. Khi bạn làm đúng
          nhiều lần, mục sẽ tự chuyển sang “đã hiểu”.
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

      {/* Xóa */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900">Xóa hồ sơ học tập</h2>
          <p className="text-sm text-stone-500 mt-1">Xóa toàn bộ mức nắm vững, hiểu nhầm, lịch sử ôn tập. Không ảnh hưởng tài khoản và ghi chú.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!confirmReset) return setConfirmReset(true);
            learnerApi
              .reset()
              .then(() => {
                setConfirmReset(false);
                setReload((n) => n + 1);
              })
              .catch(() => undefined);
          }}
          onBlur={() => setConfirmReset(false)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${
            confirmReset ? 'bg-rose-600 text-white' : 'border border-stone-200 text-stone-600 hover:text-rose-600'
          }`}
        >
          <Trash className="w-4 h-4" /> {confirmReset ? 'Bấm lần nữa để xóa' : 'Xóa hồ sơ'}
        </button>
      </section>
    </div>
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

function ChoiceRow({ label, value, choices, onChange }: { label: string; value: string; choices: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">{label}</span>
      <div className="flex flex-wrap gap-2">
        {choices.map(([key, text]) => (
          <button
            key={key}
            type="button"
            onClick={() => key !== value && onChange(key)}
            className={`px-3.5 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${
              key === value ? 'border-[#1E3F82] bg-[#E8F0FB] text-[#1E3F82]' : 'border-stone-200 text-stone-600 hover:border-[#1E3F82]/40'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
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

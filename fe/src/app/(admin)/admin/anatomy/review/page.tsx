'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useEffectEvent, useState } from 'react';
import {
  ArrowLeft,
  CheckAll,
  CheckLg,
  ChevronLeft,
  ChevronRight,
  Grid3x3GapFill,
  LightningChargeFill,
  Rocket,
  Square,
  XLg,
} from 'react-bootstrap-icons';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DraftEditor, draftFields } from '@/components/admin/anatomy/DraftEditor';
import { adminAnatomyApi, type DraftFields, type ReadyModel, type StructureDraft } from '@/lib/admin-anatomy';
import { useBodySystems } from '@/lib/anatomy-catalog';

type Mode = 'card' | 'grid';

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="h-96 rounded-3xl bg-stone-200/60 animate-pulse" />}>
      <Review />
    </Suspense>
  );
}

function Review() {
  const params = useSearchParams();
  const { systems } = useBodySystems();
  const [model, setModel] = useState(params.get('model') ?? '');
  const [system, setSystem] = useState('');
  const [mode, setMode] = useState<Mode>('card');
  const [queue, setQueue] = useState<StructureDraft[] | null>(null);
  const [allModels, setAllModels] = useState<{ uid: string; title: string }[]>([]);
  const [index, setIndex] = useState(0);
  const [edits, setEdits] = useState<Record<number, DraftFields>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(0);
  const [ready, setReady] = useState<ReadyModel[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminAnatomyApi
      .drafts({ status: 'pending', model: model || undefined, system: system || undefined })
      .then((res) => {
        if (cancelled) return;
        setQueue(res.results);
        setReady(res.publishable ?? []);
        setIndex(0);
        setSelected(new Set());
        // danh sách mô hình để lọc (lấy từ lần tải không lọc mô hình)
        if (!model) {
          const map = new Map<string, string>();
          res.results.forEach((d) => d.models.forEach((m) => map.set(m.uid, m.title)));
          setAllModels([...map].map(([uid, title]) => ({ uid, title })));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được danh sách');
      });
    return () => {
      cancelled = true;
    };
  }, [model, system]);

  // server trả về toàn bộ danh sách mô hình có thể xuất bản sau mỗi lần duyệt
  const addReady = (list: ReadyModel[]) => {
    setReady(list);
    setHideReady(false);
  };
  const [hideReady, setHideReady] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const removeFromQueue = (ids: number[]) => {
    const next = (queue ?? []).filter((d) => !ids.includes(d.id));
    setQueue(next);
    setIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
    setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
  };

  const current = queue && queue.length > 0 ? queue[Math.min(index, queue.length - 1)] : null;
  const fieldsOf = (d: StructureDraft) => edits[d.id] ?? draftFields(d);

  const approveCurrent = async () => {
    if (!current || working) return;
    setWorking(true);
    setError('');
    try {
      const res = await adminAnatomyApi.approveDraft(current.id, edits[current.id] ?? draftFields(current));
      addReady(res.ready_models);
      setDone((n) => n + 1);
      removeFromQueue([current.id]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không duyệt được');
    } finally {
      setWorking(false);
    }
  };

  const discardCurrent = async () => {
    if (!current || working) return;
    setWorking(true);
    try {
      await adminAnatomyApi.discardDraft(current.id);
      removeFromQueue([current.id]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không bỏ được');
    } finally {
      setWorking(false);
    }
  };

  const step = (delta: number) => {
    if (!queue || queue.length === 0) return;
    setIndex((i) => (Math.min(i, queue.length - 1) + delta + queue.length) % queue.length);
  };

  // Phím tắt (chế độ từng thẻ)
  const onKey = useEffectEvent((e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void approveCurrent();
        return;
      }
      if (typing) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void approveCurrent();
      } else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Delete') void discardCurrent();
  });

  useEffect(() => {
    if (mode !== 'card') return;
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode]);

  const approveSelected = async () => {
    if (selected.size === 0) return;
    setWorking(true);
    setError('');
    try {
      const ids = [...selected];
      const res = await adminAnatomyApi.approveDrafts(ids);
      addReady(res.ready_models);
      setDone((n) => n + res.approved);
      removeFromQueue(ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không duyệt được');
    } finally {
      setWorking(false);
    }
  };

  // Duyệt tất cả bản nháp đang hiện (theo bộ lọc). Thẻ đã sửa tay được duyệt kèm nội dung đã sửa.
  const approveAll = async () => {
    if (!queue || queue.length === 0 || working) return;
    if (!confirmAll) {
      setConfirmAll(true);
      return;
    }
    setConfirmAll(false);
    setWorking(true);
    setError('');
    try {
      const edited = queue.filter((d) => edits[d.id]);
      const rest = queue.filter((d) => !edits[d.id]).map((d) => d.id);
      let approved = 0;
      let last: ReadyModel[] | null = null;
      for (const d of edited) {
        const res = await adminAnatomyApi.approveDraft(d.id, edits[d.id]);
        approved += res.approved;
        last = res.ready_models;
      }
      if (rest.length > 0) {
        const res = await adminAnatomyApi.approveDrafts(rest);
        approved += res.approved;
        last = res.ready_models;
      }
      if (last) addReady(last);
      setDone((n) => n + approved);
      removeFromQueue(queue.map((d) => d.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không duyệt được');
    } finally {
      setWorking(false);
    }
  };

  const publishAll = async () => {
    if (ready.length === 0) return;
    setWorking(true);
    setError('');
    try {
      await adminAnatomyApi.bulk(ready.map((m) => m.uid), 'publish');
      setReady([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xuất bản được');
    } finally {
      setWorking(false);
    }
  };

  const publishModel = async (m: ReadyModel) => {
    try {
      await adminAnatomyApi.publish(m.uid, false);
      setReady((prev) => prev.filter((p) => p.uid !== m.uid));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xuất bản được');
    }
  };

  const remaining = queue?.length ?? 0;
  const total = remaining + done;

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link href="/admin/anatomy" className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-[#1E3F82] w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Giải phẫu
        </Link>
        <AdminPageHeader
          title="Duyệt nhanh"
          description="Lướt qua từng bản nháp AI: sửa tại chỗ nếu cần rồi duyệt. Nội dung chỉ đến tay học viên sau khi duyệt."
        />
      </div>

      {/* Bộ lọc + chế độ */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={model} onChange={(e) => setModel(e.target.value)} className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm" aria-label="Lọc theo mô hình">
          <option value="">Mọi mô hình</option>
          {allModels.map((m) => (
            <option key={m.uid} value={m.uid}>
              {m.title}
            </option>
          ))}
          {model && !allModels.some((m) => m.uid === model) && <option value={model}>Mô hình đang chọn</option>}
        </select>
        <select value={system} onChange={(e) => setSystem(e.target.value)} className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm" aria-label="Lọc theo hệ cơ quan">
          <option value="">Mọi hệ cơ quan</option>
          {systems.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name_vi}
            </option>
          ))}
        </select>
        {queue && queue.length > 0 && (
          <button
            type="button"
            disabled={working}
            onClick={() => void approveAll()}
            onBlur={() => setConfirmAll(false)}
            className={`ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer transition-colors ${
              confirmAll ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckAll className="w-4 h-4" />
            {confirmAll ? `Bấm lần nữa để duyệt ${queue.length} bản nháp` : `Duyệt tất cả (${queue.length})`}
          </button>
        )}
        <div className={`inline-flex p-1 rounded-xl bg-white border border-stone-200/90 text-sm font-bold ${queue && queue.length > 0 ? '' : 'ml-auto'}`}>
          <ModeButton active={mode === 'card'} onClick={() => setMode('card')}>
            <Square className="w-3.5 h-3.5" /> Từng thẻ
          </ModeButton>
          <ModeButton active={mode === 'grid'} onClick={() => setMode('grid')}>
            <Grid3x3GapFill className="w-3.5 h-3.5" /> Lưới
          </ModeButton>
        </div>
      </div>

      {/* Tiến độ */}
      {queue && total > 0 && (
        <div>
          <div className="flex justify-between text-xs font-semibold text-stone-500 mb-1.5">
            <span>
              Đã duyệt <b className="text-emerald-700">{done}</b> · còn <b className="text-stone-800">{remaining}</b>
            </span>
            <span>{Math.round((done / total) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Mô hình sẵn sàng xuất bản */}
      {ready.length > 0 && !hideReady && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex flex-wrap items-center gap-3">
            <Rocket className="w-4 h-4" />
            <span className="flex-1">
              <b>{ready.length} mô hình</b> đã có nội dung được duyệt nhưng học viên chưa thấy. Xuất bản để hiện cho học viên?
            </span>
            <button type="button" disabled={working} onClick={() => void publishAll()} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 cursor-pointer">
              Xuất bản tất cả
            </button>
            <button type="button" onClick={() => setHideReady(true)} className="text-emerald-700/70 hover:text-emerald-900 cursor-pointer" aria-label="Để sau">
              <XLg className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ready.map((m) => (
              <li key={m.uid} className="inline-flex items-center gap-2 rounded-lg bg-white/70 border border-emerald-200 pl-3 pr-1 py-1 text-xs">
                <span className="font-semibold text-stone-800">{m.title}</span>
                {m.linked ? <span className="text-emerald-700/80 tabular-nums">{m.approved}/{m.linked} bộ phận</span> : null}
                <button type="button" disabled={working} onClick={() => void publishModel(m)} className="px-2 py-0.5 rounded-md font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer">
                  Xuất bản
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div>}

      {queue === null ? (
        <div className="h-96 rounded-3xl bg-stone-200/60 animate-pulse" />
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/90 px-6 py-14 text-center">
          <LightningChargeFill className="w-8 h-8 mx-auto text-emerald-500" />
          <p className="mt-3 text-sm font-semibold text-stone-800">{done > 0 ? `Xong! Đã duyệt ${done} bản nháp.` : 'Không có bản nháp nào chờ duyệt.'}</p>
          <p className="text-xs text-stone-500 mt-1">Ở tab Mô hình, bấm “AI soạn nội dung” để tạo thêm.</p>
        </div>
      ) : mode === 'card' && current ? (
        <section className="bg-white rounded-3xl border border-stone-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-stone-100">
            {current.models[0]?.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.models[0].thumbnail_url} alt="" className="w-12 h-9 rounded-lg object-cover bg-stone-100" />
            )}
            <div className="flex-1 min-w-0 text-xs text-stone-500 truncate">
              {current.models.map((m) => (
                <Link key={m.uid} href={`/admin/anatomy/models/${m.uid}`} className="hover:text-[#1E3F82] mr-2">
                  {m.title}
                </Link>
              ))}
            </div>
            <span className="text-xs font-bold text-stone-500 tabular-nums">
              {Math.min(index, queue.length - 1) + 1} / {queue.length}
            </span>
          </div>

          <div className="p-5">
            <DraftEditor draft={current} fields={fieldsOf(current)} onChange={(f) => setEdits((e) => ({ ...e, [current.id]: f }))} />
          </div>

          <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-stone-100 bg-stone-50/60">
            <button type="button" onClick={() => step(-1)} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-stone-600 hover:text-stone-900 cursor-pointer" title="Phím ←">
              <ChevronLeft className="w-4 h-4" /> Trước
            </button>
            <button type="button" disabled={working} onClick={() => void discardCurrent()} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-stone-500 hover:text-rose-600 disabled:opacity-50 cursor-pointer" title="Phím Delete">
              <XLg className="w-3.5 h-3.5" /> Bỏ nháp
            </button>
            <span className="hidden md:block ml-auto text-[11px] text-stone-400">Enter duyệt · ← → chuyển thẻ · Delete bỏ · Ctrl+Enter duyệt khi đang sửa</span>
            <button type="button" onClick={() => step(1)} className="md:ml-0 ml-auto inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm font-bold text-stone-700 hover:text-[#1E3F82] cursor-pointer" title="Phím →">
              Để sau <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => void approveCurrent()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
              title="Phím Enter"
            >
              <CheckLg className="w-4 h-4" /> Duyệt & xuất bản
            </button>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === queue.length}
                onChange={() => setSelected(selected.size === queue.length ? new Set() : new Set(queue.map((d) => d.id)))}
                className="w-4 h-4 accent-emerald-600"
              />
              Chọn tất cả
            </label>
            <button
              type="button"
              disabled={working || selected.size === 0}
              onClick={() => void approveSelected()}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              <CheckLg className="w-4 h-4" /> Duyệt {selected.size || ''} thẻ đã chọn
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {queue.map((d, i) => {
              const f = fieldsOf(d);
              const checked = selected.has(d.id);
              return (
                <article
                  key={d.id}
                  className={`relative bg-white rounded-2xl border p-4 flex flex-col gap-2 ${checked ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-stone-200/90'}`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelected((s) => {
                          const next = new Set(s);
                          if (next.has(d.id)) next.delete(d.id);
                          else next.add(d.id);
                          return next;
                        })
                      }
                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                      aria-label={`Chọn ${d.structure.name_en}`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-900 truncate">{f.name_vi || d.structure.name_en}</div>
                      <div className="text-xs text-stone-500 truncate">
                        {d.structure.name_en} · {d.models.map((m) => m.title).join(', ')}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed line-clamp-4">{f.definition || f.function}</p>
                  <div className="mt-auto flex items-center justify-between pt-1 text-xs">
                    <span className="text-stone-400">{d.citations.length} nguồn</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIndex(i);
                        setMode('card');
                      }}
                      className="font-bold text-[#1E3F82] hover:underline cursor-pointer"
                    >
                      Xem & sửa
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
        active ? 'bg-[#1E3F82] text-white' : 'text-stone-500 hover:text-stone-800'
      }`}
    >
      {children}
    </button>
  );
}

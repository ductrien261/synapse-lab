'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowClockwise,
  ArrowLeft,
  BoxArrowUpRight,
  CheckCircleFill,
  EyeFill,
  EyeSlashFill,
  InfoCircle,
  LightningChargeFill,
  Rocket,
  Stars,
} from 'react-bootstrap-icons';
import {
  adminAnatomyApi,
  ANATOMY_JOB_API,
  ANATOMY_JOB_KINDS,
  isJobActive,
  type AdminAnnotation,
  type AdminModelDetail,
  type AdminStructure,
  type ImportJob,
  type StructureDraft,
} from '@/lib/admin-anatomy';
import { modelTitle, useBodySystems } from '@/lib/anatomy-catalog';
import { useSketchfabViewer } from '@/lib/sketchfab';
import { StructureForm } from '@/components/admin/anatomy/StructureForm';
import { AiDraftPanel } from '@/components/admin/anatomy/AiDraftPanel';
import { JobProgress } from '@/components/admin/JobProgress';

export default function AdminModelEditorPage() {
  const { uid } = useParams<{ uid: string }>();
  const [model, setModel] = useState<AdminModelDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminAnatomyApi
      .model(uid)
      .then((m) => {
        if (!cancelled) setModel(m);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được mô hình');
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-stone-600">{error}</p>
        <Link href="/admin/anatomy" className="mt-3 inline-block text-sm font-bold text-[#1E3F82] hover:underline">
          Quay lại danh sách
        </Link>
      </div>
    );
  }
  if (!model) return <div className="h-[600px] rounded-3xl bg-stone-200/60 animate-pulse" />;
  return <Editor initial={model} />;
}

function dotClass(a: AdminAnnotation) {
  const s = a.structure;
  if (s?.draft?.status === 'pending') return 'bg-violet-500';
  if (s?.status === 'published') return 'bg-emerald-500';
  if (s && (s.definition || s.function || s.clinical_note)) return 'bg-[#5B8FD8]';
  return 'bg-stone-300';
}

function Editor({ initial }: { initial: AdminModelDetail }) {
  const { systems } = useBodySystems();
  const [model, setModel] = useState(initial);
  const { iframeRef, status, annotations: viewerAnnotations, selected, select } = useSketchfabViewer(model.sketchfab_uid);
  const [syncState, setSyncState] = useState<{ running: boolean; message: string }>({ running: false, message: '' });
  const autoSynced = useRef(false);
  const [titleVi, setTitleVi] = useState(model.title_vi);
  const [publishOpen, setPublishOpen] = useState(false);
  const [approve, setApprove] = useState(true);
  const [publishMsg, setPublishMsg] = useState('');
  const [formVersion, setFormVersion] = useState(0);
  const [aiJob, setAiJobState] = useState<ImportJob | null>(null);
  const [aiError, setAiError] = useState('');
  const aiJobRef = useRef<ImportJob | null>(null);

  const reloadModel = useCallback(
    () =>
      adminAnatomyApi
        .model(model.sketchfab_uid)
        .then(setModel)
        .catch(() => undefined),
    [model.sketchfab_uid],
  );

  const onAiJobChange = useCallback(
    (next: ImportJob) => {
      const wasActive = isJobActive(aiJobRef.current);
      aiJobRef.current = next;
      setAiJobState(next);
      if (wasActive && !isJobActive(next)) void reloadModel();
    },
    [reloadModel],
  );

  const generateAll = async () => {
    setAiError('');
    try {
      const job = await adminAnatomyApi.generateDrafts({ model_uid: model.sketchfab_uid });
      aiJobRef.current = job;
      setAiJobState(job);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Không bắt đầu được');
    }
  };

  const onDraftChange = (structureId: number, draft: StructureDraft | null) =>
    setModel((m) => ({
      ...m,
      annotations: m.annotations.map((a) =>
        a.structure?.id === structureId
          ? { ...a, structure: { ...a.structure, draft: draft ? { id: draft.id, status: draft.status, error: draft.error } : null } }
          : a,
      ),
    }));

  const onDraftApplied = () => {
    void reloadModel().then(() => setFormVersion((v) => v + 1));
  };

  const sync = (list = viewerAnnotations) => {
    setSyncState({ running: true, message: '' });
    adminAnatomyApi
      .syncAnnotations(
        model.sketchfab_uid,
        list.map((a) => ({ index: a.index, label: a.name, content: a.content })),
      )
      .then(({ result, model: updated }) => {
        setModel(updated);
        setSyncState({
          running: false,
          message: `Đã đồng bộ ${result.total} chú thích · ${result.new_structures} cấu trúc mới${result.removed ? ` · xóa ${result.removed}` : ''}.`,
        });
      })
      .catch((err: unknown) => setSyncState({ running: false, message: err instanceof Error ? err.message : 'Đồng bộ thất bại' }));
  };

  // Lần đầu mở: nếu chú thích trên Sketchfab khác với DB thì tự đồng bộ
  useEffect(() => {
    if (autoSynced.current || status !== 'ready' || viewerAnnotations.length === 0) return;
    const differs =
      viewerAnnotations.length !== model.annotations.length ||
      viewerAnnotations.some((v) => !model.annotations.some((a) => a.index === v.index));
    if (!differs) {
      autoSynced.current = true;
      return;
    }
    // chạy sau lượt render hiện tại (tránh setState đồng bộ trong effect)
    const t = setTimeout(() => {
      autoSynced.current = true;
      sync(viewerAnnotations);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, viewerAnnotations]);

  const updateModel = (data: Parameters<typeof adminAnatomyApi.updateModel>[1]) =>
    adminAnatomyApi
      .updateModel(model.sketchfab_uid, data)
      .then(setModel)
      .catch(() => undefined);

  const onStructureSaved = (s: AdminStructure) =>
    setModel((m) => ({
      ...m,
      annotations: m.annotations.map((a) =>
        a.structure?.id === s.id ? { ...a, structure: { ...s, model_count: a.structure.model_count } } : a,
      ),
    }));

  const publish = async () => {
    setPublishMsg('');
    try {
      const res = await adminAnatomyApi.publish(model.sketchfab_uid, approve);
      const updated = await adminAnatomyApi.model(model.sketchfab_uid);
      setModel(updated);
      setPublishOpen(false);
      setPublishMsg(`Đã xuất bản${res.approved_structures ? `, duyệt ${res.approved_structures} bộ phận` : ''}. Học viên đã thấy mô hình này.`);
    } catch (err) {
      setPublishMsg(err instanceof Error ? err.message : 'Không xuất bản được');
    }
  };

  const current = selected !== null ? model.annotations.find((a) => a.index === selected) ?? null : null;
  const filled = model.annotations.filter((a) => a.structure && (a.structure.definition || a.structure.function)).length;
  const latin = model.source_meta?.structures_latin ?? [];
  const currentStructureId = current?.structure?.id ?? 0;
  const structures = model.annotations.filter((a) => a.structure).map((a) => a.structure as AdminStructure);
  const emptyCount = new Set(
    structures.filter((s) => !s.definition && !s.function && s.draft?.status !== 'pending').map((s) => s.id),
  ).size;
  const pendingCount = new Set(structures.filter((s) => s.draft?.status === 'pending').map((s) => s.id)).size;

  return (
    <>
      {/* Tiêu đề + hành động */}
      <div className="flex flex-col gap-3">
        <Link href="/admin/anatomy" className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-[#1E3F82] w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Giải phẫu
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">{modelTitle(model)}</h1>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${model.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}
              >
                {model.is_published ? 'Đã xuất bản' : 'Nháp'}
              </span>
            </div>
            {model.title_vi && <p className="text-sm text-stone-500">{model.title}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/anatomy/models/${model.sketchfab_uid}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82]"
            >
              <EyeFill className="w-4 h-4" /> Xem như học viên
            </a>
            {model.is_published ? (
              <button
                type="button"
                onClick={() => void updateModel({ is_published: false })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:border-rose-300 hover:text-rose-600 cursor-pointer"
              >
                <EyeSlashFill className="w-4 h-4" /> Ẩn khỏi học viên
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPublishOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer"
              >
                <Rocket className="w-4 h-4" /> Hoàn thành & xuất bản
              </button>
            )}
          </div>
        </div>

        {publishOpen && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-col gap-3">
            <div className="text-sm text-stone-700">
              Mô hình sẽ hiện với học viên. Đã soạn nội dung cho <b>{filled}/{model.annotations.length}</b> bộ phận
              {!model.system && <span className="text-amber-700"> · chưa gán hệ cơ quan</span>}.
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
              Duyệt luôn nội dung các bộ phận đã soạn (đang ở trạng thái Nháp)
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => void publish()} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer">
                Xác nhận xuất bản
              </button>
              <button type="button" onClick={() => setPublishOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-stone-600 hover:text-stone-900 cursor-pointer">
                Hủy
              </button>
            </div>
          </div>
        )}
        {publishMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-2.5">
            <CheckCircleFill className="w-4 h-4" /> {publishMsg}
          </div>
        )}
      </div>

      {/* Khung 3D + thông tin mô hình */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="relative rounded-3xl overflow-hidden bg-[#0B1224] h-[460px]">
          <iframe
            ref={iframeRef}
            title={modelTitle(model)}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
          />
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs pointer-events-none">Đang tải mô hình 3D...</div>
          )}
        </div>

        <section className="bg-white rounded-2xl border border-stone-200/90 p-4 flex flex-col gap-4">
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Tên tiếng Việt</span>
            <input
              value={titleVi}
              onChange={(e) => setTitleVi(e.target.value)}
              onBlur={() => titleVi !== model.title_vi && void updateModel({ title_vi: titleVi })}
              placeholder={model.title}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82]"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Hệ cơ quan</span>
            <select
              value={model.system ?? ''}
              onChange={(e) => void updateModel({ system: e.target.value || null })}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm"
            >
              <option value="">— Chưa gán hệ —</option>
              {systems.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name_vi}
                </option>
              ))}
            </select>
          </label>

          <div className="text-xs text-stone-600 flex flex-col gap-1.5 border-t border-stone-100 pt-3">
            <div>
              <b>Tác giả:</b> {model.author_name || '—'} · {model.license_label || '—'}
            </div>
            {model.source_meta?.institution && (
              <div>
                <b>Đơn vị:</b> {model.source_meta.institution}
              </div>
            )}
            {model.source_meta?.creators && (
              <div>
                <b>Người tạo:</b> {model.source_meta.creators}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <a href={model.sketchfab_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1E3F82] hover:underline">
                Sketchfab <BoxArrowUpRight className="w-3 h-3" />
              </a>
              {model.source_url && (
                <a href={model.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1E3F82] hover:underline">
                  Trang nguồn <BoxArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {latin.length > 0 && (
            <div className="border-t border-stone-100 pt-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Cấu trúc theo AnatomyTOOL (Latin)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {latin.map((l) => (
                  <span key={l} className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 italic">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* AI viết nháp hàng loạt */}
      {structures.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
            <Stars className="w-5 h-5 text-violet-600" />
            <div className="flex-1 min-w-[220px] text-sm text-stone-700">
              <b>AI viết nháp</b> từ kho tài liệu, mỗi ý kèm trích dẫn. Bộ phận không có tài liệu sẽ được bỏ qua (không tốn lượt AI).
            </div>
            <button
              type="button"
              disabled={emptyCount === 0 || isJobActive(aiJob)}
              onClick={() => void generateAll()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              <Stars className="w-4 h-4" /> Viết nháp cho {emptyCount} bộ phận chưa có nội dung
            </button>
            {pendingCount > 0 && (
              <Link
                href={`/admin/anatomy/review?model=${model.sketchfab_uid}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-violet-300 bg-white text-sm font-bold text-violet-700 hover:bg-violet-50"
              >
                <LightningChargeFill className="w-4 h-4" /> Duyệt nhanh ({pendingCount})
              </Link>
            )}
          </div>
          {aiError && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{aiError}</div>}
          <JobProgress job={aiJob} onChange={onAiJobChange} api={ANATOMY_JOB_API} kindLabels={ANATOMY_JOB_KINDS} createdLabel="bản nháp" />
        </section>
      )}

      {/* Danh sách bộ phận + form soạn */}
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
        <section className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <div className="text-sm font-bold text-stone-900">
              Bộ phận <span className="text-stone-400 font-semibold">({filled}/{model.annotations.length} đã soạn)</span>
            </div>
            <button
              type="button"
              title="Quét lại chú thích từ Sketchfab"
              disabled={syncState.running || status !== 'ready'}
              onClick={() => sync()}
              className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:text-[#1E3F82] disabled:opacity-40 cursor-pointer"
            >
              <ArrowClockwise className={`w-4 h-4 ${syncState.running ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {syncState.message && <div className="px-4 py-2 text-xs text-stone-600 bg-stone-50 border-b border-stone-100">{syncState.message}</div>}
          {model.annotations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-stone-500">
              {status === 'ready' ? 'Mô hình này không có chú thích trên Sketchfab.' : 'Đang đọc chú thích từ mô hình...'}
            </p>
          ) : (
            <ul className="max-h-[560px] overflow-y-auto p-2">
              {model.annotations.map((a) => {
                const active = a.index === selected;
                return (
                  <li key={a.index}>
                    <button
                      type="button"
                      onClick={() => select(a.index)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-sm cursor-pointer ${
                        active ? 'bg-[#1E3F82] text-white' : 'hover:bg-[#F4F7FC] text-stone-700'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${active ? 'bg-white text-[#1E3F82]' : 'bg-stone-100'}`}>
                        {a.index + 1}
                      </span>
                      <span className="flex-1 min-w-0 truncate">{a.structure?.name_vi || a.label}</span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass(a)}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-3 px-4 py-2.5 border-t border-stone-100 text-[11px] text-stone-500">
            <Legend color="bg-violet-500" label="Có nháp AI" />
            <Legend color="bg-emerald-500" label="Đã duyệt" />
            <Legend color="bg-[#5B8FD8]" label="Đã soạn (nháp)" />
            <Legend color="bg-stone-300" label="Chưa có" />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-stone-200/90 p-5">
          {!current ? (
            <div className="flex items-center gap-2 text-sm text-stone-500 py-10 justify-center">
              <InfoCircle className="w-4 h-4" /> Chọn một bộ phận ở danh sách hoặc bấm số trên mô hình để soạn nội dung.
            </div>
          ) : !current.structure ? (
            <p className="text-sm text-stone-500">Bộ phận chưa được gắn cấu trúc. Bấm nút quét lại chú thích.</p>
          ) : (
            <>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-full bg-[#1E3F82] text-white text-sm font-bold flex items-center justify-center">{current.index + 1}</span>
                <div>
                  <h2 className="text-base font-bold text-stone-900">{current.label}</h2>
                  <p className="text-xs text-stone-500">Tên trên Sketchfab</p>
                </div>
              </div>
              <div className="mb-4">
                <AiDraftPanel
                  key={current.structure.id}
                  structure={current.structure}
                  onApplied={onDraftApplied}
                  onDraftChange={(d) => onDraftChange(currentStructureId, d)}
                />
              </div>
              <StructureForm
                key={`${current.structure.id}-${formVersion}`}
                annotation={current as AdminAnnotation & { structure: AdminStructure }}
                latinSuggestions={latin}
                onSaved={onStructureSaved}
              />
            </>
          )}
        </section>
      </div>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

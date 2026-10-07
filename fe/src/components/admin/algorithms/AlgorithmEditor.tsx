'use client';

import Link from 'next/link';
import { AlgorithmSimulationView } from '@/components/simulation/AlgorithmSimulationView';
import { algorithmApi, toAlgorithmViewDetail, type AlgorithmContentDto, type AlgorithmViewDetail } from '@/lib/algorithm-api';
import { LessonBlocksEditor } from './LessonBlocksEditor';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, Check2Circle, Circle, Eye, FileEarmarkText, Floppy, PencilSquare, Stars } from 'react-bootstrap-icons';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { algoVizApi } from '@/lib/algo-api';
import { useUser } from '@/lib/user-context';
import { EMPTY_DRAFT, LESSON_FIELDS, saveDraft, useDrafts, type LessonDraft, type LessonField } from './drafts';

const EDITOR_TABS = [
  { key: 'overview', label: 'Thông tin chung' },
  { key: 'lesson', label: 'Bài học' },
  { key: 'practice', label: 'Luyện tập' },
  { key: 'code', label: 'Code & mã giả' },
  { key: 'sources', label: 'Nguồn tham khảo' },
] as const;
type EditorTab = typeof EDITOR_TABS[number]['key'];
const FIELD_STYLE = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-[#1E3F82] focus:outline-none focus:ring-2 focus:ring-[#1E3F82]/10';

export function AlgorithmEditor({ category, algorithm }: { category: string; algorithm: string }) {
  const { user } = useUser();
  const { drafts, loading: draftsLoading, error: draftsError } = useDrafts(user?.id ?? 'guest');
  const [detail, setDetail] = useState<AlgorithmViewDetail | null>(null);
  const [scenarios, setScenarios] = useState<AlgorithmContentDto['application_scenarios']>();
  const [simulation, setSimulation] = useState<AlgorithmContentDto['simulation']>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const path = `${category}/${algorithm}`;
  useEffect(() => {
    let cancelled = false;
    algorithmApi.get(category, algorithm).then((lesson) => {
      if (!cancelled) {
        setDetail(toAlgorithmViewDetail(lesson.algorithm));
        setSimulation(lesson.content?.simulation);
        setScenarios(lesson.content?.application_scenarios);
        setError('');
      }
      return algoVizApi.getAlgorithm(category, algorithm).then((source) => {
        if (!cancelled) setDetail(toAlgorithmViewDetail(lesson.algorithm, source.algorithm));
      }).catch(() => undefined);
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được bài học.');
    });
    return () => { cancelled = true; };
  }, [category, algorithm, retry]);
  if (error || draftsError) return <div role="alert" className="rounded-2xl border border-rose-100 bg-white p-8 text-center"><p className="text-sm text-rose-700">{error || draftsError}</p><button type="button" onClick={() => { if (draftsError) window.location.reload(); else setRetry((n) => n + 1); }} className="mt-4 rounded-xl bg-[#1E3F82] px-4 py-2 text-sm text-white">Thử lại</button><Link href="/admin/algorithms" className="ml-4 text-sm text-[#1E3F82]">Về kho thuật toán</Link></div>;
  if (!detail || !user || draftsLoading) return <div aria-label="Đang tải bài học" className="space-y-5"><div className="h-20 animate-pulse rounded-2xl bg-stone-200/60" /><div className="h-96 animate-pulse rounded-2xl bg-stone-200/60" /></div>;
  return <EditorForm detail={detail} initialDraft={drafts[path] ?? EMPTY_DRAFT} path={path} simulation={simulation} scenarios={scenarios} />;
}

function EditorForm({ detail, initialDraft, path, simulation, scenarios }: { detail: AlgorithmViewDetail; initialDraft: LessonDraft; path: string; simulation?: AlgorithmContentDto['simulation']; scenarios?: AlgorithmContentDto['application_scenarios'] }) {
  const [draft, setDraft] = useState<LessonDraft>(initialDraft);
  const [saved, setSaved] = useState<LessonDraft>(initialDraft);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('overview');
  const files = detail.files.filter((file) => /\.(js|java|cpp|py|c|ts)$/i.test(file.name));
  const [fileIndex, setFileIndex] = useState(0);
  const blocks = draft.blocks ?? [];
  const theoryCount = blocks.filter(block => block.kind === 'theory').length;
  const practiceCount = blocks.length - theoryCount;
  const codeLesson = draft.codeLesson;
  const checks = [
    ...LESSON_FIELDS.filter(field => ['title', 'summary', 'objectives'].includes(field.key)).map(field => ({ label: field.label, complete: Boolean(draft[field.key].trim()) })),
    { label: 'Nội dung bài học', complete: blocks.some(block => block.kind === 'theory' && block.text.trim()) },
    { label: 'Ví dụ & bài tập', complete: blocks.some(block => block.kind !== 'theory' && block.text.trim()) },
    { label: 'Code & giải thích từng bước', complete: Boolean(codeLesson?.source?.trim() && codeLesson.steps?.length) },
    { label: 'Nguồn tham khảo', complete: Boolean(draft.references.trim() || blocks.some(block => block.source.trim())) },
  ];
  const filled = checks.filter(check => check.complete).length;
  const dirty = LESSON_FIELDS.some(({ key }) => draft[key] !== saved[key]) || JSON.stringify(draft.blocks ?? []) !== JSON.stringify(saved.blocks ?? []);
  const currentFile = files[fileIndex];
  const update = (key: LessonField, value: string) => { setDraft((old) => ({ ...old, [key]: value })); setNotice(''); };
  const persist = async (status: 'draft' | 'published') => {
    if (saving) return;
    setSaving(true);
    setNotice('');
    try {
      const next = await saveDraft(path, draft, status);
      setDraft(next); setSaved(next); setNotice(status === 'published' ? 'Đã xuất bản bài học và lưu vào hệ thống.' : 'Đã lưu bản nháp vào hệ thống.');
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : 'Không thể lưu bài học. Vui lòng thử lại.');
    } finally { setSaving(false); }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void persist('draft');
  };

  return <>
    <Link href="/admin/algorithms" className="inline-flex items-center gap-2 self-start text-xs font-semibold text-stone-500 hover:text-[#1E3F82]"><ArrowLeft /> Kho thuật toán{dirty && <span className="text-amber-700">· Có thay đổi chưa lưu</span>}</Link>
    <AdminPageHeader title={detail.algorithmName} description={`${detail.categoryName} · ${path}`} actions={<Link href={`/algorithms/${path}`} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600">Trang học viên <ArrowUpRight /></Link>} />

    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2"><button type="button" onClick={() => setPreview(false)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${!preview ? 'bg-[#E8F0FB] text-[#1E3F82]' : 'text-stone-500'}`}><PencilSquare /> Biên soạn</button><button type="button" onClick={() => setPreview(true)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${preview ? 'bg-[#E8F0FB] text-[#1E3F82]' : 'text-stone-500'}`}><Eye /> Xem trước</button></div>
        <div className="flex flex-wrap items-center gap-2"><span className={`mr-2 text-[11px] ${dirty ? 'text-amber-700' : 'text-stone-400'}`}>{dirty ? 'Chưa lưu thay đổi' : saved.status === 'published' ? 'Đã xuất bản' : saved.updatedAt ? 'Bản nháp đã lưu' : 'Chưa có bản nháp'}</span><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#1E3F82] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#163070]"><Floppy /> {saving ? 'Đang lưu...' : saved.status === 'published' ? 'Chuyển về nháp' : 'Lưu bản nháp'}</button><button type="button" disabled={saving} onClick={() => void persist('published')} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Xuất bản</button></div>
      </div>
      {notice && <p role="status" className="rounded-xl border border-[#DDE6F5] bg-white px-4 py-3 text-sm text-[#1E3F82]">{notice}</p>}
      {!preview && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <nav aria-label="Các phần biên soạn" className="flex flex-wrap gap-2 rounded-2xl border border-stone-200 bg-white p-3">
            {EDITOR_TABS.map(tab => <button key={tab.key} type="button" aria-pressed={editorTab === tab.key} onClick={() => setEditorTab(tab.key)} className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#1E3F82] ${editorTab === tab.key ? 'bg-[#1E3F82] text-white' : 'text-stone-500 hover:bg-stone-100'}`}>{tab.label}{tab.key === 'lesson' ? ` (${theoryCount})` : tab.key === 'practice' ? ` (${practiceCount})` : ''}</button>)}
          </nav>
          {editorTab === 'overview' && <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><h2 className="text-sm font-bold text-stone-900">Thông tin chung</h2><p className="mb-5 mt-1 text-xs leading-6 text-stone-500">Giới thiệu ngắn gọn bài học và kiến thức cần chuẩn bị. Nội dung chi tiết được soạn trong tab Bài học.</p><DraftFields keys={['title', 'summary', 'objectives']} draft={draft} disabled={saving} onChange={update} /></section>}
          {(editorTab === 'lesson' || editorTab === 'practice') && <LessonBlocksEditor blocks={blocks} group={editorTab === 'lesson' ? 'theory' : 'exercise'} disabled={saving} onChange={next => { setDraft(old => ({ ...old, blocks: next })); setNotice(''); }} />}
          {editorTab === 'lesson' && !theoryCount && <details className="rounded-2xl border border-stone-200 bg-white p-5"><summary className="cursor-pointer text-xs font-bold text-stone-600">Nội dung đã lưu theo biểu mẫu cũ</summary><div className="mt-5"><DraftFields keys={['problem', 'inputOutput', 'example', 'theory', 'complexity', 'applications']} draft={draft} disabled={saving} onChange={update} /></div></details>}
          {editorTab === 'code' && <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><h2 className="text-sm font-bold text-stone-900">Code & giải thích từng bước</h2><p className="mb-5 mt-1 text-xs leading-6 text-stone-500">Đối chiếu mã nguồn, lời giải thích từng đoạn và biên soạn mã giả cho bài học.</p><pre className="max-h-96 overflow-auto rounded-xl bg-[#1E1E2E] p-4 font-mono text-xs leading-6 text-slate-200"><code>{codeLesson?.source || 'Chưa nạp mã nguồn cho bài học.'}</code></pre><details className="my-5 rounded-xl border border-stone-200 px-4 py-3"><summary className="cursor-pointer text-sm font-bold text-[#243355]">Giải thích code<span className="ml-2 text-xs font-normal text-stone-400">{codeLesson?.steps?.length ?? 0} bước</span></summary><ul className="mt-4 list-disc space-y-4 pl-5 marker:text-[#1E3F82]">{codeLesson?.steps?.map((step, index) => <li key={index} className="pl-1"><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="text-sm font-bold text-[#243355]">{step.title}</span><span className="text-xs text-stone-400">Dòng {step.start_line}{step.end_line > step.start_line ? `–${step.end_line}` : ''}</span></div><p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-stone-600">{step.note}</p></li>)}</ul>{!codeLesson?.steps?.length && <p className="text-xs text-stone-500">Chưa có giải thích code.</p>}</details><DraftFields keys={['pseudocode']} draft={draft} disabled={saving} onChange={update} /></section>}
          {editorTab === 'sources' && <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><h2 className="mb-5 text-sm font-bold text-stone-900">Nguồn tham khảo</h2><SourceAttribution references={draft.references} disabled={saving} onChange={value => update('references', value)} /><details className="mt-5 border-t border-stone-100 pt-4"><summary className="cursor-pointer text-xs font-bold text-[#1E3F82]">Đối chiếu mã nguồn gốc</summary><label className="my-3 block"><span className="sr-only">File mã nguồn gốc</span><select value={fileIndex} onChange={event => setFileIndex(Number(event.target.value))} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs">{files.map((file, index) => <option key={file.name} value={index}>{file.name}</option>)}</select></label><pre className="max-h-96 overflow-auto rounded-xl bg-[#0F2258] p-3 font-mono text-xs leading-6 text-blue-100"><code>{currentFile?.content || 'Chưa có mã nguồn gốc.'}</code></pre></details></section>}
        </div>
        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-stone-200/90 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-stone-900">Kiểm tra nội dung</h2><span className="text-xs font-bold text-[#1E3F82]">{filled}/{checks.length}</span></div><div className="my-4 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#1E3F82] transition-[width]" style={{ width: `${filled / checks.length * 100}%` }} /></div><ul className="space-y-2.5">{checks.map(({ label, complete }) => <li key={label} className="flex items-center gap-2 text-xs">{complete ? <Check2Circle className="shrink-0 text-emerald-600" /> : <Circle className="shrink-0 text-stone-300" />}<span className={complete ? 'text-stone-700' : 'text-stone-400'}>{label}</span></li>)}</ul><p className="mt-4 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500">Checklist chỉ kiểm tra đã nhập nội dung. Tính đúng đắn và nguồn cần được quản trị viên đối chiếu.</p></section>
          <section className="rounded-2xl border border-stone-200/90 bg-white p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-stone-900"><Stars className="text-violet-500" /> AI hỗ trợ biên soạn</h2><p className="mt-2 text-xs leading-relaxed text-stone-500">Hỗ trợ tìm nguồn giáo trình và đề xuất nội dung để quản trị viên rà soát.</p><button type="button" disabled className="mt-4 w-full rounded-xl bg-stone-100 px-3 py-2.5 text-xs font-semibold text-stone-400">Tạo bản nháp với AI · Sắp có</button><Link href="/admin/documents" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#1E3F82]"><FileEarmarkText /> Xem kho giáo trình <ArrowUpRight /></Link></section>
        </aside>
      </div>}
    </form>
    {preview && <AlgorithmSimulationView algorithmDetail={detail} lessonContent={{ ...previewContent(draft), simulation, application_scenarios: scenarios }} preview onBack={() => setPreview(false)} />}
  </>;
}

function previewContent(draft: LessonDraft): AlgorithmContentDto {
  return {
    lesson_fields: Object.fromEntries(LESSON_FIELDS.map(({ key }) => [key, draft[key]])),
    code_lesson: draft.codeLesson, lesson_blocks: draft.blocks ?? [], summary: draft.summary, theory: draft.theory,
    time_best: '', time_average: '', time_worst: '', space: '',
    applications: draft.applications.split('\n').filter(Boolean),
    status: draft.status ?? 'draft', updated_at: draft.updatedAt,
  };
}

function SourceAttribution({ references, disabled, onChange }: { references: string; disabled: boolean; onChange: (value: string) => void }) {
  const urls = [...new Set(references.match(/https:\/\/[^\s)]+/g) ?? [])];
  return <div><label className="block"><span className="mb-2 block text-xs font-bold text-stone-700">Tài liệu tham khảo nội dung</span><textarea rows={7} value={references} disabled={disabled} onChange={event => onChange(event.target.value)} placeholder="Tác giả, tên giáo trình, chương/mục, giấy phép và liên kết nguồn." className={FIELD_STYLE} /></label><div className="mt-3 space-y-2">{urls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2 text-xs font-semibold text-[#1E3F82]"><span className="truncate">Mở tài liệu gốc</span><ArrowUpRight className="shrink-0" /></a>)}</div></div>;
}

function DraftFields({ keys, draft, disabled, onChange }: { keys: LessonField[]; draft: LessonDraft; disabled: boolean; onChange: (key: LessonField, value: string) => void }) {
  return <div className="space-y-5">{keys.map(key => {
    const field = LESSON_FIELDS.find(item => item.key === key)!;
    return <label key={key} className="block"><span className="mb-2 block text-xs font-bold text-stone-700">{field.label}</span>{key === 'title' ? <input className={FIELD_STYLE} value={draft[key]} placeholder={field.hint} disabled={disabled} onChange={event => onChange(key, event.target.value)} /> : <textarea rows={key === 'pseudocode' ? 7 : 4} className={`${FIELD_STYLE} resize-y ${key === 'pseudocode' ? 'font-mono text-xs' : ''}`} value={draft[key]} placeholder={field.hint} disabled={disabled} onChange={event => onChange(key, event.target.value)} />}<span className="mt-1.5 block text-[10px] text-stone-400">{draft[key].length.toLocaleString('vi-VN')} ký tự</span></label>;
  })}</div>;
}

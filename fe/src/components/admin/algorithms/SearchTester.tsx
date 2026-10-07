'use client';

import { useEffect, useState } from 'react';
import { ArrowClockwise, BoxArrowUpRight, Check2Circle, Download, Link45deg, Search } from 'react-bootstrap-icons';
import {
  algorithmApi,
  MAX_ALGORITHM_SCAN_SOURCES,
  type AlgorithmCategory,
  type AlgorithmDiscoveredSource,
  type AlgorithmDraftCandidate,
  type AlgorithmScanJob,
  type AlgorithmSourcePreview,
} from '@/lib/algorithm-api';
import { LESSON_FIELDS } from './drafts';
import { SourceGapSuggestion } from './SourceGapSuggestion';

interface Props {
  categories: AlgorithmCategory[];
  onImported: () => void;
}

const STATUS_STYLE = {
  found: 'bg-emerald-50 text-emerald-700',
  weak: 'bg-amber-50 text-amber-700',
  missing: 'bg-stone-100 text-stone-500',
  conflict: 'bg-rose-50 text-rose-700',
} as const;

function normalizedTopic(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(algorithm|problem)\b/g, '').replace(/[^a-z0-9]+/g, '');
}

const OTHER_CATEGORY_KEY = 'uncategorized';

function categoryForTopic(topic: string, categories: AlgorithmCategory[]) {
  const target = normalizedTopic(topic);
  return categories.find((category) => category.algorithms.some((algorithm) => normalizedTopic(algorithm.name) === target))?.key
    ?? OTHER_CATEGORY_KEY;
}

function isClearlyAlgorithm(topic: string, categories: AlgorithmCategory[]) {
  const target = normalizedTopic(topic);
  return categories.some((category) => category.algorithms.some((algorithm) => normalizedTopic(algorithm.name) === target))
    || /\b(algorithm|search|sort|traversal|path|tour|cycle|knapsack|hashing|dijkstra|kruskal|prim)\b/i.test(topic);
}

function defaultFields(candidate: AlgorithmDraftCandidate) {
  return LESSON_FIELDS.map(({ key }) => key).filter((key) => {
    const field = candidate.fields[key];
    return field?.value?.trim() && (field.status === 'found' || field.status === 'weak');
  });
}

export function SearchTester({ categories, onImported }: Props) {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<AlgorithmSourcePreview | null>(null);
  const [categoryKey, setCategoryKey] = useState('');
  const [lessonName, setLessonName] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topicCategories, setTopicCategories] = useState<Record<string, string>>({});
  const [licenseName, setLicenseName] = useState('');
  const [job, setJob] = useState<AlgorithmScanJob | null>(null);
  const [candidate, setCandidate] = useState<AlgorithmDraftCandidate | null>(null);
  const [candidates, setCandidates] = useState<AlgorithmDraftCandidate[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldsByCandidate, setFieldsByCandidate] = useState<Record<number, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [additionalUrl, setAdditionalUrl] = useState('');
  const [additionalLicense, setAdditionalLicense] = useState('');
  const [additionalPreview, setAdditionalPreview] = useState<AlgorithmSourcePreview | null>(null);
  const [additionalError, setAdditionalError] = useState('');
  const [additionalStep, setAdditionalStep] = useState<'discovering' | 'reading' | 'rescanning' | null>(null);
  const [rescanJobId, setRescanJobId] = useState('');
  const [discoveredSources, setDiscoveredSources] = useState<AlgorithmDiscoveredSource[]>([]);
  const [selectedDiscoveredUrls, setSelectedDiscoveredUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!job || !['queued', 'running'].includes(job.status)) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      algorithmApi.scanJob(job.id).then((next) => {
        if (!cancelled) {
          setJob(next);
          if (next.status === 'failed') {
            const message = next.error || 'Không tạo được bài từ nguồn này.';
            setError(message);
            if (next.id === rescanJobId) {
              setAdditionalError(message);
              setAdditionalStep(null);
            }
          }
        }
      }).catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Không đọc được tiến độ tạo bài.');
      });
    }, 1500);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [job, rescanJobId]);

  useEffect(() => {
    if (!job || job.status !== 'done') return;
    let cancelled = false;
    algorithmApi.candidates(job.id).then((items) => {
      if (cancelled) return;
      const next = items[0] ?? null;
      setCandidates((current) => job.id === rescanJobId && next
        ? current.map((item) => item.algorithm_path === next.algorithm_path ? next : item)
        : items);
      setCandidate(next);
      setSelectedFields(next ? defaultFields(next) : []);
      setFieldsByCandidate((current) => ({
        ...(job.id === rescanJobId ? current : {}),
        ...Object.fromEntries(items.map((item) => [item.id, defaultFields(item)])),
      }));
      if (job.id === rescanJobId) {
        setAdditionalUrl('');
        setAdditionalLicense('');
        setAdditionalPreview(null);
        setAdditionalStep(null);
        setDiscoveredSources([]);
        setSelectedDiscoveredUrls([]);
      }
      setNotice(items.some((item) => item.status === 'pending')
        ? `AI đã tạo ${items.length} đề xuất. Hãy xem và duyệt từng bài.`
        : next?.error || 'Nguồn chưa đủ để tạo bài.');
    }).catch((caught: unknown) => {
      if (!cancelled) {
        const message = caught instanceof Error ? caught.message : 'Không tải được đề xuất.';
        setError(message);
        if (job.id === rescanJobId) {
          setAdditionalError(message);
          setAdditionalStep(null);
        }
      }
    });
    return () => { cancelled = true; };
  }, [job, rescanJobId]);

  const readSource = async () => {
    if (!url.trim() || scanning) return;
    setBusy(true);
    setError('');
    setNotice('');
    setPreview(null);
    setCandidate(null);
    setCandidates([]);
    setJob(null);
    setAdditionalUrl('');
    setAdditionalLicense('');
    setAdditionalPreview(null);
    setAdditionalError('');
    setAdditionalStep(null);
    setRescanJobId('');
    setDiscoveredSources([]);
    setSelectedDiscoveredUrls([]);
    try {
      const next = await algorithmApi.previewSource(url.trim());
      const topics = next.topics ?? [];
      const detectedCategory = topics.length === 1 ? categoryForTopic(topics[0], categories) : '';
      setPreview(next);
      setSelectedTopics(topics.length === 1 ? topics : []);
      setTopicCategories(Object.fromEntries(topics.map((topic) => [topic, categoryForTopic(topic, categories)])));
      setCategoryKey(detectedCategory);
      setLessonName(topics.length === 1 ? topics[0] : '');
      if (topics.length === 1 && detectedCategory && isClearlyAlgorithm(topics[0], categories)) {
        await createArticle(next, [{ name: topics[0], category_key: detectedCategory }]);
      } else {
        setNotice(topics.length > 1
          ? `Đã tìm thấy ${topics.length} đề mục. Ngân tick một bài hoặc chọn tất cả để tạo đề xuất riêng.`
          : 'Chưa xác định chắc một bài. Ngân nhập tên và chọn nhóm rồi nhấn Tạo bài.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không đọc được liên kết này.');
    } finally {
      setBusy(false);
    }
  };

  const readAdditionalSource = async () => {
    if (!additionalUrl.trim()) return;
    setAdditionalStep('reading');
    setAdditionalError('');
    setAdditionalPreview(null);
    try {
      setAdditionalPreview(await algorithmApi.previewSource(additionalUrl.trim()));
    } catch (caught) {
      setAdditionalError(caught instanceof Error ? caught.message : 'Không đọc được nguồn bổ sung này.');
    } finally {
      setAdditionalStep(null);
    }
  };

  const discoverAdditionalSources = async () => {
    if (!candidate) return;
    setAdditionalStep('discovering');
    setAdditionalError('');
    try {
      const discovery = await algorithmApi.discoverSources(candidate.id);
      setDiscoveredSources(discovery.results);
      setSelectedDiscoveredUrls([]);
      if (!discovery.results.length) {
        setAdditionalError('Chưa tìm được nguồn mới có thể đọc tự động. Ngân có thể thử lại hoặc thêm một liên kết thủ công.');
      }
    } catch (caught) {
      setAdditionalError(caught instanceof Error ? caught.message : 'Không thể tự động tìm nguồn bổ sung.');
    } finally {
      setAdditionalStep(null);
    }
  };

  const startSupplementaryScan = async (items: Pick<AlgorithmDiscoveredSource, 'title' | 'url' | 'allowed_domain'>[]) => {
    if (!candidate || !items.length) return;
    setAdditionalStep('rescanning');
    setAdditionalError('');
    setError('');
    try {
      const sources = await algorithmApi.importSources();
      const currentIds = new Set(candidate.source_ids);
      const uniqueItems = [...new Map(items.map((item) => [item.url, item])).values()];
      const newItems = uniqueItems.filter((item) => {
        const existing = sources.find((source) => source.kind === 'url' && source.source_url === item.url);
        return !existing || !currentIds.has(existing.id);
      });
      if (!newItems.length) {
        setAdditionalError('Các nguồn đã chọn đều có trong lượt quét hiện tại. Hãy tìm nguồn khác.');
        setAdditionalStep(null);
        return;
      }
      if (candidate.source_ids.length + newItems.length > MAX_ALGORITHM_SCAN_SOURCES) {
        setAdditionalError(`Chỉ có thể thêm ${Math.max(0, MAX_ALGORITHM_SCAN_SOURCES - candidate.source_ids.length)} nguồn nữa trong lượt quét này.`);
        setAdditionalStep(null);
        return;
      }
      const added = await Promise.all(newItems.map(async (item) => {
        const existing = sources.find((source) => source.kind === 'url' && source.source_url === item.url);
        return existing ?? algorithmApi.createUrlSource({
          name: item.title,
          source_url: item.url,
          allowed_domain: item.allowed_domain,
          license_name: item.url === additionalPreview?.url ? additionalLicense.trim() : '',
        });
      }));
      const sourceIds = [...new Set([...candidate.source_ids, ...added.map((source) => source.id)])];
      const nextJob = await algorithmApi.startScan([candidate.algorithm_path], sourceIds);
      setJob(nextJob);
      setRescanJobId(nextJob.id);
      setNotice(`Đã thêm ${added.length} nguồn. AI đang tổng hợp lại các mục còn thiếu hoặc chưa chắc chắn.`);
    } catch (caught) {
      setAdditionalError(caught instanceof Error ? caught.message : 'Không thể quét lại với nguồn bổ sung.');
      setAdditionalStep(null);
    }
  };

  const rescanWithAdditionalSource = async () => {
    if (!candidate || !additionalPreview) return;
    await startSupplementaryScan([additionalPreview]);
  };

  const rescanWithDiscoveredSources = async () => {
    await startSupplementaryScan(discoveredSources.filter((source) => selectedDiscoveredUrls.includes(source.url)));
  };

  const createArticle = async (
    sourcePreview: AlgorithmSourcePreview | null = preview,
    chosenLessons?: { name: string; category_key: string }[],
  ) => {
    if (!sourcePreview) return;
    const multipleTopics = (sourcePreview.topics?.length ?? 0) > 1;
    const lessons = chosenLessons ?? (multipleTopics
      ? selectedTopics.map((name) => ({ name, category_key: topicCategories[name] ?? '' }))
      : [{ name: lessonName.trim(), category_key: categoryKey }]);
    if (!lessons.length || lessons.length > 30 || lessons.some((item) => !item.name || !item.category_key)) return;
    setBusy(true);
    setError('');
    setNotice('');
    setCandidate(null);
    setCandidates([]);
    setAdditionalUrl('');
    setAdditionalLicense('');
    setAdditionalPreview(null);
    setAdditionalError('');
    setAdditionalStep(null);
    setRescanJobId('');
    setDiscoveredSources([]);
    setSelectedDiscoveredUrls([]);
    try {
      const sources = await algorithmApi.importSources();
      const existing = sources.find((source) => source.kind === 'url' && source.source_url === sourcePreview.url);
      const source = existing ?? await algorithmApi.createUrlSource({
        name: sourcePreview.title,
        source_url: sourcePreview.url,
        allowed_domain: sourcePreview.allowed_domain,
        license_name: licenseName.trim(),
      });
      setJob(await algorithmApi.startNewLessonsScan(lessons, [source.id]));
      setNotice(`Đã bắt đầu tạo ${lessons.length} bài. Hệ thống đang đọc nguồn và viết đề xuất có trích dẫn.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không bắt đầu tạo bài được.');
    } finally {
      setBusy(false);
    }
  };

  const applyDraft = async () => {
    if (!candidate || !selectedFields.length) return;
    setBusy(true);
    setError('');
    try {
      await algorithmApi.applyCandidate(candidate.id, selectedFields);
      setCandidate({ ...candidate, status: 'applied' });
      setCandidates((current) => current.map((item) => item.id === candidate.id ? { ...item, status: 'applied' } : item));
      setNotice('Đã nạp nội dung được chọn thành bản nháp. Bài chưa được xuất bản.');
      onImported();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không nạp được bản nháp.');
    } finally {
      setBusy(false);
    }
  };

  const scanning = job?.status === 'queued' || job?.status === 'running';
  const multipleTopics = (preview?.topics?.length ?? 0) > 1;
  const canCreate = multipleTopics
    ? selectedTopics.length > 0 && selectedTopics.length <= 30 && selectedTopics.every((topic) => topicCategories[topic])
    : Boolean(categoryKey && lessonName.trim());
  const chooseCandidate = (next: AlgorithmDraftCandidate) => {
    if (candidate) setFieldsByCandidate((current) => ({ ...current, [candidate.id]: selectedFields }));
    setCandidate(next);
    setSelectedFields(fieldsByCandidate[next.id] ?? defaultFields(next));
    setAdditionalError('');
    setDiscoveredSources([]);
    setSelectedDiscoveredUrls([]);
  };
  const gapFields = candidate ? LESSON_FIELDS.flatMap(({ key, label }) => {
    const status = candidate.fields[key]?.status;
    return status && status !== 'found' ? [{ key, label, status }] : [];
  }) : [];

  return <div className="space-y-5">
    <section className="rounded-2xl border border-stone-200/90 bg-white p-5">
      <div><h2 className="font-bold text-stone-900">Tạo bài từ một liên kết</h2><p className="mt-1 text-sm text-stone-500">Dán trang có nội dung thuật toán. Hệ thống đọc nguồn trước, sau đó mới tạo đề xuất để Ngân duyệt.</p></div>
      <form onSubmit={(event) => { event.preventDefault(); void readSource(); }} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 focus-within:border-[#1E3F82] focus-within:ring-2 focus-within:ring-[#1E3F82]/10"><Link45deg className="shrink-0 text-stone-400" /><span className="sr-only">Liên kết nguồn</span><input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." className="w-full min-w-0 bg-transparent text-sm outline-none" /></label>
        <input aria-label="Giấy phép nguồn" value={licenseName} onChange={(event) => setLicenseName(event.target.value)} placeholder="Giấy phép (nếu có)" className="min-w-0 rounded-xl border border-stone-200 px-3 py-2.5 text-sm sm:w-48" />
        <button type="submit" disabled={busy || scanning || !url.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E3F82] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy && !preview ? <ArrowClockwise className="animate-spin" /> : <Search />} Đọc liên kết</button>
      </form>
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-xl bg-[#F4F7FC] px-4 py-3 text-sm text-[#1E3F82]">{notice}</p>}
    </section>

    {preview && <>
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Đã đọc được nguồn</p><h3 className="mt-1 truncate font-bold text-stone-900">{preview.title}</h3><a href={preview.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-[#1E3F82] hover:underline">{preview.url} <BoxArrowUpRight /></a>{preview.code_source_url && <a href={preview.code_source_url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#1E3F82] hover:underline">Đã lấy mã giả từ mã nguồn của trang <BoxArrowUpRight /></a>}</div>
          <div className="w-full space-y-3 xl:w-auto">
            {multipleTopics ? <div className="max-h-80 overflow-auto rounded-xl border border-stone-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-sm"><span className="font-bold text-stone-800">Đề mục tìm thấy ({preview.topics?.length})</span><div className="flex gap-3"><button type="button" disabled={scanning || busy} onClick={() => setSelectedTopics(preview.topics?.slice(0, 30) ?? [])} className="font-semibold text-[#1E3F82] disabled:opacity-50">{(preview.topics?.length ?? 0) > 30 ? 'Chọn 30 bài đầu' : 'Chọn tất cả'}</button><button type="button" disabled={scanning || busy} onClick={() => setSelectedTopics([])} className="text-stone-500 disabled:opacity-50">Bỏ chọn</button></div></div>
              {(preview.topics?.length ?? 0) > 30 && <p className="mb-2 text-xs text-amber-700">Tối đa 30 bài mỗi lượt; có thể chọn các bài còn lại ở lượt sau.</p>}
              {(preview.topics ?? []).map((topic) => <div key={topic} className="flex flex-wrap items-center gap-2 border-t border-stone-100 py-2 first:border-0">
                <label className="flex min-w-[210px] flex-1 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" disabled={scanning || busy} checked={selectedTopics.includes(topic)} onChange={() => setSelectedTopics((current) => current.includes(topic) ? current.filter((item) => item !== topic) : current.length < 30 ? [...current, topic] : current)} className="h-4 w-4 accent-[#1E3F82]" />{topic}</label>
                <select aria-label={`Nhóm thuật toán cho ${topic}`} disabled={scanning || busy} value={topicCategories[topic] ?? ''} onChange={(event) => setTopicCategories((current) => ({ ...current, [topic]: event.target.value }))} className="min-w-[160px] rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"><option value="">Chọn nhóm...</option>{categories.map((category) => <option key={category.key} value={category.key}>{category.key === OTHER_CATEGORY_KEY ? 'Khác' : category.name}</option>)}{!categories.some((category) => category.key === OTHER_CATEGORY_KEY) && <option value={OTHER_CATEGORY_KEY}>Khác</option>}</select>
              </div>)}
            </div> : <div className="grid gap-3 sm:grid-cols-2">
              <input aria-label="Tên bài thuật toán mới" value={lessonName} onChange={(event) => setLessonName(event.target.value)} maxLength={200} placeholder="Tên bài thuật toán mới" className="min-w-0 rounded-xl border border-stone-200 px-3 py-2.5 text-sm" />
              <select aria-label="Chọn nhóm thuật toán" value={categoryKey} onChange={(event) => setCategoryKey(event.target.value)} className="min-w-0 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"><option value="">Chọn nhóm thuật toán...</option>{categories.map((category) => <option key={category.key} value={category.key}>{category.key === OTHER_CATEGORY_KEY ? 'Khác' : category.name}</option>)}{!categories.some((category) => category.key === OTHER_CATEGORY_KEY) && <option value={OTHER_CATEGORY_KEY}>Khác</option>}</select>
            </div>}
            <div className="flex justify-end"><button type="button" disabled={busy || scanning || !canCreate} onClick={() => void createArticle()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E3F82] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{scanning ? <ArrowClockwise className="animate-spin" /> : <Check2Circle />} {scanning ? `Đang tạo ${job?.processed ?? 0}/${job?.total ?? 1}` : multipleTopics ? `Tạo ${selectedTopics.length} bài` : 'Tạo bài'}</button></div>
          </div>
        </div>
      </section>

      {candidates.length > 1 && <section className="rounded-2xl border border-stone-200 bg-white p-4"><h3 className="mb-3 font-bold text-stone-900">Đề xuất theo bài ({candidates.length})</h3><div className="flex gap-2 overflow-x-auto pb-1">{candidates.map((item) => <button key={item.id} type="button" onClick={() => chooseCandidate(item)} className={`shrink-0 rounded-xl border px-3 py-2 text-left text-sm ${candidate?.id === item.id ? 'border-[#1E3F82] bg-[#F4F7FC] text-[#1E3F82]' : 'border-stone-200 text-stone-700'}`}><span className="block font-bold">{item.algorithm_name}</span><span className="text-xs">{item.status === 'pending' ? 'Chờ duyệt' : item.status === 'applied' ? 'Đã nạp bản nháp' : 'Cần bổ sung nguồn'}</span></button>)}</div></section>}

      <div className="grid min-h-[680px] gap-5 xl:grid-cols-2">
        <section className="flex min-h-[680px] min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white"><div className="flex items-center justify-between border-b border-stone-100 px-4 py-3"><div><h3 className="font-bold text-stone-900">Nguồn gốc</h3><p className="text-xs text-stone-500">Trang web Ngân đã dán</p></div><a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#1E3F82]">Mở tab mới <BoxArrowUpRight /></a></div><iframe src={preview.url} title={`Nguồn: ${preview.title}`} className="min-h-[620px] w-full flex-1 bg-white" sandbox="allow-scripts allow-same-origin allow-popups" /><details className="border-t border-stone-100 px-4 py-3 text-xs text-stone-600"><summary className="cursor-pointer font-semibold text-[#1E3F82]">Nếu website chặn hiển thị, xem phần chữ hệ thống đã đọc</summary><p className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap leading-5">{preview.content}</p></details></section>

        <section className="min-h-[680px] min-w-0 overflow-hidden rounded-2xl border border-stone-200/90 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3"><div><h3 className="font-bold text-stone-900">Bản nháp AI</h3><p className="text-xs text-stone-500">Chỉ mục được tick mới được nạp</p></div>{candidate?.status === 'pending' && <button type="button" disabled={busy || scanning || !selectedFields.length} onClick={() => void applyDraft()} className="inline-flex items-center gap-2 rounded-xl bg-[#1E3F82] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Download /> Nạp thành bản nháp</button>}</div>{!candidate ? <div className="flex min-h-[620px] items-center justify-center p-8 text-center text-sm text-stone-500">{scanning ? <span className="inline-flex items-center gap-2"><ArrowClockwise className="animate-spin" /> AI đang đọc nguồn và tạo bài...</span> : 'Chọn một đề mục hoặc nhập tên bài, chọn nhóm rồi nhấn “Tạo bài” để xem đề xuất tại đây.'}</div> : <div className="space-y-3 p-4">{candidate.error && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{candidate.error}</p>}{gapFields.length > 0 && candidate.status === 'pending' && <SourceGapSuggestion algorithmName={candidate.algorithm_name} fields={gapFields} sourceCount={candidate.source_ids.length} url={additionalUrl} licenseName={additionalLicense} preview={additionalPreview} discovered={discoveredSources} selectedUrls={selectedDiscoveredUrls} discovering={additionalStep === 'discovering'} reading={additionalStep === 'reading'} rescanning={additionalStep === 'rescanning' || (scanning && job?.id === rescanJobId)} error={additionalError} onUrlChange={(value) => { setAdditionalUrl(value); setAdditionalPreview(null); setAdditionalError(''); }} onLicenseChange={setAdditionalLicense} onDiscover={() => void discoverAdditionalSources()} onToggleDiscovered={(sourceUrl) => setSelectedDiscoveredUrls((current) => current.includes(sourceUrl) ? current.filter((item) => item !== sourceUrl) : [...current, sourceUrl])} onUseDiscovered={() => void rescanWithDiscoveredSources()} onRead={() => void readAdditionalSource()} onRescan={() => void rescanWithAdditionalSource()} />}{LESSON_FIELDS.map(({ key, label }) => { const field = candidate.fields[key]; if (!field) return null; const checked = selectedFields.includes(key); return <label key={key} className={`block rounded-xl border p-3 ${candidate.status === 'pending' && field.value && !scanning ? 'cursor-pointer' : 'opacity-60'}`}><span className="flex items-center gap-2"><input type="checkbox" disabled={candidate.status !== 'pending' || !field.value || scanning} checked={checked} onChange={() => setSelectedFields((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} className="h-4 w-4 accent-[#1E3F82]" /><span className="text-xs font-bold text-stone-700">{label}</span><span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLE[field.status]}`}>{field.status}</span></span>{field.value && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-600">{field.value}</p>}</label>; })}</div>}</section>
      </div>
    </>}
  </div>;
}

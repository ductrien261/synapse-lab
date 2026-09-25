'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BoxArrowUpRight, CloudDownload, InfoCircle, Link45deg, Search } from 'react-bootstrap-icons';
import {
  adminAnatomyApi,
  ANATOMY_JOB_API,
  ANATOMY_JOB_KINDS,
  isJobActive,
  type AnatomyToolCollection,
  type ImportJob,
} from '@/lib/admin-anatomy';
import { useBodySystems } from '@/lib/anatomy-catalog';
import { JobProgress } from '@/components/admin/JobProgress';

export function ImportPanel({ onImported }: { onImported: () => void }) {
  const { systems } = useBodySystems();
  const [job, setJobState] = useState<ImportJob | null>(null);
  const jobRef = useRef<ImportJob | null>(null);
  const setJob = useCallback((next: ImportJob | null) => {
    jobRef.current = next;
    setJobState(next);
  }, []);
  const [collections, setCollections] = useState<AnatomyToolCollection[] | null>(null);
  const [picked, setPicked] = useState<Record<number, string | null>>({}); // id -> system slug
  const [links, setLinks] = useState('');
  const [linksSystem, setLinksSystem] = useState('');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const active = isJobActive(job);

  // Tải danh sách Collection + lượt chạy gần nhất
  useEffect(() => {
    let cancelled = false;
    Promise.all([adminAnatomyApi.collections(), adminAnatomyApi.latestJob()])
      .then(([cols, latest]) => {
        if (cancelled) return;
        setCollections(cols);
        setJob(latest);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, setJob]);

  // Lượt chạy vừa xong -> tải lại danh sách
  const handleJobChange = useCallback(
    (next: ImportJob) => {
      const wasActive = isJobActive(jobRef.current);
      setJob(next);
      if (wasActive && !isJobActive(next)) {
        setReloadKey((k) => k + 1);
        if (next.kind === 'import') onImported();
      }
    },
    [onImported, setJob],
  );

  const run = async (fn: () => Promise<ImportJob>) => {
    setError('');
    try {
      setJob(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không bắt đầu được');
    }
  };

  const toggle = (c: AnatomyToolCollection) =>
    setPicked((prev) => {
      const next = { ...prev };
      if (c.id in next) delete next[c.id];
      else next[c.id] = c.suggested_system;
      return next;
    });

  const pickedIds = Object.keys(picked).map(Number);
  const linkList = links
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <InfoCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          AnatomyTOOL yêu cầu mỗi lần truy cập cách nhau <b>10 giây</b> (robots.txt), nên nhập 10 mô hình mất khoảng 2–3 phút.
          Việc nhập chạy nền, bạn có thể rời trang và quay lại xem tiến độ. Mô hình mới luôn ở trạng thái <b>Nháp</b>. Nhập xong, sang tab <b>Mô hình</b> bấm <b>AI soạn nội dung</b>.
        </span>
      </div>

      <JobProgress job={job} onChange={handleJobChange} api={ANATOMY_JOB_API} kindLabels={ANATOMY_JOB_KINDS} />
      {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div>}

      {/* Collection */}
      <section className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-stone-100">
          <div>
            <h2 className="text-base font-bold text-stone-900">Collection trên AnatomyTOOL</h2>
            <p className="text-xs text-stone-500 mt-0.5">Tick các Collection cần lấy, chọn hệ cơ quan cho từng cái rồi bấm Nhập.</p>
          </div>
          <button
            type="button"
            disabled={active}
            onClick={() => void run(adminAnatomyApi.scan)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82] disabled:opacity-50 cursor-pointer"
          >
            <Search className="w-4 h-4" /> {collections?.length ? 'Quét lại danh mục' : 'Quét danh mục'}
          </button>
        </div>

        {collections === null ? (
          <div className="p-5 flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-stone-500">Chưa có dữ liệu. Bấm “Quét danh mục” để lấy danh sách Collection.</p>
        ) : (
          <ul>
            {collections.map((c) => {
              const checked = c.id in picked;
              return (
                <li key={c.id} className={`flex flex-wrap items-center gap-3 px-5 py-3 border-t border-stone-100 ${checked ? 'bg-[#F4F7FC]' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c)}
                    className="w-4 h-4 accent-[#1E3F82] cursor-pointer"
                    aria-label={`Chọn ${c.title}`}
                  />
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                      {c.title}
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-[#1E3F82]" aria-label="Mở trang">
                        <BoxArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-xs text-stone-500">
                      {c.candidate_count !== null ? `${c.candidate_count} mục 3D` : 'Chưa đọc chi tiết'} · đã nhập {c.imported_count}
                    </div>
                  </div>
                  <select
                    value={(checked ? picked[c.id] : c.suggested_system) ?? ''}
                    disabled={!checked}
                    onChange={(e) => setPicked((prev) => ({ ...prev, [c.id]: e.target.value || null }))}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-sm disabled:opacity-50"
                    aria-label="Hệ cơ quan"
                  >
                    <option value="">— Chưa gán hệ —</option>
                    {systems.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name_vi}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}

        {collections && collections.length > 0 && (
          <div className="flex justify-end px-5 py-3 border-t border-stone-100 bg-stone-50/60">
            <button
              type="button"
              disabled={active || pickedIds.length === 0}
              onClick={() =>
                void run(() =>
                  adminAnatomyApi.startImport({
                    collections: pickedIds.map((id) => ({ id, system: picked[id] })),
                    links: [],
                  }),
                ).then(() => setPicked({}))
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              <CloudDownload className="w-4 h-4" /> Nhập {pickedIds.length || ''} Collection đã chọn
            </button>
          </div>
        )}
      </section>

      {/* Link */}
      <section className="bg-white rounded-2xl border border-stone-200/90 p-5 flex flex-col gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Link45deg className="w-4 h-4 text-[#1E3F82]" /> Thêm bằng link
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">Mỗi dòng một link: trang AnatomyTOOL hoặc link Sketchfab.</p>
        </div>
        <textarea
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          rows={4}
          placeholder={'https://anatomytool.org/content/dundee-3d-model-cardiac-veins\nhttps://sketchfab.com/models/<mã>/embed'}
          className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-mono focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            value={linksSystem}
            onChange={(e) => setLinksSystem(e.target.value)}
            className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm"
            aria-label="Hệ cơ quan cho các link"
          >
            <option value="">— Chưa gán hệ —</option>
            {systems.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name_vi}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={active || linkList.length === 0}
            onClick={() =>
              void run(() => adminAnatomyApi.startImport({ collections: [], links: linkList, links_system: linksSystem || null })).then(() =>
                setLinks(''),
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            <CloudDownload className="w-4 h-4" /> Nhập {linkList.length || ''} link
          </button>
        </div>
      </section>
    </div>
  );
}

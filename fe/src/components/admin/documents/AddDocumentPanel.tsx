'use client';

import { useEffect, useState } from 'react';
import { BoxArrowUpRight, Book, FileEarmarkArrowUp, Search } from 'react-bootstrap-icons';
import {
  adminKnowledgeApi,
  bookUrl,
  guessScope,
  SCOPE_LABEL,
  SCOPES,
  SUGGESTED_BOOKS,
  type DocScope,
  type IngestJob,
  type OpenStaxBook,
  type CuratedSource,
} from '@/lib/admin-knowledge';
import { TocPicker } from './TocPicker';

type StartJob = (fn: () => Promise<IngestJob>) => Promise<boolean>;

export function AddDocumentPanel({ busy, startJob, reloadSignal }: { busy: boolean; startJob: StartJob; reloadSignal: number }) {
  return (
    <div className="flex flex-col gap-5">
      <OpenStaxCard busy={busy} startJob={startJob} reloadSignal={reloadSignal} />
      <CuratedSourcesCard busy={busy} startJob={startJob} reloadSignal={reloadSignal} />
      <PdfCard busy={busy} startJob={startJob} />
    </div>
  );
}

function CuratedSourcesCard({ busy, startJob, reloadSignal }: { busy: boolean; startJob: StartJob; reloadSignal: number }) {
  const [sources, setSources] = useState<CuratedSource[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminKnowledgeApi.curatedSources()
      .then((data) => { if (!cancelled) setSources(data); })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được nguồn tài liệu'); });
    return () => { cancelled = true; };
  }, [reloadSignal]);

  return <section className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white">
    <div className="border-b border-stone-100 px-5 py-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-stone-900"><Book className="h-4 w-4 text-[#1E3F82]" /> Giáo trình mở CNTT</h2>
      <p className="mt-1 text-xs text-stone-500">Nguồn từ tác giả, có giấy phép cho phép sao chép và tái sử dụng khi ghi công. Nạp vào kho CNTT; hệ thống giữ link gốc và giấy phép để trích dẫn.</p>
    </div>
    {error && <p className="px-5 py-3 text-sm text-rose-700">{error}</p>}
    <ul className="divide-y divide-stone-100">
      {sources.map((source) => <li key={source.key} className="flex flex-wrap items-center gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-stone-800">{source.title}</p>
          <p className="mt-0.5 text-xs text-stone-500">{source.authors} · <a href={source.url} target="_blank" rel="noreferrer" className="hover:underline">Trang gốc ↗</a> · <a href={source.license_url} target="_blank" rel="noreferrer" className="hover:underline">{source.license_name}</a></p>
        </div>
        <button type="button" disabled={busy || Boolean(source.document_id)} onClick={() => void startJob(() => adminKnowledgeApi.ingestCurated(source.key))} className="rounded-xl border border-[#1E3F82]/30 px-3 py-2 text-xs font-bold text-[#1E3F82] hover:bg-[#F4F7FC] disabled:cursor-default disabled:opacity-50">
          {source.document_id ? 'Đã có trong kho' : 'Nạp tài liệu'}
        </button>
      </li>)}
    </ul>
  </section>;
}

/* ---------------- Sách OpenStax ---------------- */

function OpenStaxCard({ busy, startJob, reloadSignal }: { busy: boolean; startJob: StartJob; reloadSignal: number }) {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [book, setBook] = useState<OpenStaxBook | null>(null);
  const [ingested, setIngested] = useState<Set<string>>(new Set());

  // Nạp xong -> cập nhật dấu "đã nạp" (lấy từ kho, không quét lại OpenStax)
  const bookSlug = book?.slug;
  useEffect(() => {
    if (!bookSlug || reloadSignal === 0) return;
    let cancelled = false;
    adminKnowledgeApi
      .documents()
      .then((docs) => {
        const doc = docs.find((d) => d.source_type === 'openstax' && d.source_key === bookSlug);
        return doc ? adminKnowledgeApi.document(doc.id) : null;
      })
      .then((detail) => {
        if (!cancelled && detail) setIngested(new Set(detail.sections.map((s) => s.key)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bookSlug, reloadSignal]);

  const scan = async (target = url) => {
    setError('');
    setScanning(true);
    try {
      const res = await adminKnowledgeApi.scanOpenStax(target.trim());
      setBook(res.book);
      setIngested(new Set(res.ingested));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không quét được mục lục');
    } finally {
      setScanning(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex flex-col gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Book className="w-4 h-4 text-[#1E3F82]" /> Sách OpenStax
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Chọn sách gợi ý hoặc dán link sách bất kỳ trên openstax.org → quét mục lục → chọn chương cần nạp.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {SCOPES.filter((sc) => SUGGESTED_BOOKS.some((b) => b.scope === sc)).map((sc) => (
            <div key={sc} className="flex flex-wrap items-center gap-1.5">
              <span className="w-40 shrink-0 text-[11px] font-bold uppercase tracking-wider text-stone-500">{SCOPE_LABEL[sc]}</span>
              {SUGGESTED_BOOKS.filter((b) => b.scope === sc).map((b) => (
                <button
                  key={b.slug}
                  type="button"
                  disabled={scanning}
                  title={b.note}
                  onClick={() => {
                    setUrl(bookUrl(b.slug));
                    void scan(bookUrl(b.slug));
                  }}
                  className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82] disabled:opacity-50 cursor-pointer"
                >
                  {b.title}
                </button>
              ))}
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) void scan();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://openstax.org/details/books/<tên-sách>  hoặc link một trang trong sách"
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10"
          />
          <button
            type="submit"
            disabled={scanning || !url.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:border-[#1E3F82]/40 hover:text-[#1E3F82] disabled:opacity-50 cursor-pointer"
          >
            {scanning ? (
              <span className="w-4 h-4 rounded-full border-2 border-[#1E3F82] border-t-transparent animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {scanning ? 'Đang đọc mục lục...' : 'Quét mục lục'}
          </button>
        </form>
        {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div>}
      </div>

      {book && (
        <>
          <div className="px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 bg-[#F4F7FC] border-b border-stone-100">
            <span className="text-sm font-bold text-stone-900">{book.title}</span>
            <a href={book.url} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-[#1E3F82]" aria-label="Mở trang sách">
              <BoxArrowUpRight className="w-3 h-3" />
            </a>
            {book.license_name && (
              <a href={book.license_url} target="_blank" rel="noreferrer" className="text-xs text-stone-500 hover:underline">
                {book.license_name}
              </a>
            )}
            <span className="text-xs text-stone-500">
              · {book.toc.length} chương{ingested.size > 0 && <> · <b className="text-emerald-700">đã nạp {ingested.size} bài</b></>}
            </span>
          </div>
          <TocPicker
            key={book.slug}
            toc={book.toc}
            ingested={ingested}
            defaultScope={guessScope(`${book.slug} ${book.title}`)}
            busy={busy}
            onSubmit={(pages, scope) => startJob(() => adminKnowledgeApi.ingestOpenStax(book.slug, pages, scope))}
          />
        </>
      )}
    </section>
  );
}

/* ---------------- File PDF ---------------- */

function PdfCard({ busy, startJob }: { busy: boolean; startJob: StartJob }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState('');
  const [scope, setScope] = useState<DocScope | ''>('');
  const [inputKey, setInputKey] = useState(0);

  const pick = (f: File | null) => {
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const submit = async () => {
    if (!file || !scope) return;
    const ok = await startJob(() => adminKnowledgeApi.uploadPdf({ file, title, authors, year, scope }));
    if (ok) {
      setFile(null);
      setTitle('');
      setAuthors('');
      setYear('');
      setInputKey((k) => k + 1);
    }
  };

  const field = 'px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#1E3F82]';

  return (
    <section className="bg-white rounded-2xl border border-stone-200/90 p-5 flex flex-col gap-3">
      <div>
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <FileEarmarkArrowUp className="w-4 h-4 text-[#1E3F82]" /> Tải file PDF lên
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Không dùng pdf scan, tối đa 50 MB. Trích dẫn sẽ ghi theo số trang. Chỉ dùng tài liệu được phép sử dụng.
        </p>
      </div>
      <input
        key={inputKey}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
        className="text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[#E8F0FB] file:text-[#1E3F82] file:font-bold file:cursor-pointer"
      />
      <div className="grid gap-2 sm:grid-cols-[2fr_1.5fr_0.7fr_1fr]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên tài liệu" className={field} />
        <input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="Tác giả (không bắt buộc)" className={field} />
        <input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Năm" className={field} />
        <select value={scope} onChange={(e) => setScope(e.target.value as DocScope | '')} className={field} aria-label="Chuyên ngành">
          <option value="">— Chọn chuyên ngành —</option>
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {SCOPE_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy || !file || !scope}
          onClick={() => void submit()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
        >
          <FileEarmarkArrowUp className="w-4 h-4" /> Tải lên & nạp
        </button>
      </div>
    </section>
  );
}

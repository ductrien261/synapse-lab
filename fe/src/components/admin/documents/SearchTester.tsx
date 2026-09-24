'use client';

import { useState } from 'react';
import { BoxArrowUpRight, Search, Translate } from 'react-bootstrap-icons';
import { adminKnowledgeApi, SCOPE_LABEL, type DocScope, type SearchResponse } from '@/lib/admin-knowledge';

const EXAMPLES = ['What is the left ventricle?', 'Van hai lá nằm ở đâu?', 'Where does the great cardiac vein drain?'];

/** Ô thử tìm kiếm: xem kho trả về đoạn nào cho một câu hỏi (không gọi AI viết câu trả lời). */
export function SearchTester() {
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<DocScope | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const run = async (query: string) => {
    if (!query.trim()) return;
    setQ(query);
    setLoading(true);
    setError('');
    try {
      setData(await adminKnowledgeApi.search(query.trim(), scope));
      setExpanded(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tìm được');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="bg-white rounded-2xl border border-stone-200/90 p-5 flex flex-col gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900">Thử tìm kiếm trong kho</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Gõ câu hỏi (tiếng Việt hoặc tiếng Anh) để xem AI sẽ lấy những đoạn nào làm căn cứ.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(q);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ví dụ: Tâm thất trái có chức năng gì?"
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1E3F82] focus:ring-2 focus:ring-[#1E3F82]/10"
          />
          <select value={scope} onChange={(e) => setScope(e.target.value as DocScope | '')} className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm" aria-label="Chuyên ngành">
            <option value="">Mọi chuyên ngành</option>
            {(Object.keys(SCOPE_LABEL) as DocScope[]).map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F82] hover:bg-[#163070] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            {loading ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Search className="w-4 h-4" />}
            Tìm
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => void run(ex)}
              className="text-xs px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 hover:bg-[#E8F0FB] hover:text-[#1E3F82] cursor-pointer"
            >
              {ex}
            </button>
          ))}
        </div>
        {error && <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2.5">{error}</div>}
      </section>

      {data && (
        <section className="flex flex-col gap-3">
          {data.english_query && (
            <div className="inline-flex items-center gap-2 self-start text-xs text-stone-600 bg-white border border-stone-200 rounded-full px-3 py-1.5">
              <Translate className="w-3.5 h-3.5 text-[#1E3F82]" /> Đã dịch để tìm từ khóa: <b>{data.english_query}</b>
            </div>
          )}
          {data.results.length === 0 ? (
            <p className="text-sm text-stone-500">Không tìm thấy đoạn nào. Kho có thể chưa có tài liệu cho chủ đề này.</p>
          ) : (
            data.results.map((r, i) => {
              const open = expanded.has(r.id);
              return (
                <article key={r.id} className="bg-white rounded-2xl border border-stone-200/90 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="w-6 h-6 rounded-lg bg-[#1E3F82] text-white font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-semibold text-stone-800">{r.document_title}</span>
                    {r.page_label && <span className="text-stone-500">{r.page_label}</span>}
                    <span className="ml-auto flex gap-1.5">
                      <RankBadge label="Nghĩa" rank={r.dense_rank} />
                      <RankBadge label="Từ khóa" rank={r.keyword_rank} />
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-[#1E3F82]">{r.heading}</div>
                  <p className={`mt-1 text-sm text-stone-700 leading-relaxed ${open ? '' : 'line-clamp-3'}`}>{r.content}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id);
                          else next.add(r.id);
                          return next;
                        })
                      }
                      className="font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
                    >
                      {open ? 'Thu gọn' : 'Xem cả đoạn'}
                    </button>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1E3F82] hover:underline">
                        Mở đúng đoạn trong sách <BoxArrowUpRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}

function RankBadge({ label, rank }: { label: string; rank: number | null }) {
  return (
    <span
      title={rank ? `Hạng ${rank} khi tìm theo ${label.toLowerCase()}` : `Không nằm trong top khi tìm theo ${label.toLowerCase()}`}
      className={`px-2 py-0.5 rounded-full font-semibold ${rank ? 'bg-[#E8F0FB] text-[#1E3F82]' : 'bg-stone-100 text-stone-400'}`}
    >
      {label} {rank ? `#${rank}` : '–'}
    </span>
  );
}

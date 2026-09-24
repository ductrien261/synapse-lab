"""
Tìm lai (hybrid) trong kho giáo trình — đọc thẳng bảng của backend (CHỈ ĐỌC):
    điểm = RRF( hạng theo vector (pgvector) , hạng theo từ khóa (Postgres full-text) )
- Câu tiếng Việt: dịch sang tiếng Anh (có cache) để tìm từ khóa trong sách tiếng Anh
- Mỗi tiểu mục tối đa `per_section` đoạn để kết quả đa dạng
"""

import re
from dataclasses import dataclass
from functools import lru_cache

from psycopg_pool import ConnectionPool

from ..config import get_settings
from ..llm.context import RunContext
from .embeddings import embed_query
from .translate import english_query

RRF_K = 60
CANDIDATES = 30
WORD_RE = re.compile(r'[A-Za-z0-9]{2,}')

CHUNK = 'knowledge_documentchunk'
DOC = 'knowledge_document'


class RetrievalError(Exception):
    pass


@dataclass
class Hit:
    id: int
    document_id: str
    document_title: str
    license_name: str
    heading: str
    url: str
    content: str
    page_start: int | None
    page_end: int | None
    score: float = 0.0
    dense_rank: int | None = None
    keyword_rank: int | None = None

    @property
    def page_label(self) -> str:
        if self.page_start is None:
            return ''
        if self.page_end and self.page_end != self.page_start:
            return f'tr. {self.page_start}–{self.page_end}'
        return f'tr. {self.page_start}'

    @property
    def citation(self) -> str:
        where = self.url or self.page_label
        return f'{self.document_title} — {self.heading}' + (f' ({where})' if where else '')

    def as_dict(self) -> dict:
        return {
            'id': self.id, 'document_id': self.document_id, 'document_title': self.document_title,
            'license_name': self.license_name, 'heading': self.heading, 'url': self.url, 'content': self.content,
            'page_start': self.page_start, 'page_end': self.page_end, 'page_label': self.page_label,
            'score': round(self.score, 5), 'dense_rank': self.dense_rank, 'keyword_rank': self.keyword_rank,
            'citation': self.citation,
        }


@lru_cache
def _pool() -> ConnectionPool:
    url = get_settings().database_url
    if not url:
        raise RetrievalError('Chưa cấu hình DATABASE_URL cho service AI.')
    # prepare_threshold=None: tương thích PgBouncer (Neon pooled connection)
    return ConnectionPool(url, min_size=1, max_size=5, open=True, kwargs={'prepare_threshold': None, 'autocommit': False})


def keyword_terms(text: str) -> str:
    """Ghép các từ bằng OR (giống BM25). Postgres tự bỏ từ dừng + đưa về gốc từ."""
    words = list(dict.fromkeys(w.lower() for w in WORD_RE.findall(text)))[:24]
    return ' | '.join(words)


def rrf(rank_lists: list[list[int]], k: int = RRF_K) -> dict[int, float]:
    fused: dict[int, float] = {}
    for ranks in rank_lists:
        for i, cid in enumerate(ranks):
            fused[cid] = fused.get(cid, 0.0) + 1.0 / (k + i + 1)
    return fused


def _scope_sql(scope: str | None, document_ids: list[str] | None) -> tuple[str, list]:
    where, params = [], []
    if scope:
        where.append('d.scope = ANY(%s)')
        params.append([scope, 'general'])
    if document_ids:
        where.append('d.id::text = ANY(%s)')
        params.append(document_ids)
    return (' AND ' + ' AND '.join(where)) if where else '', params


def search(ctx: RunContext, query: str, k: int = 5, scope: str | None = None, per_section: int = 2,
           document_ids: list[str] | None = None) -> tuple[list[Hit], dict]:
    query = (query or '').strip()
    if not query:
        return [], {}
    en, translated = english_query(ctx, query)
    qvec = embed_query(ctx, f'{query}\n{en}' if translated else query)
    vec_literal = '[' + ','.join(f'{v:.7f}' for v in qvec) + ']'
    extra, params = _scope_sql(scope, document_ids)
    terms = keyword_terms(en)

    with _pool().connection() as conn:
        conn.read_only = True
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT c.id FROM {CHUNK} c JOIN {DOC} d ON d.id = c.document_id '
                f'WHERE c.embedding IS NOT NULL{extra} ORDER BY c.embedding <=> %s::vector LIMIT %s',
                [*params, vec_literal, CANDIDATES],
            )
            dense = [r[0] for r in cur.fetchall()]
            keyword: list[int] = []
            if terms:
                cur.execute(
                    f"SELECT c.id FROM {CHUNK} c JOIN {DOC} d ON d.id = c.document_id, "
                    f"to_tsquery('english', %s) q WHERE c.search_vector @@ q{extra} "
                    f'ORDER BY ts_rank(c.search_vector, q) DESC LIMIT %s',
                    [terms, *params, CANDIDATES],
                )
                keyword = [r[0] for r in cur.fetchall()]
            fused = rrf([dense, keyword])
            ids = list(fused)
            rows = {}
            if ids:
                cur.execute(
                    f'SELECT c.id, c.document_id::text, d.title, d.license_name, c.heading, c.url, c.content, '
                    f'c.page_start, c.page_end FROM {CHUNK} c JOIN {DOC} d ON d.id = c.document_id WHERE c.id = ANY(%s)',
                    [ids],
                )
                rows = {r[0]: r for r in cur.fetchall()}

    dense_rank = {cid: i + 1 for i, cid in enumerate(dense)}
    keyword_rank = {cid: i + 1 for i, cid in enumerate(keyword)}
    hits: list[Hit] = []
    per_key: dict[tuple, int] = {}
    for cid, score in sorted(fused.items(), key=lambda x: -x[1]):
        row = rows.get(cid)
        if row is None:
            continue
        key = (row[1], row[4])
        if per_key.get(key, 0) >= per_section:
            continue
        per_key[key] = per_key.get(key, 0) + 1
        hits.append(Hit(*row, score=score, dense_rank=dense_rank.get(cid), keyword_rank=keyword_rank.get(cid)))
        if len(hits) >= k:
            break
    info = {'query': query, 'english_query': en if translated else '', 'dense': len(dense), 'keyword': len(keyword)}
    return hits, info

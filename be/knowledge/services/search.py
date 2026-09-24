"""
Tìm kiếm lai (hybrid) trong kho tri thức — phương án đã chọn sau spike RAG:
    điểm = RRF( thứ hạng theo vector (nghĩa, pgvector) , thứ hạng theo từ khóa (Postgres full-text) )
- Câu hỏi tiếng Việt: dịch sang tiếng Anh (Groq, có cache) để tìm từ khóa trong sách tiếng Anh;
  dịch lỗi/chưa cấu hình -> vẫn tìm được bằng vector (Gemini đa ngôn ngữ)
- Gộp theo mục: mỗi tiểu mục tối đa `per_section` đoạn để kết quả đa dạng
Dùng lại cho: ô "thử tìm kiếm" của admin, AI viết nháp (C2), tab Hỏi AI.
"""

import re
from dataclasses import dataclass

from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import F, Q
from pgvector.django import CosineDistance

from translation.services import translate_query_to_english

from ..models import Document, DocumentChunk
from .embeddings import embed_query

RRF_K = 60
CANDIDATES = 30
VI_CHARS = re.compile(r'[ăâđêôơưàảãáạằẳẵắặầẩẫấậèẻẽéẹềểễếệìỉĩíịòỏõóọồổỗốộờởỡớợùủũúụừửữứựỳỷỹýỵ]', re.I)
WORD_RE = re.compile(r'[A-Za-z0-9]{2,}')


@dataclass
class SearchHit:
    chunk: DocumentChunk
    score: float
    dense_rank: int | None
    keyword_rank: int | None

    def as_dict(self) -> dict:
        c = self.chunk
        return {
            'id': c.id,
            'document_id': str(c.document_id),
            'document_title': c.document.title,
            'heading': c.heading,
            'url': c.url,
            'page_label': c.page_label,
            'content': c.content,
            'score': round(self.score, 5),
            'dense_rank': self.dense_rank,
            'keyword_rank': self.keyword_rank,
            'citation': citation(c),
        }


def citation(chunk: DocumentChunk) -> str:
    where = chunk.url or chunk.page_label
    return f'{chunk.document.title} — {chunk.heading}' + (f' ({where})' if where else '')


def keyword_terms(text: str) -> str:
    """Ghép các từ bằng OR (giống BM25): đoạn chứa càng nhiều từ càng lên cao. Postgres tự bỏ từ dừng + đưa về gốc từ."""
    words = list(dict.fromkeys(w.lower() for w in WORD_RE.findall(text)))[:24]
    return ' | '.join(words)


def keyword_query(text: str) -> SearchQuery | None:
    terms = keyword_terms(text)
    return SearchQuery(terms, search_type='raw', config='english') if terms else None


def english_query(query: str) -> tuple[str, bool]:
    """(câu dùng để tìm từ khóa, có dịch hay không)"""
    if not VI_CHARS.search(query):
        return query, False
    translated = translate_query_to_english(query)
    return (translated, True) if translated else (query, False)


def hybrid_search(query: str, k: int = 5, scope: str | None = None, per_section: int = 2,
                  document_ids: list | None = None) -> tuple[list[SearchHit], dict]:
    query = (query or '').strip()
    if not query:
        return [], {}

    en, translated = english_query(query)
    base = DocumentChunk.objects.filter(embedding__isnull=False)
    if scope:
        base = base.filter(Q(document__scope=scope) | Q(document__scope=Document.Scope.GENERAL))
    if document_ids:
        base = base.filter(document_id__in=document_ids)

    # 1) Theo nghĩa (vector)
    qvec = embed_query(f'{query}\n{en}' if translated else query)
    dense_ids = list(
        base.annotate(distance=CosineDistance('embedding', qvec)).order_by('distance').values_list('id', flat=True)[:CANDIDATES]
    )

    # 2) Theo từ khóa (full-text, tiếng Anh)
    keyword_ids: list[int] = []
    ts_query = keyword_query(en)
    if ts_query is not None:
        keyword_ids = list(
            base.filter(search_vector=ts_query)
            .annotate(rank=SearchRank(F('search_vector'), ts_query))
            .order_by('-rank')
            .values_list('id', flat=True)[:CANDIDATES]
        )

    # 3) Gộp bằng RRF
    fused: dict[int, float] = {}
    dense_rank = {cid: i + 1 for i, cid in enumerate(dense_ids)}
    keyword_rank = {cid: i + 1 for i, cid in enumerate(keyword_ids)}
    for ranks in (dense_rank, keyword_rank):
        for cid, rank in ranks.items():
            fused[cid] = fused.get(cid, 0.0) + 1.0 / (RRF_K + rank)

    ordered = sorted(fused.items(), key=lambda x: -x[1])
    chunks = DocumentChunk.objects.select_related('document').in_bulk([cid for cid, _ in ordered])

    hits: list[SearchHit] = []
    per_key: dict[tuple, int] = {}
    for cid, score in ordered:
        chunk = chunks.get(cid)
        if chunk is None:
            continue
        key = (chunk.document_id, chunk.heading)
        if per_key.get(key, 0) >= per_section:
            continue
        per_key[key] = per_key.get(key, 0) + 1
        hits.append(SearchHit(chunk, score, dense_rank.get(cid), keyword_rank.get(cid)))
        if len(hits) >= k:
            break

    info = {'query': query, 'english_query': en if translated else '', 'dense': len(dense_ids), 'keyword': len(keyword_ids)}
    return hits, info

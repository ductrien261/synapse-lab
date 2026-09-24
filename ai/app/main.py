"""
SYNAPSE-LAB AI service (FastAPI).
Chỉ backend (be) gọi vào, kèm header X-Internal-Token. Mỗi phản hồi có:
    meta.usage     : từng lần gọi model (token vào/ra, độ trễ) -> be ghi nhật ký, tính tiền, trừ hạn mức
    meta.trace_url : link trace Langfuse (nếu bật)
"""

import hmac
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException

from .config import get_settings
from .graphs import draft as draft_graph
from .llm.chat import LLMError, LLMNotConfigured
from .llm.tracing import run_context, shutdown
from .schemas import DraftStructureIn, SearchIn, TranslateIn
from .tools.embeddings import EmbeddingError
from .tools.retrieval import RetrievalError, search
from .tools.translate import translate_text

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    shutdown()  # đẩy nốt trace Langfuse trước khi tắt


app = FastAPI(title='SYNAPSE-LAB AI', version='0.1.0', lifespan=lifespan)


def require_token(x_internal_token: str = Header(default='')):
    expected = get_settings().ai_service_token
    if not expected or not hmac.compare_digest(x_internal_token, expected):
        raise HTTPException(status_code=401, detail='Sai hoặc thiếu X-Internal-Token')


@app.get('/health')
def health():
    s = get_settings()
    return {
        'status': 'ok',
        'llm': bool(s.groq_api_key),
        'embedding': bool(s.gemini_api_key),
        'knowledge_db': bool(s.database_url),
        'langfuse': s.langfuse_enabled,
        'model': s.groq_model,
    }


def _fail(exc: Exception, ctx) -> HTTPException:
    status = 503 if isinstance(exc, (LLMNotConfigured, RetrievalError)) else 502
    return HTTPException(status_code=status, detail={'message': str(exc), 'meta': ctx.meta()})


@app.post('/v1/translate', dependencies=[Depends(require_token)])
def translate(body: TranslateIn):
    with run_context('translate', 'translate', body.user_id) as ctx:
        try:
            text, cached = translate_text(ctx, body.text, body.target)
        except LLMError as exc:
            raise _fail(exc, ctx) from exc
        return {'text': text, 'cached': cached, 'meta': ctx.meta()}


@app.post('/v1/search', dependencies=[Depends(require_token)])
def search_endpoint(body: SearchIn):
    with run_context('search', 'search', body.user_id, {'query': body.query}) as ctx:
        try:
            hits, info = search(ctx, body.query, k=body.k, scope=body.scope, per_section=body.per_section,
                                document_ids=body.document_ids)
        except (EmbeddingError, RetrievalError) as exc:
            raise _fail(exc, ctx) from exc
        return {**info, 'results': [h.as_dict() for h in hits], 'meta': ctx.meta()}


@app.post('/v1/draft/structure', dependencies=[Depends(require_token)])
def draft_structure(body: DraftStructureIn):
    with run_context('draft_structure', 'draft', body.user_id, {'structure': body.name_en}) as ctx:
        try:
            result = draft_graph.run(ctx, body.name_en, body.latin_name, body.name_vi, body.glossary, body.scope)
        except (EmbeddingError, RetrievalError, LLMError) as exc:
            result = {'status': 'failed', 'error': str(exc), 'citations': [], 'warnings': []}
        return {**result, 'meta': ctx.meta()}

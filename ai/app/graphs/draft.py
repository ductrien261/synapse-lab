"""
Quy trình AI viết nháp nội dung 1 cấu trúc giải phẫu (LangGraph):

    retrieve ──► (không có nguồn nhắc tới cấu trúc) ──► END: no_source   [0 lần gọi LLM]
        │
        ▼
    generate ──► verify ──► (chưa đạt & còn lượt) ──► generate (viết lại, yêu cầu chặt hơn)
                    │
                    ▼
                finalize ──► END: pending
"""

import re
from typing import TypedDict

from langgraph.graph import END, StateGraph

from ..llm.chat import LLMError, chat, parse_json
from ..llm.context import RunContext
from ..prompts import draft as P
from ..tools.retrieval import Hit, search
from ..verify.citations import check, strip_invalid

MAX_SOURCES = 6
EXCERPT_CHARS = 1500
MAX_ATTEMPTS = 2
FIELDS = ('definition', 'function', 'clinical_note')


class DraftState(TypedDict, total=False):
    name_en: str
    latin_name: str
    name_vi: str
    glossary: list[list[str]]
    scope: str
    sources: list[Hit]
    attempts: int
    feedback: str
    result: dict
    status: str
    error: str
    warnings: list[str]


def _terms(name_en: str, latin: str) -> list[str]:
    terms = set()
    for name in (name_en, latin):
        name = re.sub(r'\(.*?\)', '', name or '').strip().lower()
        if len(name) >= 3:
            terms.add(name)
            if name.endswith('s') and len(name) > 4:
                terms.add(name[:-1])
    return sorted(terms)


def _mentions(hit: Hit, terms: list[str]) -> bool:
    text = f'{hit.heading} {hit.content}'.lower()
    return any(t in text for t in terms)


def build(ctx: RunContext):
    def retrieve(state: DraftState) -> DraftState:
        query = ' '.join(dict.fromkeys([state['name_en'], state.get('latin_name', '')])).strip()
        hits, _ = search(ctx, query, k=MAX_SOURCES + 2, scope=state.get('scope') or 'med', per_section=2)
        terms = _terms(state['name_en'], state.get('latin_name', ''))
        relevant = [h for h in hits if _mentions(h, terms)]
        if not relevant:
            return {'status': 'no_source', 'sources': [],
                    'error': 'Không có đoạn nào trong kho nhắc tới cấu trúc này. Hãy nạp thêm chương liên quan.'}
        others = [h for h in hits if h not in relevant]
        return {'sources': (relevant + others)[:MAX_SOURCES], 'attempts': 0}

    def generate(state: DraftState) -> DraftState:
        sources = state['sources']
        excerpts = '\n\n'.join(
            f'[{n}] {h.document_title} — {h.heading}\n{h.content[:EXCERPT_CHARS]}' for n, h in enumerate(sources, start=1)
        )
        lowered = excerpts.lower()
        glossary = [f'{state["name_en"]} = {state["name_vi"]}'] if state.get('name_vi') else []
        glossary += [f'{en} = {vi}' for en, vi in state.get('glossary', []) if en.lower() in lowered][:40]
        user = P.user_prompt(state['name_en'], state.get('latin_name', ''), glossary, excerpts)
        if state.get('feedback'):
            user += '\n\n' + state['feedback']
        try:
            data = parse_json(chat(ctx, f'generate#{state.get("attempts", 0) + 1}', P.SYSTEM, user, json_mode=True))
        except LLMError as exc:
            return {'status': 'failed', 'error': str(exc)}
        return {'result': data, 'attempts': state.get('attempts', 0) + 1}

    def verify(state: DraftState) -> DraftState:
        data = state['result']
        max_n = len(state['sources'])
        report = check([str(data.get(f) or '') for f in FIELDS], max_n)
        if report.ok or state['attempts'] >= MAX_ATTEMPTS:
            warnings = [] if report.ok else [f'Kiểm chứng: {report.problems()}']
            return {'status': 'pending', 'warnings': warnings, 'feedback': ''}
        return {'feedback': P.RETRY_NOTE.format(problems=report.problems(), max_n=max_n)}

    def finalize(state: DraftState) -> DraftState:
        data, sources = state['result'], state['sources']
        max_n = len(sources)
        fields = {f: strip_invalid(str(data.get(f) or ''), max_n) for f in FIELDS}
        if not any(fields.values()):
            return {'status': 'no_source', 'error': 'AI không tìm thấy thông tin phù hợp trong các đoạn trích.'}
        used = check(list(fields.values()), max_n).used
        used |= {n for n in data.get('used_sources') or [] if isinstance(n, int) and 1 <= n <= max_n}
        citations = [
            {'n': n, 'chunk_id': h.id, 'document_id': h.document_id, 'document_title': h.document_title,
             'heading': h.heading, 'url': h.url, 'page_label': h.page_label, 'page_start': h.page_start,
             'excerpt': h.content[:600], 'citation': h.citation}
            for n, h in enumerate(sources, start=1) if n in used
        ]
        return {'result': {'name_vi': str(data.get('name_vi') or '').strip()[:200], **fields, 'citations': citations}}

    g = StateGraph(DraftState)
    g.add_node('retrieve', retrieve)
    g.add_node('generate', generate)
    g.add_node('verify', verify)
    g.add_node('finalize', finalize)
    g.set_entry_point('retrieve')
    g.add_conditional_edges('retrieve', lambda s: END if s.get('status') == 'no_source' else 'generate')
    g.add_conditional_edges('generate', lambda s: END if s.get('status') == 'failed' else 'verify')
    g.add_conditional_edges('verify', lambda s: 'finalize' if s.get('status') == 'pending' else 'generate')
    g.add_edge('finalize', END)
    return g.compile()


def run(ctx: RunContext, name_en: str, latin_name: str = '', name_vi: str = '', glossary: list | None = None,
        scope: str = 'med') -> dict:
    graph = build(ctx)
    state = graph.invoke(
        {'name_en': name_en, 'latin_name': latin_name, 'name_vi': name_vi, 'glossary': glossary or [], 'scope': scope},
        config={'callbacks': ctx.callbacks, 'run_name': 'draft_structure'},
    )
    status = state.get('status', 'failed')
    result = state.get('result') or {}
    return {
        'status': status,
        'name_vi': result.get('name_vi', '') if status == 'pending' else '',
        **{f: result.get(f, '') if status == 'pending' else '' for f in FIELDS},
        'citations': result.get('citations', []) if status == 'pending' else [],
        'error': state.get('error', ''),
        'warnings': state.get('warnings', []),
        'prompt_version': P.VERSION,
    }

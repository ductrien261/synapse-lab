"""
Gia sư "Hỏi AI" (LangGraph) — trả lời dần từng chữ, luôn dựa trên giáo trình:

    retrieve ──► (không có đoạn nào khớp từ khóa) ──► no_source: trả lời mẫu     [0 lần gọi LLM]
        │
        ▼
    generate (stream) ──► verify ──► (chưa đạt) ──► regenerate (1 lần, gửi "replace")
                             │
                             ▼
                         finalize: trích dẫn đã dùng, bộ phận cần làm sáng trên 3D, gợi ý hỏi tiếp

Sự kiện gửi ra ngoài (stream_mode="custom"): {"type": "token"|"replace"|"status", ...}
"""

import re
from typing import TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langgraph.config import get_stream_writer
from langgraph.graph import END, StateGraph

from ..llm.chat import chat, chat_stream
from ..llm.context import RunContext
from ..prompts import tutor as P
from ..tools.retrieval import Hit, search
from ..verify.citations import check, strip_invalid

MAX_SOURCES = 6
EXCERPT_CHARS = 1300
HISTORY_TURNS = 6


class TutorState(TypedDict, total=False):
    question: str
    history: list[dict]
    learner: dict
    model_title: str
    part: dict | None
    parts: list[dict]
    scope: str
    sources: list[Hit]
    english_query: str
    answer: str
    attempts: int
    status: str
    result: dict


def _history(history: list[dict]) -> list[BaseMessage]:
    out: list[BaseMessage] = []
    for m in history[-HISTORY_TURNS * 2:]:
        text = re.sub(r'\[\d{1,2}\]', '', m.get('content', ''))[:1200]  # bỏ số trích dẫn cũ (khác danh sách nguồn mới)
        out.append(HumanMessage(text) if m.get('role') == 'user' else AIMessage(text))
    return out


def _mentions_any(question: str, parts: list[dict]) -> bool:
    q = question.lower()
    return any((p.get('name_vi') and p['name_vi'].lower() in q) or (p.get('name_en') and p['name_en'].lower() in q) for p in parts)


def highlights(answer: str, parts: list[dict]) -> list[int]:
    """Bộ phận trên mô hình được nhắc trong câu trả lời -> làm sáng trên 3D (so khớp tên, không tốn AI)."""
    text = answer.lower()
    found = []
    for p in parts:
        names = [n.lower() for n in (p.get('name_vi'), p.get('name_en')) if n and len(n) >= 3]
        if any(n in text for n in names):
            found.append(p['index'])
    return found[:6]


def suggestions(question: str, part: dict | None, lit: list[dict]) -> list[str]:
    """Gợi ý hỏi tiếp (theo mẫu, không tốn AI)."""
    out = []
    target = lit[0] if lit else part
    if target:
        name = target.get('name_vi') or target.get('name_en')
        out += [f'{name} liên quan với những cấu trúc nào?', f'Tổn thương {name} gây hậu quả gì?']
    out.append('Giải thích ngắn gọn hơn giúp mình')
    return [s for s in out if s.lower() != question.lower()][:3]


def build(ctx: RunContext):
    def retrieve(state: TutorState) -> TutorState:
        writer = get_stream_writer()
        writer({'type': 'status', 'text': 'Đang tìm trong giáo trình...'})
        question = state['question']
        part = state.get('part')
        query = question
        # Câu hỏi không nêu tên bộ phận nào -> ghép tên bộ phận đang chọn để tìm đúng chỗ
        if part and part.get('name_en') and not _mentions_any(question, state.get('parts', [])):
            query = f'{question} ({part["name_en"]})'
        hits, info = search(
            ctx, query, k=MAX_SOURCES, scope=state.get('scope') or None, per_section=2,
            allow_keyword_fallback=True,
        )
        if not any(h.keyword_rank for h in hits):
            return {'sources': [], 'status': 'no_source', 'english_query': info.get('english_query', '')}
        return {'sources': hits, 'attempts': 0, 'english_query': info.get('english_query', '')}

    def no_source(state: TutorState) -> TutorState:
        get_stream_writer()({'type': 'token', 'text': P.NO_SOURCE_ANSWER})
        return {'answer': P.NO_SOURCE_ANSWER}

    def _prompt(state: TutorState) -> str:
        excerpts = '\n\n'.join(
            f'[{n}] {h.document_title} — {h.heading}\n{h.content[:EXCERPT_CHARS]}' for n, h in enumerate(state['sources'], start=1)
        )
        context = P.context_block(state.get('learner', {}), state.get('model_title', ''), state.get('part'), state.get('parts', []))
        return P.user_prompt(state['question'], context, excerpts)

    def generate(state: TutorState) -> TutorState:
        writer = get_stream_writer()
        writer({'type': 'status', 'text': ''})
        parts: list[str] = []
        for text in chat_stream(ctx, 'answer', P.SYSTEM, _prompt(state), history=_history(state.get('history', []))):
            parts.append(text)
            writer({'type': 'token', 'text': text})
        return {'answer': ''.join(parts).strip(), 'attempts': 1}

    def verify(state: TutorState) -> TutorState:
        max_n = len(state['sources'])
        report = check([state['answer']], max_n)
        if report.ok or state.get('attempts', 0) >= 2:
            return {'status': 'ok' if report.ok else 'unverified'}
        # Viết lại 1 lần (không stream), gửi bản thay thế
        get_stream_writer()({'type': 'status', 'text': 'Đang kiểm chứng lại trích dẫn...'})
        fixed = chat(ctx, 'answer_retry', P.SYSTEM,
                     _prompt(state) + '\n\n' + P.RETRY_NOTE.format(problems=report.problems(), max_n=max_n),
                     history=_history(state.get('history', [])))
        get_stream_writer()({'type': 'replace', 'text': fixed})
        report2 = check([fixed], max_n)
        return {'answer': fixed, 'attempts': 2, 'status': 'ok' if report2.ok else 'unverified'}

    def finalize(state: TutorState) -> TutorState:
        sources = state.get('sources', [])
        answer = strip_invalid(state.get('answer', ''), len(sources)) if sources else state.get('answer', '')
        used = check([answer], len(sources)).used if sources else set()
        citations = [
            {'n': n, 'chunk_id': h.id, 'document_id': h.document_id, 'document_title': h.document_title,
             'heading': h.heading, 'url': h.url, 'page_label': h.page_label, 'excerpt': h.content[:500]}
            for n, h in enumerate(sources, start=1) if n in used
        ]
        parts = state.get('parts', [])
        lit_idx = highlights(answer, parts)
        lit = [p for p in parts if p['index'] in lit_idx]
        return {'result': {
            'answer': answer,
            'citations': citations,
            'highlights': lit_idx,
            'suggestions': suggestions(state['question'], state.get('part'), lit),
            'status': state.get('status', 'ok'),
            'english_query': state.get('english_query', ''),
            'prompt_version': P.VERSION,
        }}

    g = StateGraph(TutorState)
    for name, fn in [('retrieve', retrieve), ('no_source', no_source), ('generate', generate), ('verify', verify), ('finalize', finalize)]:
        g.add_node(name, fn)
    g.set_entry_point('retrieve')
    g.add_conditional_edges('retrieve', lambda s: 'no_source' if s.get('status') == 'no_source' else 'generate')
    g.add_edge('no_source', 'finalize')
    g.add_edge('generate', 'verify')
    g.add_edge('verify', 'finalize')
    g.add_edge('finalize', END)
    return g.compile()


def stream(ctx: RunContext, payload: dict):
    """Chạy quy trình, trả dần các sự kiện: ('token'|'replace'|'status', dict) ... rồi ('done', result)."""
    graph = build(ctx)
    final: dict = {}
    for mode, chunk in graph.stream(payload, config={'callbacks': ctx.callbacks, 'run_name': 'tutor'},
                                    stream_mode=['custom', 'values']):
        if mode == 'custom':
            yield chunk['type'], chunk
        elif mode == 'values' and chunk.get('result'):
            final = chunk['result']
    yield 'done', final

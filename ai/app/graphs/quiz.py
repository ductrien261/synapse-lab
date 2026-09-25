"""
Ra đề ôn tập thích ứng (LangGraph) và chấm tự luận.

generate:  write ──► validate ──► (chưa đạt, còn lượt) ──► write (kèm lỗi cần sửa)
                         │
                         ▼
                       done (câu hỏi đã kiểm tra: đủ lựa chọn, đúng 1 đáp án, giải thích có nguồn)

grade (tự luận): 1 lần gọi AI theo rubric -> kiểm tra định dạng -> điểm = số ý đạt / tổng ý
"""

from typing import TypedDict

from langgraph.graph import END, StateGraph

from ..llm.chat import LLMError, chat, parse_json
from ..llm.context import RunContext
from ..prompts import quiz as P
from ..verify.quiz import validate_grade, validate_item

MAX_ATTEMPTS = 2


class QuizState(TypedDict, total=False):
    kind: str
    difficulty: int
    structure: dict
    sources: list[dict]
    misconceptions: list[str]
    avoid: list[str]
    attempts: int
    problem: str
    data: dict
    status: str
    error: str


def build(ctx: RunContext):
    def write(state: QuizState) -> QuizState:
        kind = state['kind']
        user = P.user_prompt(state['structure'], state.get('difficulty', 1), state['sources'],
                             state.get('misconceptions', []), state.get('avoid', []))
        if state.get('problem'):
            user += '\n\n' + P.RETRY_NOTE.format(problem=state['problem'], max_n=len(state['sources']))
        attempt = state.get('attempts', 0) + 1
        try:
            data = parse_json(chat(ctx, f'quiz_{kind}#{attempt}', P.SYSTEMS[kind], user, json_mode=True, temperature=0.5))
        except LLMError as exc:
            return {'attempts': attempt, 'problem': str(exc), 'data': {}}
        return {'attempts': attempt, 'data': data, 'problem': ''}

    def validate(state: QuizState) -> QuizState:
        problem = state.get('problem') or validate_item(state['kind'], state.get('data') or {}, len(state['sources']))
        if not problem:
            return {'status': 'ok', 'problem': ''}
        if state['attempts'] >= MAX_ATTEMPTS:
            return {'status': 'failed', 'error': f'Câu hỏi AI sinh chưa đạt kiểm tra ({problem}).'}
        return {'problem': problem}

    g = StateGraph(QuizState)
    g.add_node('write', write)
    g.add_node('validate', validate)
    g.set_entry_point('write')
    g.add_edge('write', 'validate')
    g.add_conditional_edges('validate', lambda s: END if s.get('status') in ('ok', 'failed') else 'write')
    return g.compile()


def generate(ctx: RunContext, kind: str, structure: dict, sources: list[dict], difficulty: int = 1,
             misconceptions: list[str] | None = None, avoid: list[str] | None = None) -> dict:
    if kind not in P.SYSTEMS:
        return {'status': 'failed', 'error': f'Dạng câu hỏi không hỗ trợ: {kind}'}
    if not sources:
        return {'status': 'failed', 'error': 'Không có nguồn để ra câu hỏi.'}
    state = build(ctx).invoke(
        {'kind': kind, 'structure': structure, 'sources': sources, 'difficulty': difficulty,
         'misconceptions': misconceptions or [], 'avoid': avoid or []},
        config={'callbacks': ctx.callbacks, 'run_name': f'quiz_generate_{kind}'},
    )
    if state.get('status') != 'ok':
        return {'status': 'failed', 'error': state.get('error') or 'Không tạo được câu hỏi.'}
    d = state['data']
    item = {'status': 'ok', 'kind': kind, 'question': str(d['question']).strip(),
            'explanation': str(d.get('explanation') or '').strip(), 'prompt_version': P.VERSION}
    if kind in ('mcq', 'case'):
        item.update(options=[str(o).strip() for o in d['options']], correct_index=d['correct_index'],
                    distractor_notes=['' if i == d['correct_index'] else str(n or '').strip() for i, n in enumerate(d['distractor_notes'])])
    else:
        item['rubric'] = [str(r).strip() for r in d['rubric']]
    return item


def grade(ctx: RunContext, question: str, rubric: list[str], sources: list[dict], answer: str) -> dict:
    answer = (answer or '').strip()
    if len(answer) < 3:
        return {'status': 'ok', 'score': 0.0, 'hits': [], 'feedback': 'Bạn chưa nhập câu trả lời.', 'misconception': ''}
    prompt = P.grade_prompt(question, rubric, sources, answer)
    problem = ''
    for attempt in range(MAX_ATTEMPTS):
        try:
            data = parse_json(chat(ctx, f'grade#{attempt + 1}', P.GRADE_SYSTEM,
                                   prompt + (f'\n\nBản trước sai định dạng: {problem}' if problem else ''), json_mode=True, temperature=0))
        except LLMError as exc:
            problem = str(exc)
            continue
        problem = validate_grade(data, len(rubric))
        if not problem:
            hits = sorted(set(data['hits']))
            return {
                'status': 'ok', 'score': round(len(hits) / len(rubric), 3) if rubric else 0.0, 'hits': hits,
                'feedback': str(data['feedback']).strip(), 'misconception': str(data.get('misconception') or '').strip()[:300],
                'prompt_version': P.GRADE_VERSION,
            }
    return {'status': 'failed', 'error': f'Chưa chấm được ({problem}).'}

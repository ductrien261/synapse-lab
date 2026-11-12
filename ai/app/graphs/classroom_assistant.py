import json

from ..llm.chat import LLMError, chat, parse_json
from ..llm.context import RunContext
from ..prompts import classroom_assistant as P


def _clean_text(value, limit: int) -> str:
    return ' '.join(str(value or '').split())[:limit]


def _validate(data: dict) -> str:
    if not _clean_text(data.get('answer'), 4500):
        return 'thiếu câu trả lời'
    if type(data.get('used_external_knowledge')) is not bool:
        return 'used_external_knowledge không hợp lệ'
    suggestions = data.get('suggested_questions')
    if not isinstance(suggestions, list) or not 2 <= len(suggestions) <= 3:
        return 'suggested_questions phải có 2-3 câu'
    if any(not _clean_text(item, 200) for item in suggestions):
        return 'câu hỏi gợi ý không hợp lệ'
    return ''


def run(ctx: RunContext, context: dict) -> dict:
    page_contexts = []
    for item in context.get('page_contexts') or []:
        if not isinstance(item, dict):
            continue
        text = _clean_text(item.get('text'), 10000)
        if text:
            page_contexts.append({'page': item.get('page'), 'text': text})
    if not page_contexts:
        return {'status': 'no_text', 'error': 'Không có đủ nội dung trang để AI hỗ trợ.'}

    history = []
    for item in (context.get('history') or [])[-12:]:
        if not isinstance(item, dict) or item.get('role') not in {'user', 'assistant'}:
            continue
        content = _clean_text(item.get('content'), 1800)
        if content:
            history.append({'role': item['role'], 'content': content, 'page': item.get('page')})

    prompt = json.dumps({
        'document_title': _clean_text(context.get('document_title'), 300),
        'section_title': _clean_text(context.get('section_title'), 300),
        'lesson_objective': _clean_text(context.get('lesson_objective'), 1000),
        'current_page': context.get('current_page'),
        'total_pages': context.get('total_pages'),
        'page_contexts': page_contexts,
        'conversation_history': history,
        'student_question': _clean_text(context.get('question'), 8000),
    }, ensure_ascii=False)
    problem = ''
    for attempt in range(2):
        user = prompt + (f'\nBản trước chưa đạt: {problem}. Hãy sửa lại.' if problem else '')
        try:
            data = parse_json(chat(ctx, f'classroom_assistant#{attempt + 1}', P.SYSTEM, user, json_mode=True, temperature=0.3))
        except LLMError as exc:
            problem = str(exc)
            continue
        problem = _validate(data)
        if not problem:
            return {
                'status': 'ok',
                'answer': str(data['answer']).strip()[:4500],
                'used_external_knowledge': data['used_external_knowledge'],
                'suggested_questions': [_clean_text(item, 200) for item in data['suggested_questions']],
                'prompt_version': P.VERSION,
            }
    return {'status': 'failed', 'error': f'AI chưa tạo được câu trả lời đạt yêu cầu ({problem}).'}

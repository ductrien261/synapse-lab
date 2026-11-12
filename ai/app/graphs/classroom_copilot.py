import json

from ..llm.chat import LLMError, chat, parse_json
from ..llm.context import RunContext
from ..prompts import classroom_copilot as P


def _clean_text(value, limit: int) -> str:
    return ' '.join(str(value or '').split())[:limit]


def _validate(data: dict) -> str:
    poll = data.get('poll')
    options = poll.get('options') if isinstance(poll, dict) else None
    if not _clean_text(data.get('summary'), 800):
        return 'thiếu tóm tắt'
    if not _clean_text(data.get('explanation'), 1800):
        return 'thiếu cách giải thích'
    points = data.get('key_points')
    if not isinstance(points, list) or not 2 <= len(points) <= 4 or any(not _clean_text(item, 300) for item in points):
        return 'key_points phải có 2-4 ý'
    if not isinstance(poll, dict) or not _clean_text(poll.get('question'), 500):
        return 'thiếu câu hỏi poll'
    if not isinstance(options, list) or len(options) != 4 or len({_clean_text(item, 300).casefold() for item in options}) != 4:
        return 'poll phải có 4 lựa chọn khác nhau'
    if type(poll.get('correct_index')) is not int or not 0 <= poll['correct_index'] < 4:
        return 'correct_index không hợp lệ'
    return ''


def run(ctx: RunContext, context: dict) -> dict:
    page_text = _clean_text(context.get('page_text'), 12000)
    if len(page_text) < 40:
        return {'status': 'no_text', 'error': 'Trang này không có đủ văn bản để AI phân tích.'}

    prompt = json.dumps({
        'document_title': _clean_text(context.get('document_title'), 300),
        'page': context.get('page'),
        'total_pages': context.get('total_pages'),
        'section_title': _clean_text(context.get('section_title'), 300),
        'lesson_objective': _clean_text(context.get('lesson_objective'), 1000),
        'section_objective': _clean_text(context.get('section_objective'), 1000),
        'teacher_notes': _clean_text(context.get('teacher_notes'), 1500),
        'page_text': page_text,
    }, ensure_ascii=False)
    problem = ''
    for attempt in range(2):
        user = prompt + (f'\nBản trước chưa đạt: {problem}. Hãy sửa lại.' if problem else '')
        try:
            data = parse_json(chat(ctx, f'classroom_copilot#{attempt + 1}', P.SYSTEM, user, json_mode=True, temperature=0.3))
        except LLMError as exc:
            problem = str(exc)
            continue
        problem = _validate(data)
        if not problem:
            poll = data['poll']
            return {
                'status': 'ok',
                'summary': _clean_text(data['summary'], 800),
                'explanation': _clean_text(data['explanation'], 1800),
                'key_points': [_clean_text(item, 300) for item in data['key_points']],
                'misconception': _clean_text(data.get('misconception'), 500),
                'check_question': _clean_text(data.get('check_question'), 500),
                'poll': {
                    'question': _clean_text(poll['question'], 500),
                    'options': [_clean_text(item, 300) for item in poll['options']],
                    'correct_index': poll['correct_index'],
                },
                'prompt_version': P.VERSION,
            }
    return {'status': 'failed', 'error': f'AI chưa tạo được gợi ý đạt yêu cầu ({problem}).'}


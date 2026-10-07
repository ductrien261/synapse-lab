"""Generate a bounded learning aid from a published algorithm lesson."""

import json

from ..llm.chat import LLMError, chat, parse_json
from ..prompts.algorithm_tutor import SYSTEMS, VERSION


def _source_evidence(item: dict, sources: list[dict]) -> tuple[int, str]:
    index, quote = item.get('source_index'), item.get('source_quote')
    if type(index) is not int or index not in range(1, len(sources) + 1) or not isinstance(quote, str):
        raise ValueError('Thiếu đoạn nguồn hỗ trợ đáp án.')
    source = ' '.join(str(sources[index - 1].get('text', '')).split()).casefold()
    normalized_quote = ' '.join(quote.split()).casefold()
    if not 10 <= len(quote) <= 180 or normalized_quote not in source:
        raise ValueError('Đoạn dẫn nguồn không khớp bài học hoặc tài liệu.')
    return index, quote.strip()


def _validated(action: str, data: dict, quiz_options: dict | None = None,
               flashcard_options: dict | None = None, sources: list[dict] | None = None) -> dict:
    title, content = data.get('title'), data.get('content')
    if not isinstance(title, str) or not title.strip() or not isinstance(content, str) or not content.strip():
        raise ValueError('Thiếu tiêu đề hoặc nội dung.')
    result = {'action': action, 'title': title.strip()[:120], 'content': content.strip()[:4000], 'prompt_version': VERSION}
    sources = sources or []
    if action in ('quiz', 'flashcards') and not sources:
        raise ValueError('Bài học chưa có đoạn nguồn để soạn câu hỏi.')
    if action == 'quiz':
        questions = data.get('questions')
        if not isinstance(questions, list) or len(questions) != quiz_options['count']:
            raise ValueError(f'Cần đúng {quiz_options["count"]} câu hỏi.')
        cleaned = []
        seen = set()
        for item in questions:
            if not isinstance(item, dict):
                raise ValueError('Câu hỏi phải là object.')
            question, options = item.get('content'), item.get('options')
            index, explanation = item.get('correct_index'), item.get('explanation')
            if (not isinstance(question, str) or not question.strip() or
                    not isinstance(options, list) or len(options) != 4 or
                    any(not isinstance(o, str) or not o.strip() for o in options) or
                    len({o.strip().casefold() for o in options}) != 4 or
                    type(index) is not int or index not in range(4) or
                    not isinstance(explanation, str) or not explanation.strip()):
                raise ValueError('Mỗi câu cần bốn đáp án khác nhau, một đáp án đúng và lời giải.')
            key = question.strip().casefold()
            if key in seen:
                raise ValueError('Các câu hỏi bị trùng.')
            seen.add(key)
            source_index, source_quote = _source_evidence(item, sources)
            cleaned.append({'content': question.strip()[:600], 'options': [o.strip()[:300] for o in options],
                            'correct_index': index, 'explanation': explanation.strip()[:1500],
                            'source_index': source_index, 'source_quote': source_quote})
        result['questions'] = cleaned
    if action == 'flashcards':
        cards = data.get('cards')
        if not isinstance(cards, list) or len(cards) != flashcard_options['count']:
            raise ValueError(f'Cần đúng {flashcard_options["count"]} flashcard.')
        cleaned_cards = []
        seen = set()
        for card in cards:
            if not isinstance(card, dict):
                raise ValueError('Flashcard phải là object.')
            front, back = card.get('front'), card.get('back')
            if not isinstance(front, str) or not front.strip() or not isinstance(back, str) or not back.strip():
                raise ValueError('Mỗi flashcard cần đủ mặt trước và mặt sau.')
            key = front.strip().casefold()
            if key in seen:
                raise ValueError('Các flashcard bị trùng câu hỏi.')
            seen.add(key)
            source_index, source_quote = _source_evidence(card, sources)
            cleaned_cards.append({'front': front.strip()[:400], 'back': back.strip()[:900],
                                  'source_index': source_index, 'source_quote': source_quote})
        result['cards'] = cleaned_cards
    if action in ('quiz', 'flashcards'):
        result['sources'] = [
            {'title': str(source.get('title', 'Bài học')), 'url': str(source.get('url', '')),
             'kind': source.get('kind', 'lesson')}
            for source in sources
        ]
    return result


def run(ctx, action: str, lesson: dict, question: str = '', frame: dict | None = None,
        quiz_options: dict | None = None, code_selection: dict | None = None,
        scenario_options: dict | None = None, flashcard_options: dict | None = None) -> dict:
    if action not in SYSTEMS:
        raise ValueError('Kiểu hỗ trợ không hợp lệ.')
    if action == 'quiz' and not quiz_options:
        raise ValueError('Chưa có cấu hình bài trắc nghiệm.')
    if action == 'scenario' and not scenario_options:
        raise ValueError('Chưa có cấu hình tình huống.')
    if action == 'flashcards' and not flashcard_options:
        raise ValueError('Chưa có cấu hình flashcard.')
    if action == 'explain_code' and not code_selection:
        raise ValueError('Chưa có đoạn mã được chọn.')
    prompt = json.dumps({'lesson': lesson, 'learner_question': question, 'current_step': frame or None,
                         'quiz_options': quiz_options if action == 'quiz' else None,
                         'scenario_options': scenario_options if action == 'scenario' else None,
                         'flashcard_options': flashcard_options if action == 'flashcards' else None,
                         'code_selection': code_selection if action == 'explain_code' else None}, ensure_ascii=False)
    error = ''
    for attempt in range(2):
        suffix = f'\n\nJSON trước chưa hợp lệ: {error}. Viết lại đúng cấu trúc.' if error else ''
        try:
            data = parse_json(chat(ctx, f'{action}#{attempt + 1}', SYSTEMS[action], prompt + suffix, json_mode=True))
            return _validated(action, data, quiz_options, flashcard_options, lesson.get('sources', []))
        except (LLMError, ValueError) as exc:
            error = str(exc)
    raise LLMError(f'Không tạo được nội dung hợp lệ: {error}')

"""Giải thích trạng thái mô phỏng trong Phòng thí nghiệm ảo (chỉ đọc, không tính vật lý)."""

import json

from ..llm.chat import LLMError, chat, parse_json
from ..prompts.lab_explainer import LABS, SYSTEMS, VERSION

MAX_STATE_CHARS = 4000
MAX_TURNS = 8
MAX_TURN_CHARS = 1500
MAX_CONTEXT_CHARS = 1500


def _validated(mode: str, data: dict) -> dict:
    title, content = data.get('title'), data.get('content')
    if not isinstance(title, str) or not title.strip() or not isinstance(content, str) or not content.strip():
        raise ValueError('Thiếu tiêu đề hoặc nội dung.')
    return {'mode': mode, 'title': title.strip()[:120], 'content': content.strip()[:2000], 'prompt_version': VERSION}


def run(ctx, mode: str, lab: str, stage: str, state: dict, question: str = '', history: list[dict] | None = None, context: str = '') -> dict:
    if mode not in SYSTEMS:
        raise ValueError('Kiểu hỗ trợ không hợp lệ.')
    if lab not in LABS:
        raise ValueError('Bài thí nghiệm không hợp lệ.')
    if lab == 'generic' and not context.strip():
        raise ValueError('Thiếu mô tả bài.')
    description = LABS[lab] + (' ' + context.strip()[:MAX_CONTEXT_CHARS] if lab == 'generic' else '')
    state_text = json.dumps(state, ensure_ascii=False)
    if len(state_text) > MAX_STATE_CHARS:
        raise ValueError('Trạng thái mô phỏng quá lớn.')
    if mode == 'ask' and not question.strip():
        raise ValueError('Chưa có câu hỏi.')
    turns = [{'role': t['role'], 'content': str(t['content'])[:MAX_TURN_CHARS]}
             for t in (history or [])[-MAX_TURNS:] if t.get('role') in ('user', 'assistant') and str(t.get('content', '')).strip()]
    prompt = json.dumps({'lab_description': description, 'stage': stage, 'state': state, 'conversation_so_far': turns,
                         'learner_question': question if mode == 'ask' else ''}, ensure_ascii=False)
    error = ''
    for attempt in range(2):
        suffix = f'\n\nJSON trước chưa hợp lệ: {error}. Viết lại đúng cấu trúc.' if error else ''
        try:
            data = parse_json(chat(ctx, f'lab_{mode}#{attempt + 1}', SYSTEMS[mode], prompt + suffix, json_mode=True))
            return _validated(mode, data)
        except (LLMError, ValueError) as exc:
            error = str(exc)
    raise LLMError(f'Không tạo được nội dung hợp lệ: {error}')

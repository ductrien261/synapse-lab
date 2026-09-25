"""
"Kiểm tra nhanh" sau câu trả lời của gia sư: 1 câu trắc nghiệm sinh từ CHÍNH các đoạn giáo trình vừa dùng.
Kiểm chứng: đủ 4 lựa chọn khác nhau, đúng 1 đáp án, giải thích có trích dẫn hợp lệ; sai -> sinh lại 1 lần.
"""

from ..llm.chat import LLMError, chat, parse_json
from ..llm.context import RunContext
from ..prompts import tutor as P
from ..verify.citations import CITE_RE


def validate(data: dict, max_n: int) -> str:
    options = data.get('options')
    if not isinstance(options, list) or len(options) != 4 or len({str(o).strip().lower() for o in options}) != 4:
        return 'cần đúng 4 lựa chọn khác nhau'
    if not isinstance(data.get('correct_index'), int) or not 0 <= data['correct_index'] < 4:
        return 'correct_index phải từ 0 đến 3'
    if not str(data.get('question') or '').strip():
        return 'thiếu câu hỏi'
    nums = [int(n) for n in CITE_RE.findall(str(data.get('explanation') or ''))]
    if not nums or any(n < 1 or n > max_n for n in nums):
        return f'giải thích phải có trích dẫn [n] với n từ 1 đến {max_n}'
    return ''


def run(ctx: RunContext, topic: str, answer: str, sources: list[dict]) -> dict:
    excerpts = '\n\n'.join(f'[{i}] {s.get("heading", "")}\n{s.get("excerpt", "")}' for i, s in enumerate(sources, start=1))
    user = f'Chủ đề vừa học: {topic}\n\nLời giải thích gia sư đã đưa:\n{answer[:1500]}\n\nCác đoạn giáo trình:\n\n{excerpts}'
    problem = ''
    for attempt in range(2):
        prompt = user + (f'\n\nBản trước chưa đạt: {problem}. Sửa lại.' if problem else '')
        try:
            data = parse_json(chat(ctx, f'quick_check#{attempt + 1}', P.QUICK_CHECK_SYSTEM, prompt, json_mode=True, temperature=0.4))
        except LLMError as exc:
            problem = str(exc)
            continue
        problem = validate(data, len(sources))
        if not problem:
            return {
                'status': 'ok',
                'question': str(data['question']).strip(),
                'options': [str(o).strip() for o in data['options']],
                'correct_index': data['correct_index'],
                'explanation': str(data.get('explanation') or '').strip(),
                'prompt_version': P.QUICK_CHECK_VERSION,
            }
    return {'status': 'failed', 'error': f'Chưa tạo được câu hỏi đạt kiểm chứng ({problem}).'}

"""Source-grounded learning activities for the anatomy tutor."""

from ..llm.chat import LLMError, chat, parse_json
from ..llm.context import RunContext
from ..tools.retrieval import Hit, search
from ..verify.citations import CITE_RE

MAX_SOURCES = 6

SYSTEM = """Bạn là gia sư giải phẫu cho sinh viên y khoa Việt Nam.
Chỉ dùng các đoạn giáo trình được cung cấp. Không tự thêm chẩn đoán, triệu chứng hay cơ chế y khoa.
Tình huống bệnh nhân là giả định để học; không trình bày như ca bệnh có thật.
Mỗi lời giải thích, ý tóm tắt hoặc mặt sau flashcard phải có [n] trỏ tới đoạn nguồn tương ứng.
Nếu tài liệu không đủ căn cứ, không bịa nội dung.
Trả về đúng một object JSON, không thêm lời dẫn."""

FORMATS = {
    'quiz': 'Tạo đúng {count} câu trắc nghiệm giải phẫu kiểu {quiz_style}. Mỗi câu có 4 lựa chọn khác nhau, đúng đúng 1 đáp án. '
            'Mỗi câu phải dựa trên thông tin có trong nguồn. Với mỗi câu, chép một cụm 10-180 ký tự nguyên văn từ đúng đoạn nguồn '
            'hỗ trợ đáp án vào source_quote; source_n là số [n] của đoạn đó. Lời giải trích dẫn chính đoạn [source_n]. '
            'Không đưa thông tin không có trong nguồn vào câu hỏi hoặc đáp án. Các câu không trùng nhau. '
            'Trả JSON {"questions":[{"question":"...","options":["...","...","...","..."],'
            '"correct_index":0,"explanation":"... [1]","source_n":1,"source_quote":"..."},...]}.',
    'scenario': 'Tạo 1 tình huống giả định ngắn theo kiểu {style}, gồm bối cảnh 2-3 câu và một câu hỏi '
                'suy luận giải phẫu với 4 lựa chọn khác nhau, đúng đúng 1 đáp án. '
                'Không suy diễn bệnh lý từ một cấu trúc bình thường. '
                'Trả JSON {"question":"Tình huống...\\n\\nCâu hỏi: ...",'
                '"options":["...","...","...","..."],"correct_index":0,"explanation":"... [1]"}.',
    'summary': 'Tóm tắt 4-6 ý quan trọng về chủ đề. Mỗi ý độc lập, ngắn và có [n]. '
               'Trả JSON {"items":["Ý 1 [1]","Ý 2 [2]",...]}.',
    'flashcards': 'Tạo đúng {card_count} flashcard hỏi đáp ngắn về chủ đề và trọng tâm người học yêu cầu, không trùng nhau. '
                  'Mỗi mặt sau có [n] và một cụm 10-180 ký tự chép nguyên văn từ chính đoạn nguồn đó '
                  'trong source_quote; source_n là số [n]. Chỉ hỏi điều có trong nguồn; nếu nguồn không đủ, không bịa. '
                  'Trả JSON {"cards":[{"front":"Câu hỏi?","back":"Đáp án [1]",'
                  '"source_n":1,"source_quote":"..."},...]}.',
}


def _cited(text: str, max_n: int) -> bool:
    nums = [int(n) for n in CITE_RE.findall(text)]
    return bool(nums) and all(1 <= n <= max_n for n in nums)


def _validate_question(data: dict, max_n: int, scenario: bool = False) -> str:
    if not isinstance(data, dict):
        return 'câu hỏi không hợp lệ'
    options = data.get('options')
    if not isinstance(options, list) or len(options) != 4 or not all(isinstance(o, str) and o.strip() for o in options):
        return 'cần bốn lựa chọn'
    if len({o.strip().casefold() for o in options}) != 4:
        return 'các lựa chọn phải khác nhau'
    if type(data.get('correct_index')) is not int or not 0 <= data['correct_index'] < 4:
        return 'correct_index không hợp lệ'
    if not isinstance(data.get('question'), str) or len(data['question'].strip()) < 20:
        return 'thiếu câu hỏi'
    if scenario and 'câu hỏi' not in data['question'].lower():
        return 'tình huống cần có câu hỏi rõ ràng'
    if not isinstance(data.get('explanation'), str) or not _cited(data['explanation'], max_n):
        return 'lời giải thiếu trích dẫn hợp lệ'
    return ''


def _evidence_error(item: dict, cited_text: str, hits: list[Hit]) -> str:
    source_n = item.get('source_n')
    quote = item.get('source_quote')
    if type(source_n) is not int or not 1 <= source_n <= len(hits) or not isinstance(quote, str):
        return 'thiếu bằng chứng từ nguồn'
    normalized_quote = ' '.join(quote.split()).casefold()
    normalized_source = ' '.join(hits[source_n - 1].content[:1300].split()).casefold()
    if not 10 <= len(quote) <= 180 or normalized_quote not in normalized_source:
        return 'trích đoạn nguồn không khớp tài liệu'
    if source_n not in [int(n) for n in CITE_RE.findall(cited_text)]:
        return 'lời giải chưa dẫn đúng nguồn'
    return ''


def validate(action: str, data: dict, max_n: int, question_count: int = 1,
             hits: list[Hit] | None = None, card_count: int = 5) -> str:
    if not isinstance(data, dict):
        return 'nội dung không hợp lệ'
    if action == 'quiz':
        questions = data.get('questions')
        if not isinstance(questions, list) or len(questions) != question_count:
            return f'cần đúng {question_count} câu hỏi'
        for question in questions:
            problem = _validate_question(question, max_n)
            if problem:
                return problem
            if hits is not None:
                problem = _evidence_error(question, question['explanation'], hits)
                if problem:
                    return problem
        if len({q['question'].strip().casefold() for q in questions}) != question_count:
            return 'câu hỏi bị trùng'
    elif action == 'scenario':
        return _validate_question(data, max_n, scenario=True)
    elif action == 'summary':
        items = data.get('items')
        if not isinstance(items, list) or not 4 <= len(items) <= 6 or not all(isinstance(i, str) and _cited(i, max_n) for i in items):
            return 'cần 4-6 ý có trích dẫn hợp lệ'
    elif action == 'flashcards':
        cards = data.get('cards')
        if not isinstance(cards, list) or len(cards) != card_count:
            return f'cần đúng {card_count} flashcard'
        for card in cards:
            if not isinstance(card, dict) or not isinstance(card.get('front'), str) or not card['front'].strip() or not isinstance(card.get('back'), str) or not _cited(card['back'], max_n):
                return 'flashcard thiếu câu hỏi, đáp án hoặc trích dẫn'
            if hits is not None:
                problem = _evidence_error(card, card['back'], hits)
                if problem:
                    return problem
        if len({card['front'].strip().casefold() for card in cards}) != card_count:
            return 'flashcard bị trùng'
    else:
        return 'tính năng không hợp lệ'
    return ''


def _citations(data: dict, hits: list[Hit]) -> list[dict]:
    used = {int(n) for n in CITE_RE.findall(str(data))}
    return [
        {'n': n, 'chunk_id': hit.id, 'document_id': hit.document_id,
         'document_title': hit.document_title, 'heading': hit.heading,
         'url': hit.url, 'page_label': hit.page_label, 'excerpt': hit.content[:500]}
        for n, hit in enumerate(hits, start=1) if n in used
    ]


def run(ctx: RunContext, action: str, model_title: str, part: dict | None, topic: str = '',
        style: str = 'clinic', question_count: int = 5, quiz_style: str = 'theory',
        card_count: int = 5, focus_note: str = '') -> dict:
    if action not in FORMATS:
        return {'status': 'failed', 'error': 'Tính năng không hợp lệ.'}
    part_name = (part or {}).get('name_en') or (part or {}).get('name_vi') or ''
    focus = topic.strip() or part_name or model_title
    query = ' '.join(dict.fromkeys([part_name, focus, focus_note.strip(), model_title])).strip()[:300]
    hits, _ = search(ctx, query, k=MAX_SOURCES, scope='med', per_section=2, allow_keyword_fallback=True)
    if not any(hit.keyword_rank for hit in hits):
        return {'status': 'no_source', 'error': 'Chưa tìm thấy nguồn giáo trình phù hợp để tạo nội dung.'}

    excerpts = '\n\n'.join(f'[{n}] {h.document_title} — {h.heading}\n{h.content[:1300]}' for n, h in enumerate(hits, 1))
    style_label = (
        'ca khám bệnh giả định, chỉ dùng dữ kiện y khoa có trong nguồn'
        if style == 'clinic' else
        'buổi học quan sát mô hình giải phẫu 3D đang xem; hỏi về vị trí, đường đi hoặc mối liên hệ '
        'của cấu trúc dựa trên nguồn, không bịa đặc điểm hình ảnh hay bệnh lý'
    )
    quiz_style_label = {
        'theory': 'kiến thức lý thuyết',
        'application': 'vận dụng trong tình huống thực tế giả định',
        'practice': 'nhận diện cấu trúc và chức năng trên mô hình',
    }.get(quiz_style, 'kiến thức lý thuyết')
    instruction = (FORMATS[action].replace('{style}', style_label).replace('{count}', str(question_count))
                   .replace('{quiz_style}', quiz_style_label).replace('{card_count}', str(card_count)))
    focus_line = f'\nTrọng tâm flashcard: {focus_note.strip()}' if action == 'flashcards' and focus_note.strip() else ''
    prompt = (f'Mô hình: {model_title}\nBộ phận đang chọn: {part_name}\nChủ đề muốn học: {focus}'
              f'{focus_line}\n\n{instruction}\n\nNguồn:\n{excerpts}')
    problem = ''
    for attempt in range(2):
        try:
            data = parse_json(chat(ctx, f'anatomy_{action}#{attempt + 1}', SYSTEM,
                                   prompt + (f'\n\nBản trước chưa đạt: {problem}. Sửa lại.' if problem else ''),
                                   json_mode=True, temperature=0.3))
        except LLMError as exc:
            problem = str(exc)
            continue
        problem = validate(action, data, len(hits), question_count, hits, card_count)
        if not problem:
            return {'status': 'ok', 'action': action, 'data': data, 'citations': _citations(data, hits)}
    return {'status': 'failed', 'error': f'Chưa tạo được nội dung có dẫn nguồn ({problem}).'}

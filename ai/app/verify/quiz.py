"""Kiểm tra câu hỏi do AI sinh (quy tắc, không tốn AI)."""

from .citations import CITE_RE


def _cites_ok(text: str, max_n: int) -> bool:
    nums = [int(n) for n in CITE_RE.findall(text or '')]
    return bool(nums) and all(1 <= n <= max_n for n in nums)


def validate_item(kind: str, data: dict, max_n: int) -> str:
    """Trả về mô tả lỗi ('' = đạt)."""
    if not str(data.get('question') or '').strip():
        return 'thiếu câu hỏi'
    if kind in ('mcq', 'case'):
        options = data.get('options')
        if not isinstance(options, list) or len(options) != 4:
            return 'cần đúng 4 lựa chọn'
        if len({str(o).strip().lower() for o in options}) != 4 or any(not str(o).strip() for o in options):
            return 'các lựa chọn phải khác nhau và không rỗng'
        ci = data.get('correct_index')
        if not isinstance(ci, int) or not 0 <= ci < 4:
            return 'correct_index phải từ 0 đến 3'
        notes = data.get('distractor_notes')
        if not isinstance(notes, list) or len(notes) != 4:
            return 'distractor_notes phải có 4 phần tử'
    elif kind == 'short':
        rubric = data.get('rubric')
        if not isinstance(rubric, list) or not 2 <= len(rubric) <= 4:
            return 'rubric cần 2-4 ý'
        if not all(_cites_ok(str(r), max_n) for r in rubric):
            return 'mỗi ý trong rubric phải có [n] hợp lệ'
    if not _cites_ok(str(data.get('explanation') or ''), max_n):
        return f'giải thích phải có trích dẫn [n] với n từ 1 đến {max_n}'
    return ''


def validate_grade(data: dict, rubric_len: int) -> str:
    hits = data.get('hits')
    if not isinstance(hits, list) or any(not isinstance(h, int) or not 0 <= h < rubric_len for h in hits):
        return f'hits phải là danh sách chỉ số từ 0 đến {rubric_len - 1}'
    if not str(data.get('feedback') or '').strip():
        return 'thiếu nhận xét'
    return ''

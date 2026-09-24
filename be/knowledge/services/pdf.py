"""
Nguồn PDF (giáo trình có chữ thật, không phải ảnh scan). Dùng PyMuPDF:
- đoán tiêu đề theo cỡ chữ (chữ to hơn thân bài rõ rệt)
- mỗi Section giữ số trang để trích dẫn "tr. N"
PDF scan (ảnh) cần OCR — chưa hỗ trợ.
"""

import re
from collections import Counter

from .chunking import Section

NOISE = [re.compile(r'^\d{1,2}/\d{1,2}/\d{2,4},? \d{1,2}:\d{2}'), re.compile(r'^https?://'), re.compile(r'^\d+(/\d+)?$')]
HEADING_RATIO = 1.25


class PdfError(Exception):
    pass


def parse_pdf(data: bytes, title: str) -> tuple[list[Section], int]:
    """Trả về (các Section, số trang)."""
    try:
        import pymupdf
    except ImportError as exc:  # pragma: no cover
        raise PdfError('Máy chủ chưa cài PyMuPDF (chạy lại uv sync).') from exc

    try:
        doc = pymupdf.open(stream=data, filetype='pdf')
    except Exception as exc:  # noqa: BLE001
        raise PdfError('File PDF bị lỗi hoặc có mật khẩu.') from exc

    lines: list[tuple[int, float, str]] = []
    for page_no, page in enumerate(doc, start=1):
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                spans = [s for s in line['spans'] if s['text'].strip()]
                if not spans:
                    continue
                text = ' '.join(s['text'].strip() for s in spans)
                if any(p.search(text) for p in NOISE):
                    continue
                lines.append((page_no, round(max(s['size'] for s in spans), 1), text))
    page_count = doc.page_count
    doc.close()

    if not lines:
        raise PdfError('Không đọc được chữ trong PDF (có thể là file scan dạng ảnh).')

    body_size = Counter(size for _, size, _ in lines).most_common(1)[0][0]
    sections: list[Section] = []
    path: list[str] = []
    buffer: list[str] = []
    start_page = 1

    def flush():
        text = re.sub(r'\s+', ' ', ' '.join(buffer)).strip()
        buffer.clear()
        if len(text) >= 40:
            sections.append(Section(heading_path=path.copy() or [title], text=text, page=start_page))

    for page_no, size, text in lines:
        if size >= body_size * HEADING_RATIO and len(text) < 120:
            flush()
            level = 1 if size >= body_size * 1.6 else 2
            path = (path[: level - 1] + [text]) if level > 1 else [text]
            start_page = page_no
            continue
        if not buffer:
            start_page = page_no
        buffer.append(text)
    flush()
    return sections, page_count

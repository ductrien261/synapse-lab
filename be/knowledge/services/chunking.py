"""
Chia đoạn theo cấu trúc tiêu đề (đã thử nghiệm trong spike RAG, xem RESULTS):
- Mỗi Section (1 tiểu mục trong sách) là đơn vị gốc
- Tiểu mục ngắn -> giữ nguyên 1 đoạn (không cắt giữa ý)
- Tiểu mục dài  -> cắt theo ranh giới câu, ~max_chars/đoạn, gối đầu overlap_chars
Mỗi đoạn mang theo đường dẫn tiêu đề + link/số trang để trích dẫn.
"""

import re
from dataclasses import dataclass, field

MAX_CHARS = 1200
OVERLAP_CHARS = 200

SENTENCE_END = re.compile(r'(?<=[.!?])\s+(?=[A-Z0-9“"(\[À-Ỹ])')


@dataclass
class Section:
    """Một tiểu mục có vị trí rõ ràng trong cây mục lục."""

    heading_path: list[str]
    text: str
    url: str = ''
    page: int | None = None

    @property
    def breadcrumb(self) -> str:
        return ' › '.join(self.heading_path)


@dataclass
class ChunkDraft:
    text: str
    section: Section
    extra: dict = field(default_factory=dict)


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in SENTENCE_END.split(text) if s.strip()]


def chunk_sections(sections: list[Section], max_chars: int = MAX_CHARS, overlap_chars: int = OVERLAP_CHARS) -> list[ChunkDraft]:
    chunks: list[ChunkDraft] = []
    for section in sections:
        if len(section.text) <= max_chars:
            chunks.append(ChunkDraft(section.text, section))
            continue
        current = ''
        for sentence in split_sentences(section.text):
            if current and len(current) + len(sentence) + 1 > max_chars:
                chunks.append(ChunkDraft(current, section))
                tail = current[-overlap_chars:]
                current = tail[tail.find(' ') + 1:] if ' ' in tail else tail
            current = f'{current} {sentence}'.strip()
        if current:
            chunks.append(ChunkDraft(current, section))
    return chunks


def contextual_text(doc_title: str, breadcrumb: str, text: str) -> str:
    """Văn bản đưa vào embedding: kèm đường dẫn tiêu đề để đoạn 'tự hiểu' mình nói về gì."""
    return f'{doc_title} › {breadcrumb}\n{text}'

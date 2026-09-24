"""
Kiểm chứng trích dẫn bằng quy tắc (không tốn AI):
- mỗi câu có ít nhất 1 số [n]
- số [n] phải nằm trong danh sách nguồn
"""

import re
from dataclasses import dataclass, field

CITE_RE = re.compile(r'\[(\d{1,2})\]')
SENTENCE_RE = re.compile(r'(?<=[.!?…])\s+|(?<=\])\s+(?=[A-ZÀ-Ỹ])')


@dataclass
class CitationReport:
    sentences: int = 0
    uncited: int = 0
    invalid: list[int] = field(default_factory=list)
    used: set[int] = field(default_factory=set)

    @property
    def ok(self) -> bool:
        # Cho phép tối đa 1 câu (hoặc 20%) thiếu trích dẫn — câu nối, câu mở đầu ngắn
        allowed = max(1, int(self.sentences * 0.2))
        return not self.invalid and self.uncited <= allowed

    def problems(self) -> str:
        parts = []
        if self.uncited:
            parts.append(f'{self.uncited}/{self.sentences} câu thiếu trích dẫn')
        if self.invalid:
            parts.append(f'số trích dẫn không tồn tại: {sorted(set(self.invalid))}')
        return '; '.join(parts) or 'không có'


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in SENTENCE_RE.split(text or '') if s and s.strip()]


def check(texts: list[str], max_n: int) -> CitationReport:
    report = CitationReport()
    for text in texts:
        for sentence in split_sentences(text):
            if len(sentence) < 12:
                continue
            report.sentences += 1
            nums = [int(n) for n in CITE_RE.findall(sentence)]
            if not nums:
                report.uncited += 1
            for n in nums:
                if 1 <= n <= max_n:
                    report.used.add(n)
                else:
                    report.invalid.append(n)
    return report


def strip_invalid(text: str, max_n: int) -> str:
    return CITE_RE.sub(lambda m: m.group(0) if 1 <= int(m.group(1)) <= max_n else '', text or '').strip()

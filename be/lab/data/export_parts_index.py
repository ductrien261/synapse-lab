"""Tạo lại parts_index.json từ thư viện linh kiện ở frontend.

Chạy từ thư mục be:  python lab/data/export_parts_index.py
Chạy lại mỗi khi thêm linh kiện hoặc đổi chân trong fe/src/lib/lab/parts/catalog.ts.
"""

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CATALOG = HERE.parents[2] / 'fe' / 'src' / 'lib' / 'lab' / 'parts' / 'catalog.ts'


def build_index(text: str) -> dict[str, list[str]]:
    starts = [m for m in re.finditer(r"^    id: '([a-z0-9-]+)',", text, re.M)]
    index = {}
    for i, m in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(text)
        index[m.group(1)] = re.findall(r"pin\('([a-z0-9-]+)',", text[m.end():end])
    return index


if __name__ == '__main__':
    index = build_index(CATALOG.read_text(encoding='utf-8'))
    (HERE / 'parts_index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'Đã ghi {len(index)} linh kiện', file=sys.stderr)

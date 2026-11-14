"""Xếp vị trí linh kiện lên khung nền bằng mã (AI không đưa tọa độ).

Mỗi linh kiện chiếm một ô hình chữ nhật theo hai kích thước lớn nhất trong `sizeMm` (an toàn: không bao giờ
chồng lên nhau, dù linh kiện đặt đứng hay nằm), xếp theo hàng từ trái sang phải. Đơn vị: mét.
"""

import math

from ..validators import parts_index

MARGIN = 0.012
CHASSIS_ID = 'chassis'
CHASSIS_TOP = 0.003
MIN_WIDTH = 0.16
MAX_WIDTH = 0.42


def footprint(part_id: str) -> tuple[float, float]:
    size = sorted(parts_index()[part_id]['sizeMm'], reverse=True)
    return size[0] / 1000 + MARGIN, size[1] / 1000 + MARGIN


def _order(items: list[dict], near: list[list[str]]) -> list[dict]:
    """Giữ thứ tự đã cho, nhưng kéo bộ phận được ghi là "gần" lên sát bộ phận vừa xếp."""
    nearby: dict[str, set[str]] = {}
    for a, b in near:
        nearby.setdefault(a, set()).add(b)
        nearby.setdefault(b, set()).add(a)
    remaining = list(items)
    out = [remaining.pop(0)]
    while remaining:
        last = out[-1]['id']
        pick = next((x for x in remaining if x['id'] in nearby.get(last, ())), remaining[0])
        remaining.remove(pick)
        out.append(pick)
    return out


def layout_parts(parts: list[dict], near: list[list[str]] | None = None) -> dict:
    """parts: [{id, partId}]. Trả về {positions: {id: {at, node}}, scene, warnings}."""
    warnings: list[str] = []
    chassis = next((p for p in parts if p['partId'] == CHASSIS_ID), None)
    movable = [p for p in parts if p is not chassis]
    base_y = CHASSIS_TOP if chassis else 0.0

    sizes = {p['id']: footprint(p['partId']) for p in movable}
    if chassis:
        plate_w = parts_index()[CHASSIS_ID]['sizeMm'][0] / 1000
        plate_d = parts_index()[CHASSIS_ID]['sizeMm'][2] / 1000
        width = plate_w - 0.02
    else:
        area = sum(w * d for w, d in sizes.values())
        width = min(MAX_WIDTH, max(MIN_WIDTH, math.sqrt(area) * 1.6))
        plate_d = None

    rows: list[list[dict]] = [[]]
    cursor = 0.0
    for p in _order(movable, near or []) if movable else []:
        w, _ = sizes[p['id']]
        if rows[-1] and cursor + w > width:
            rows.append([])
            cursor = 0.0
        rows[-1].append(p)
        cursor += w

    row_depths = [max((sizes[p['id']][1] for p in row), default=0.0) for row in rows]
    total_d = sum(row_depths)
    positions: dict[str, dict] = {}
    z = -total_d / 2
    max_half_x = 0.0
    for row, depth in zip(rows, row_depths):
        row_w = sum(sizes[p['id']][0] for p in row)
        x = -row_w / 2
        for p in row:
            w, _ = sizes[p['id']]
            cx, cz = x + w / 2, z + depth / 2
            positions[p['id']] = {'at': [round(cx, 4), base_y, round(cz, 4)], 'node': [round(cx, 4), round(base_y + 0.02, 4), round(cz, 4)]}
            x += w
        max_half_x = max(max_half_x, row_w / 2)
        z += depth

    if chassis:
        positions[chassis['id']] = {'at': [0.0, 0.0, 0.0], 'node': [0.0, 0.003, 0.0]}
        if plate_d is not None and total_d > plate_d:
            warnings.append('Linh kiện nhiều hơn chỗ trên khung, một số nằm ra ngoài mép khung.')

    extent = max(max_half_x * 2, total_d, (plate_w if chassis else 0.0))
    radius = max(0.12, extent)
    scene = {
        'camera': {'pos': [round(0.9 * radius, 3), round(0.8 * radius + 0.05, 3), round(1.2 * radius, 3)], 'target': [0, 0.01, 0], 'min': round(0.5 * radius, 3), 'max': round(5 * radius, 3)},
        'wireCamera': {'pos': [round(0.2 * radius, 3), round(0.9 * radius, 3), round(0.5 * radius, 3)], 'target': [0, 0.01, 0], 'min': round(0.4 * radius, 3), 'max': round(4 * radius, 3)},
        'grid': round(max(0.6, 3 * radius), 2),
        'ground': '#E7E4DC',
        'decor': [],
    }
    return {'positions': positions, 'scene': scene, 'warnings': warnings}

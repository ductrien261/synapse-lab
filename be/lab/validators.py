"""Kiểm tra gói bài thực hành (lab package) ở backend.

Bản kiểm tra này song song với `fe/src/lib/lab/package/validate.ts`: backend không tin dữ liệu từ
trình duyệt hay từ AI. Danh sách linh kiện và chân lấy từ `data/parts_index.json`
(xuất ra từ thư viện linh kiện ở frontend, xem docs/lab/PACKAGE.md).
Trả về danh sách lỗi tiếng Việt; rỗng là hợp lệ.
"""

import ast
import json
import math
import re
from functools import lru_cache
from pathlib import Path

SCHEMA_VERSION = 1
MAX_PACKAGE_BYTES = 200_000
SLUG_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
COLOR_RE = re.compile(r'^#[0-9a-fA-F]{6}$')
IDENT_RE = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')
PLACEHOLDER_RE = re.compile(r'\{([A-Za-z_][A-Za-z0-9_]*)(?::\d+)?\}')
TEMPLATES = ('iot-moisture', 'formula', 'vehicle-arena')
ORIENTS = ('flat', 'motor', 'lying', 'probe', 'upright')

_FUNCS = {'min': min, 'max': max, 'abs': abs, 'sqrt': math.sqrt, 'pow': math.pow, 'round': round}


@lru_cache(maxsize=1)
def parts_index() -> dict[str, list[str]]:
    path = Path(__file__).resolve().parent / 'data' / 'parts_index.json'
    return json.loads(path.read_text(encoding='utf-8'))


class ExprError(ValueError):
    pass


def evaluate(expr: str, scope: dict[str, float]) -> float:
    """Tính biểu thức số học an toàn: số, tên biến, + - * / ( ) và min max abs sqrt pow round."""
    try:
        tree = ast.parse(expr, mode='eval')
    except SyntaxError as err:
        raise ExprError('biểu thức sai cú pháp') from err

    def walk(n):
        if isinstance(n, ast.Expression):
            return walk(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)) and not isinstance(n.value, bool):
            return float(n.value)
        if isinstance(n, ast.Name):
            if n.id not in scope:
                raise ExprError(f'chưa có biến "{n.id}"')
            return float(scope[n.id])
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.USub, ast.UAdd)):
            v = walk(n.operand)
            return -v if isinstance(n.op, ast.USub) else v
        if isinstance(n, ast.BinOp) and isinstance(n.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
            a, b = walk(n.left), walk(n.right)
            if isinstance(n.op, ast.Add):
                return a + b
            if isinstance(n.op, ast.Sub):
                return a - b
            if isinstance(n.op, ast.Mult):
                return a * b
            if b == 0:
                raise ExprError('chia cho 0')
            return a / b
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in _FUNCS and not n.keywords:
            try:
                return float(_FUNCS[n.func.id](*[walk(a) for a in n.args]))
            except (TypeError, ValueError) as err:
                raise ExprError(f'lỗi khi gọi {n.func.id}') from err
        raise ExprError('biểu thức dùng phép tính không được hỗ trợ')

    value = walk(tree)
    if not math.isfinite(value):
        raise ExprError('kết quả không hữu hạn')
    return value


def _is_num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def _is_str(v) -> bool:
    return isinstance(v, str) and v.strip() != ''


def _is_v3(v) -> bool:
    return isinstance(v, list) and len(v) == 3 and all(_is_num(x) for x in v)


def _is_cam(c) -> bool:
    return isinstance(c, dict) and _is_v3(c.get('pos')) and _is_v3(c.get('target'))


def validate_package(pkg) -> list[str]:
    e: list[str] = []
    if not isinstance(pkg, dict):
        return ['Gói bài không phải một đối tượng JSON']
    if len(json.dumps(pkg, ensure_ascii=False).encode('utf-8')) > MAX_PACKAGE_BYTES:
        return [f'Gói bài quá lớn (tối đa {MAX_PACKAGE_BYTES // 1000} KB)']

    if pkg.get('schemaVersion') != SCHEMA_VERSION:
        e.append(f'schemaVersion phải là {SCHEMA_VERSION}')
    slug = pkg.get('slug')
    if not isinstance(slug, str) or not SLUG_RE.match(slug) or not 3 <= len(slug) <= 61:
        e.append('slug phải là kebab-case, 3 đến 61 ký tự')
    for k in ('title', 'subtitle'):
        if not _is_str(pkg.get(k)):
            e.append(f'Thiếu {k}')

    ov = pkg.get('overview')
    if not (isinstance(ov, dict) and _is_str(ov.get('title')) and _is_str(ov.get('what')) and isinstance(ov.get('steps'), list)
            and len(ov['steps']) >= 2 and all(_is_str(s) for s in ov['steps'])):
        e.append('overview cần title, what và ít nhất 2 bước (steps)')

    sc = pkg.get('scene')
    if not (isinstance(sc, dict) and _is_cam(sc.get('camera')) and _is_cam(sc.get('wireCamera')) and _is_num(sc.get('grid'))
            and _is_str(sc.get('ground')) and isinstance(sc.get('decor'), list)):
        e.append('scene cần camera, wireCamera, grid, ground, decor')

    index = parts_index()
    part_ids: dict[str, str] = {}
    parts = pkg.get('parts') if isinstance(pkg.get('parts'), list) else []
    if len(parts) < 2:
        e.append('Cần ít nhất 2 bộ phận (parts)')
    for i, q in enumerate(parts):
        at = f'Bộ phận #{i + 1}'
        if not isinstance(q, dict):
            e.append(f'{at}: không phải đối tượng')
            continue
        pid = q.get('id')
        if not _is_str(pid):
            e.append(f'{at}: thiếu id')
        elif pid in part_ids:
            e.append(f'{at}: trùng id "{pid}"')
        else:
            part_ids[pid] = q.get('partId') if isinstance(q.get('partId'), str) else ''
        for k in ('name', 'role', 'goal', 'hint'):
            if not _is_str(q.get(k)):
                e.append(f'{at}: thiếu {k}')
        if not (isinstance(q.get('color'), str) and COLOR_RE.match(q['color'])):
            e.append(f'{at}: color phải dạng #RRGGBB')
        facts = q.get('facts')
        if not (isinstance(facts, list) and all(isinstance(f, dict) and _is_str(f.get('k')) and _is_str(f.get('v')) for f in facts)):
            e.append(f'{at}: facts phải là danh sách {{k, v}}')
        details = q.get('details')
        if not (isinstance(details, list) and details and all(_is_str(d) for d in details)):
            e.append(f'{at}: details cần ít nhất một ý')
        if not (_is_v3(q.get('at')) and _is_v3(q.get('node'))):
            e.append(f'{at}: thiếu at hoặc node (3 số)')
        if q.get('orient') is not None and q['orient'] not in ORIENTS:
            e.append(f'{at}: orient không hợp lệ')
        if q.get('partId') not in index:
            e.append(f'{at}: linh kiện "{q.get("partId")}" không có trong thư viện')

    order = pkg.get('buildOrder')
    if not (isinstance(order, list) and len(order) == len(parts) and sorted(order, key=lambda v: v if _is_num(v) else -1) == list(range(len(parts)))):
        e.append('buildOrder phải là một hoán vị của 0 đến số bộ phận trừ 1')
    for i, link in enumerate(pkg.get('links') if isinstance(pkg.get('links'), list) else []):
        if not (isinstance(link, list) and len(link) == 2 and all(isinstance(x, str) and x in part_ids for x in link)):
            e.append(f'links #{i + 1}: phải là cặp id bộ phận có trong bài')

    _validate_wiring(pkg.get('wiring'), part_ids, index, e)
    _validate_exercises(pkg.get('exercises'), part_ids, e)
    _validate_tune(pkg.get('tune'), e)

    tx = pkg.get('texts')
    if not (isinstance(tx, dict) and _is_str(tx.get('buildDone')) and _is_str(tx.get('buildDoneLabel'))):
        e.append('Thiếu texts.buildDone hoặc texts.buildDoneLabel')
    return e


def _validate_wiring(w, part_ids, index, e):
    if not isinstance(w, dict):
        e.append('Thiếu wiring')
        return
    net_ids: set[str] = set()
    nets = w.get('nets') if isinstance(w.get('nets'), list) else []
    if len(nets) < 2:
        e.append('wiring cần ít nhất 2 mạch (nets)')
    for i, n in enumerate(nets):
        if not (isinstance(n, dict) and _is_str(n.get('id')) and _is_str(n.get('name')) and _is_str(n.get('done'))
                and isinstance(n.get('color'), str) and COLOR_RE.match(n['color'])):
            e.append(f'Mạch #{i + 1}: cần id, name, done, color #RRGGBB')
            continue
        if n['id'] in net_ids:
            e.append(f'Mạch "{n["id"]}" bị trùng')
        net_ids.add(n['id'])
    term_ids: set[str] = set()
    per_net: dict[str, int] = {}
    for i, t in enumerate(w.get('terminals') if isinstance(w.get('terminals'), list) else []):
        at = f'Chân #{i + 1}'
        if not isinstance(t, dict):
            e.append(f'{at}: không phải đối tượng')
            continue
        if not _is_str(t.get('id')):
            e.append(f'{at}: thiếu id')
        elif t['id'] in term_ids:
            e.append(f'{at}: trùng id "{t["id"]}"')
        else:
            term_ids.add(t['id'])
        for k in ('label', 'desc'):
            if not _is_str(t.get(k)):
                e.append(f'{at}: thiếu {k}')
        if (t.get('pos') is None) != (t.get('base') is None):
            e.append(f'{at}: pos và base phải cùng có hoặc cùng bỏ trống')
        elif t.get('pos') is not None and not (_is_v3(t['pos']) and _is_num(t['base'])):
            e.append(f'{at}: pos hoặc base không hợp lệ')
        if t.get('net') not in net_ids:
            e.append(f'{at}: mạch "{t.get("net")}" không tồn tại')
        else:
            per_net[t['net']] = per_net.get(t['net'], 0) + 1
        if t.get('part') not in part_ids:
            e.append(f'{at}: bộ phận "{t.get("part")}" không có trong bài')
        elif t.get('pin') not in index.get(part_ids[t['part']], []):
            e.append(f'{at}: linh kiện "{part_ids[t["part"]]}" không có chân "{t.get("pin")}"')
    for nid in net_ids:
        if per_net.get(nid, 0) < 2:
            e.append(f'Mạch "{nid}" cần ít nhất 2 chân')
    for i, r in enumerate(w.get('rules') if isinstance(w.get('rules'), list) else []):
        if not (isinstance(r, dict) and isinstance(r.get('nets'), list) and len(r['nets']) == 2 and _is_str(r.get('message'))):
            e.append(f'Luật #{i + 1}: cần nets (2 mạch) và message')
            continue
        for n in r['nets']:
            if n != '*' and n not in net_ids:
                e.append(f'Luật #{i + 1}: mạch "{n}" không tồn tại')
        if r.get('terminals') is not None and not (isinstance(r['terminals'], list) and len(r['terminals']) == 2 and all(x in term_ids for x in r['terminals'])):
            e.append(f'Luật #{i + 1}: terminals phải là cặp id chân có trong bài')
    for k in ('exercise', 'fallback', 'doneText'):
        if not _is_str(w.get(k)):
            e.append(f'wiring thiếu {k}')


def _valid_input(inp) -> bool:
    return (isinstance(inp, dict) and _is_str(inp.get('name')) and _is_str(inp.get('label')) and isinstance(inp.get('unit'), str)
            and all(_is_num(inp.get(k)) for k in ('min', 'max', 'step', 'default')))


def _validate_exercises(ex, part_ids, e):
    ex = ex if isinstance(ex, list) else []
    if not ex:
        e.append('Cần ít nhất 1 bài tính (exercises)')
    for i, q in enumerate(ex):
        at = f'Bài tính #{i + 1}'
        if not isinstance(q, dict):
            e.append(f'{at}: không phải đối tượng')
            continue
        for k in ('title', 'prompt', 'answer', 'placeholder', 'okText', 'failText'):
            if not _is_str(q.get(k)):
                e.append(f'{at}: thiếu {k}')
        if q.get('focus') not in part_ids:
            e.append(f'{at}: focus "{q.get("focus")}" không phải bộ phận trong bài')
        tol = q.get('tolerance')
        if not (isinstance(tol, dict) and (_is_num(tol.get('rel')) or _is_num(tol.get('abs')))):
            e.append(f'{at}: tolerance cần rel hoặc abs')
        scope: dict[str, float] = {}
        consts = q.get('constants')
        if isinstance(consts, dict):
            for k, v in consts.items():
                if _is_num(v):
                    scope[k] = v
                else:
                    e.append(f'{at}: hằng số "{k}" không phải số')
        inputs = q.get('inputs') if isinstance(q.get('inputs'), list) else []
        if not inputs:
            e.append(f'{at}: cần ít nhất một đại lượng nhập (inputs)')
        good = []
        for inp in inputs:
            if not _valid_input(inp):
                e.append(f'{at}: một đại lượng nhập thiếu name, label, unit, min, max, step hoặc default')
                continue
            if inp['min'] >= inp['max'] or not inp['min'] <= inp['default'] <= inp['max']:
                e.append(f'{at}: đại lượng "{inp["name"]}" có min, max, default không hợp lệ')
            scope[inp['name']] = inp['default']
            good.append(inp)
        if _is_str(q.get('answer')):
            try:
                lo, hi = dict(scope), dict(scope)
                for inp in good:
                    lo[inp['name']], hi[inp['name']] = inp['min'], inp['max']
                a = evaluate(q['answer'], scope)
                evaluate(q['answer'], lo)
                evaluate(q['answer'], hi)
                if not a > 0:
                    e.append(f'{at}: đáp án với giá trị mặc định phải là số dương (ô nhập chỉ nhận số dương)')
                scope['answer'] = a
            except ExprError as err:
                e.append(f'{at}: công thức lỗi: {err}')
        for k in ('prompt', 'okText', 'failText'):
            if _is_str(q.get(k)):
                for name in PLACEHOLDER_RE.findall(q[k]):
                    if name not in scope:
                        e.append(f'{at}: {k} dùng {{{name}}} nhưng không có biến này')


def _validate_tune(tune, e):
    if not isinstance(tune, dict) or tune.get('template') not in TEMPLATES:
        e.append(f'tune.template phải là một trong: {", ".join(TEMPLATES)}')
        return
    if tune['template'] == 'iot-moisture':
        return
    if not (_is_str(tune.get('title')) and _is_str(tune.get('intro'))):
        e.append('tune cần title và intro')
    if tune['template'] == 'vehicle-arena':
        return

    at = 'tune (công thức)'
    names: set[str] = set()
    scope: dict[str, float] = {}

    def claim(name):
        if name in names:
            e.append(f'{at}: tên "{name}" bị trùng giữa đại lượng, hằng số và kết quả')
        names.add(name)

    consts = tune.get('constants')
    if isinstance(consts, dict):
        for k, v in consts.items():
            if not IDENT_RE.match(k) or not _is_num(v):
                e.append(f'{at}: hằng số "{k}" không hợp lệ')
            else:
                scope[k] = v
                claim(k)
    else:
        e.append(f'{at}: thiếu constants')
    inputs = tune.get('inputs') if isinstance(tune.get('inputs'), list) else []
    if not inputs:
        e.append(f'{at}: cần ít nhất một đại lượng chỉnh được (inputs)')
    ranges = []
    for inp in inputs:
        if not _valid_input(inp) or not IDENT_RE.match(inp['name']):
            e.append(f'{at}: một đại lượng thiếu name (dạng định danh), label, unit, min, max, step hoặc default')
            continue
        if inp['min'] >= inp['max'] or not inp['min'] <= inp['default'] <= inp['max'] or inp['step'] <= 0:
            e.append(f'{at}: đại lượng "{inp["name"]}" có min, max, step, default không hợp lệ')
        scope[inp['name']] = inp['default']
        ranges.append(inp)
        claim(inp['name'])
    outputs = tune.get('outputs') if isinstance(tune.get('outputs'), list) else []
    if not outputs:
        e.append(f'{at}: cần ít nhất một kết quả (outputs)')
    out_ids, exprs = set(), []
    for o in outputs:
        if not (isinstance(o, dict) and _is_str(o.get('id')) and IDENT_RE.match(o['id']) and _is_str(o.get('label')) and _is_str(o.get('expr'))
                and isinstance(o.get('unit'), str) and _is_num(o.get('digits')) and 0 <= o['digits'] <= 6):
            e.append(f'{at}: một kết quả thiếu id (dạng định danh), label, expr, unit hoặc digits (0 đến 6)')
            continue
        claim(o['id'])
        out_ids.add(o['id'])
        exprs.append((o['id'], o['expr']))
    cases = [dict(scope)]
    for r in ranges:
        cases += [{**scope, r['name']: r['min']}, {**scope, r['name']: r['max']}]
    for c in cases:
        sc = dict(c)
        for oid, expr in exprs:
            try:
                sc[oid] = evaluate(expr, sc)
            except ExprError as err:
                e.append(f'{at}: công thức của "{oid}" lỗi: {err}')
                break
    ch = tune.get('chart')
    if not (isinstance(ch, dict) and _is_str(ch.get('xLabel')) and _is_str(ch.get('yLabel'))
            and any(r['name'] == ch.get('xInput') for r in ranges) and ch.get('yOutput') in out_ids):
        e.append(f'{at}: chart cần xInput là một đại lượng, yOutput là một kết quả, và xLabel, yLabel')
    if not isinstance(tune.get('limits'), list):
        e.append(f'{at}: thiếu limits (có thể là danh sách rỗng)')
    else:
        for lim in tune['limits']:
            if not (isinstance(lim, dict) and lim.get('output') in out_ids and _is_str(lim.get('text'))
                    and (_is_num(lim.get('min')) or _is_num(lim.get('max')))):
                e.append(f'{at}: một giới hạn cần output có thật, text, và min hoặc max')

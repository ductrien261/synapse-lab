/**
 * Kiểm tra một gói bài thực hành (JSON không đáng tin, ví dụ do AI sinh).
 * Trả về danh sách lỗi bằng tiếng Việt, rỗng là hợp lệ. Dùng cả khi nhận bài từ AI lẫn trước khi hiển thị.
 */
import { getPart, hasPin } from '../parts';
import { evaluate, placeholders } from './expr';
import { PACKAGE_SCHEMA_VERSION, type LabPackage } from './types';

type Rec = Record<string, unknown>;
const isRec = (x: unknown): x is Rec => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isV3 = (x: unknown): x is [number, number, number] => Array.isArray(x) && x.length === 3 && x.every(isNum);
const isCam = (x: unknown) => isRec(x) && isV3(x.pos) && isV3(x.target);
const SLUG = /^[a-z][a-z0-9-]{2,60}$/;
const ORIENTS = ['flat', 'motor', 'lying', 'probe', 'upright'];
const TUNES = ['iot-moisture'];
const COLOR = /^#[0-9a-fA-F]{6}$/;

export function validatePackage(input: unknown): string[] {
  const e: string[] = [];
  if (!isRec(input)) return ['Gói bài không phải một đối tượng JSON'];
  const p = input;

  if (p.schemaVersion !== PACKAGE_SCHEMA_VERSION) e.push(`schemaVersion phải là ${PACKAGE_SCHEMA_VERSION}`);
  if (!isStr(p.slug) || !SLUG.test(p.slug)) e.push('slug phải là kebab-case, 3 đến 61 ký tự');
  for (const k of ['title', 'subtitle']) if (!isStr(p[k])) e.push(`Thiếu ${k}`);

  const ov = p.overview;
  if (!isRec(ov) || !isStr(ov.title) || !isStr(ov.what) || !Array.isArray(ov.steps) || ov.steps.length < 2 || !ov.steps.every(isStr)) e.push('overview cần title, what và ít nhất 2 bước (steps)');

  const sc = p.scene;
  if (!isRec(sc) || !isCam(sc.camera) || !isCam(sc.wireCamera) || !isNum(sc.grid) || !isStr(sc.ground) || !Array.isArray(sc.decor)) e.push('scene cần camera, wireCamera, grid, ground, decor');

  // ----- Bộ phận
  const partIds = new Set<string>();
  const parts = Array.isArray(p.parts) ? p.parts : [];
  if (parts.length < 2) e.push('Cần ít nhất 2 bộ phận (parts)');
  parts.forEach((q, i) => {
    const at = `Bộ phận #${i + 1}`;
    if (!isRec(q)) return void e.push(`${at}: không phải đối tượng`);
    if (!isStr(q.id)) e.push(`${at}: thiếu id`);
    else if (partIds.has(q.id)) e.push(`${at}: trùng id "${q.id}"`);
    else partIds.add(q.id);
    for (const k of ['name', 'role', 'goal', 'hint']) if (!isStr(q[k])) e.push(`${at}: thiếu ${k}`);
    if (!isStr(q.color) || !COLOR.test(q.color)) e.push(`${at}: color phải dạng #RRGGBB`);
    if (!Array.isArray(q.facts) || !q.facts.every((f) => isRec(f) && isStr(f.k) && isStr(f.v))) e.push(`${at}: facts phải là danh sách {k, v}`);
    if (!Array.isArray(q.details) || q.details.length === 0 || !q.details.every(isStr)) e.push(`${at}: details cần ít nhất một ý`);
    if (!isV3(q.at) || !isV3(q.node)) e.push(`${at}: thiếu at hoặc node (3 số)`);
    if (q.orient !== undefined && !ORIENTS.includes(String(q.orient))) e.push(`${at}: orient không hợp lệ`);
    const lib = isStr(q.partId) ? getPart(q.partId) : undefined;
    if (!lib) e.push(`${at}: linh kiện "${String(q.partId)}" không có trong thư viện`);
  });

  // ----- Thứ tự lắp và đường nối
  const order = p.buildOrder;
  if (!Array.isArray(order) || order.length !== parts.length || [...order].sort((a, b) => a - b).some((v, i) => v !== i)) e.push('buildOrder phải là một hoán vị của 0 đến số bộ phận trừ 1');
  const links = Array.isArray(p.links) ? p.links : [];
  links.forEach((l, i) => {
    if (!Array.isArray(l) || l.length !== 2 || !partIds.has(String(l[0])) || !partIds.has(String(l[1]))) e.push(`links #${i + 1}: phải là cặp id bộ phận có trong bài`);
  });

  // ----- Đi dây
  const w = p.wiring;
  if (!isRec(w)) e.push('Thiếu wiring');
  else {
    const netIds = new Set<string>();
    const nets = Array.isArray(w.nets) ? w.nets : [];
    if (nets.length < 2) e.push('wiring cần ít nhất 2 mạch (nets)');
    nets.forEach((n, i) => {
      if (!isRec(n) || !isStr(n.id) || !isStr(n.name) || !isStr(n.done) || !isStr(n.color) || !COLOR.test(n.color)) return void e.push(`Mạch #${i + 1}: cần id, name, done, color #RRGGBB`);
      if (netIds.has(n.id)) e.push(`Mạch "${n.id}" bị trùng`);
      netIds.add(n.id);
    });
    const termIds = new Set<string>();
    const perNet = new Map<string, number>();
    const usedPins = new Set<string>();
    const terms = Array.isArray(w.terminals) ? w.terminals : [];
    terms.forEach((t, i) => {
      const at = `Chân #${i + 1}`;
      if (!isRec(t)) return void e.push(`${at}: không phải đối tượng`);
      if (!isStr(t.id)) e.push(`${at}: thiếu id`);
      else if (termIds.has(t.id)) e.push(`${at}: trùng id "${t.id}"`);
      else termIds.add(t.id);
      for (const k of ['label', 'desc']) if (!isStr(t[k])) e.push(`${at}: thiếu ${k}`);
      if (!isV3(t.pos) || !isNum(t.base)) e.push(`${at}: thiếu pos hoặc base`);
      if (!isStr(t.net) || !netIds.has(t.net)) e.push(`${at}: mạch "${String(t.net)}" không tồn tại`);
      else perNet.set(t.net, (perNet.get(t.net) ?? 0) + 1);
      if (!isStr(t.part) || !partIds.has(t.part)) e.push(`${at}: bộ phận "${String(t.part)}" không có trong bài`);
      else {
        const lib = parts.find((q) => isRec(q) && q.id === t.part) as Rec | undefined;
        if (lib && isStr(lib.partId) && !hasPin(lib.partId, String(t.pin))) e.push(`${at}: linh kiện "${lib.partId}" không có chân "${String(t.pin)}"`);
        else usedPins.add(`${String(t.part)}/${String(t.pin)}`);
      }
    });
    for (const id of netIds) if ((perNet.get(id) ?? 0) < 2) e.push(`Mạch "${id}" cần ít nhất 2 chân`);
    const rules = Array.isArray(w.rules) ? w.rules : [];
    rules.forEach((r, i) => {
      if (!isRec(r) || !Array.isArray(r.nets) || r.nets.length !== 2 || !isStr(r.message)) return void e.push(`Luật #${i + 1}: cần nets (2 mạch) và message`);
      for (const n of r.nets) if (n !== '*' && !netIds.has(String(n))) e.push(`Luật #${i + 1}: mạch "${String(n)}" không tồn tại`);
      if (r.terminals !== undefined && !(Array.isArray(r.terminals) && r.terminals.length === 2 && r.terminals.every((t) => termIds.has(String(t))))) e.push(`Luật #${i + 1}: terminals phải là cặp id chân có trong bài`);
    });
    for (const k of ['exercise', 'fallback', 'doneText']) if (!isStr(w[k])) e.push(`wiring thiếu ${k}`);
  }

  // ----- Bài tính
  const ex = Array.isArray(p.exercises) ? p.exercises : [];
  if (ex.length < 1) e.push('Cần ít nhất 1 bài tính (exercises)');
  ex.forEach((q, i) => {
    const at = `Bài tính #${i + 1}`;
    if (!isRec(q)) return void e.push(`${at}: không phải đối tượng`);
    for (const k of ['title', 'prompt', 'answer', 'placeholder', 'okText', 'failText']) if (!isStr(q[k])) e.push(`${at}: thiếu ${k}`);
    if (!isStr(q.focus) || !partIds.has(q.focus)) e.push(`${at}: focus "${String(q.focus)}" không phải bộ phận trong bài`);
    const tol = q.tolerance;
    if (!isRec(tol) || (!isNum(tol.rel) && !isNum(tol.abs))) e.push(`${at}: tolerance cần rel hoặc abs`);
    const scope: Record<string, number> = {};
    if (isRec(q.constants)) for (const [k, v] of Object.entries(q.constants)) {
        if (isNum(v)) scope[k] = v;
        else e.push(`${at}: hằng số "${k}" không phải số`);
      }
    const inputs = Array.isArray(q.inputs) ? q.inputs : [];
    if (inputs.length === 0) e.push(`${at}: cần ít nhất một đại lượng nhập (inputs)`);
    for (const inp of inputs) {
      if (!isRec(inp) || !isStr(inp.name) || !isStr(inp.label) || typeof inp.unit !== 'string' || ![inp.min, inp.max, inp.step, inp.default].every(isNum)) {
        e.push(`${at}: một đại lượng nhập thiếu name, label, unit, min, max, step hoặc default`);
        continue;
      }
      if ((inp.min as number) >= (inp.max as number) || (inp.default as number) < (inp.min as number) || (inp.default as number) > (inp.max as number)) e.push(`${at}: đại lượng "${inp.name}" có min, max, default không hợp lệ`);
      scope[inp.name as string] = inp.default as number;
    }
    if (isStr(q.answer)) {
      try {
        const lo = { ...scope };
        const hi = { ...scope };
        for (const inp of inputs) if (isRec(inp) && isStr(inp.name) && isNum(inp.min) && isNum(inp.max)) {
            lo[inp.name] = inp.min;
            hi[inp.name] = inp.max;
          }
        const a = evaluate(q.answer, scope);
        evaluate(q.answer, lo);
        evaluate(q.answer, hi);
        if (!(a > 0)) e.push(`${at}: đáp án với giá trị mặc định phải là số dương (ô nhập chỉ nhận số dương)`);
        scope.answer = a;
      } catch (err) {
        e.push(`${at}: công thức lỗi: ${(err as Error).message}`);
      }
    }
    for (const k of ['prompt', 'okText', 'failText']) {
      if (!isStr(q[k])) continue;
      for (const name of placeholders(q[k] as string)) if (!(name in scope)) e.push(`${at}: ${k} dùng {${name}} nhưng không có biến này`);
    }
  });

  // ----- Thử tự do
  if (!isRec(p.tune) || !TUNES.includes(String(p.tune.template))) e.push(`tune.template phải là một trong: ${TUNES.join(', ')}`);

  if (!isRec(p.texts) || !isStr(p.texts.buildDone) || !isStr(p.texts.buildDoneLabel)) e.push('Thiếu texts.buildDone hoặc texts.buildDoneLabel');

  return e;
}

/** Ép kiểu sau khi đã kiểm tra không có lỗi */
export function asPackage(input: unknown): LabPackage {
  const errs = validatePackage(input);
  if (errs.length) throw new Error(errs.join('\n'));
  return input as LabPackage;
}

/**
 * Bộ tính biểu thức an toàn cho bài tính do AI sinh: chỉ cho số, tên biến, + - * / ^, ngoặc và vài hàm.
 * Không dùng eval, biểu thức sai cú pháp hoặc dùng tên lạ sẽ báo lỗi.
 */

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

const FUNCS: Record<string, (...a: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
  sqrt: Math.sqrt,
  round: Math.round,
  pow: Math.pow,
};

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|([-+*/^(),]))/y;
  let pos = 0;
  while (pos < src.length) {
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) {
      if (/^\s*$/.test(src.slice(pos))) break;
      throw new Error(`Ký tự không hợp lệ ở vị trí ${pos}`);
    }
    if (m[1] !== undefined) out.push({ t: 'num', v: Number(m[1]) });
    else if (m[2] !== undefined) out.push({ t: 'id', v: m[2] });
    else out.push({ t: 'op', v: m[3] });
    pos = re.lastIndex;
  }
  return out;
}

export type Scope = Record<string, number>;

/** Tính giá trị biểu thức; ném lỗi nếu sai cú pháp, thiếu biến hoặc kết quả không hữu hạn. */
export function evaluate(src: string, scope: Scope): number {
  const toks = tokenize(src);
  let i = 0;
  const peek = () => toks[i];
  const eat = (v?: string) => {
    const t = toks[i];
    if (!t || (v !== undefined && !(t.t === 'op' && t.v === v))) throw new Error(`Thiếu "${v ?? 'biểu thức'}"`);
    i++;
    return t;
  };
  const isOp = (v: string) => {
    const t = peek();
    return !!t && t.t === 'op' && t.v === v;
  };

  const expr = (): number => {
    let x = term();
    while (isOp('+') || isOp('-')) x = eat().v === '+' ? x + term() : x - term();
    return x;
  };
  const term = (): number => {
    let x = unary();
    while (isOp('*') || isOp('/')) {
      const op = (eat() as { v: string }).v;
      const y = unary();
      x = op === '*' ? x * y : x / y;
    }
    return x;
  };
  const unary = (): number => {
    if (isOp('-')) {
      eat();
      return -unary();
    }
    return power();
  };
  const power = (): number => {
    const base = atom();
    if (isOp('^')) {
      eat();
      return Math.pow(base, unary());
    }
    return base;
  };
  const atom = (): number => {
    const t = peek();
    if (!t) throw new Error('Biểu thức bị thiếu vế');
    if (t.t === 'num') {
      i++;
      return t.v;
    }
    if (t.t === 'id') {
      i++;
      if (isOp('(')) {
        const fn = FUNCS[t.v];
        if (!fn) throw new Error(`Hàm "${t.v}" không được hỗ trợ`);
        eat('(');
        const args: number[] = [];
        if (!isOp(')')) {
          args.push(expr());
          while (isOp(',')) {
            eat(',');
            args.push(expr());
          }
        }
        eat(')');
        return fn(...args);
      }
      if (!(t.v in scope)) throw new Error(`Chưa có biến "${t.v}"`);
      return scope[t.v];
    }
    if (isOp('(')) {
      eat('(');
      const x = expr();
      eat(')');
      return x;
    }
    throw new Error(`Không hiểu "${t.v}"`);
  };

  const v = expr();
  if (i < toks.length) throw new Error('Còn thừa phần cuối biểu thức');
  if (!Number.isFinite(v)) throw new Error('Kết quả không hữu hạn (chia cho 0?)');
  return v;
}

/** Chèn `{tên}` hoặc `{tên:n}` (n chữ số thập phân) từ scope vào chuỗi; tên thiếu giữ nguyên để dễ thấy lỗi. */
export function fill(text: string, scope: Scope): string {
  return text.replace(/\{([A-Za-z_][A-Za-z0-9_]*)(?::(\d))?\}/g, (m, name: string, digits?: string) => {
    if (!(name in scope)) return m;
    const v = scope[name];
    return digits !== undefined ? v.toFixed(Number(digits)) : String(Math.round(v * 1e6) / 1e6);
  });
}

/** Danh sách tên `{tên}` dùng trong chuỗi, để kiểm tra trước khi hiển thị */
export function placeholders(text: string): string[] {
  return [...text.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)(?::\d)?\}/g)].map((m) => m[1]);
}

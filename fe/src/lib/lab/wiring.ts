/**
 * Bộ máy đi dây dùng chung cho các bài thí nghiệm: mỗi bài khai báo chân, các mạch cần nối và lý do khi nối sai.
 * Hàm thuần, không phụ thuộc giao diện; trợ lý AI chỉ đọc kết quả.
 */

export interface Terminal {
  id: string;
  /** Id bộ phận trong bài */
  part: string;
  /** Tên bộ phận hiển thị trong danh sách chân */
  partName: string;
  label: string;
  /** Chân này làm gì: đủ để người học suy ra nối với đâu */
  desc: string;
  /** Mạch (net) mà chân này thuộc về */
  net: string;
  /** Vị trí chấm trong cảnh (do từng bài quy ước), nếu cố định */
  pos?: [number, number, number];
  /** Độ cao thân linh kiện tại chân này, để vẽ cọc nối xuống */
  base?: number;
}

/** Mỗi mạch là một nhóm chân phải nối chung với nhau. */
export interface NetDef {
  id: string;
  /** Tên mạch, không lộ cặp chân cụ thể */
  name: string;
  color: string;
  /** Giải thích khi đã nối đúng */
  done: string;
}

export interface Wire {
  a: string;
  b: string;
}

export type WireCheck = { ok: true } | { ok: false; reason: string };

export interface WiringDef {
  /** Tên bài tập, gửi cho trợ lý AI */
  exercise: string;
  nets: NetDef[];
  terminals: Terminal[];
  /** Cặp chân đã thông sẵn bên trong linh kiện (ví dụ hai đầu nối của một servo) */
  internal?: [string, string][];
  /** Lý do khi nối hai chân thuộc hai mạch khác nhau */
  mismatch: (a: Terminal, b: Terminal) => string;
  /** Lý do khi nối hai chân đã thông sẵn với nhau */
  redundant?: string;
}

export interface NetProgress {
  net: NetDef;
  /** Số chân đã nối thông */
  connected: number;
  total: number;
  complete: boolean;
}

export interface WiringStatus {
  complete: boolean;
  badWires: number;
  /** Số mạch đã nối đủ */
  netsDone: number;
  netsTotal: number;
  progress: NetProgress[];
}

export function createWiring(def: WiringDef) {
  const byId = new Map(def.terminals.map((t) => [t.id, t]));
  const internal = def.internal ?? [];
  const isInternal = (a: string, b: string) => internal.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const terminalById = (id: string) => byId.get(id);
  const members = (net: string) => def.terminals.filter((t) => t.net === net);

  /** Một dây đúng khi hai đầu thuộc cùng một mạch; sai thì kèm lý do dễ hiểu. */
  const checkWire = (w: Wire): WireCheck => {
    const a = byId.get(w.a);
    const b = byId.get(w.b);
    if (!a || !b) return { ok: false, reason: 'Dây nối tới chân không tồn tại.' };
    if (a.net !== b.net) return { ok: false, reason: def.mismatch(a, b) };
    if (isInternal(a.id, b.id)) return { ok: false, reason: def.redundant ?? 'Hai chân này đã thông sẵn với nhau bên trong linh kiện, nối thêm dây là vô ích.' };
    return { ok: true };
  };

  /** Số chân của mỗi mạch đã được nối thông bằng các dây đúng. */
  const netProgress = (wires: Wire[]): NetProgress[] => {
    const good = wires.filter((w) => checkWire(w).ok);
    return def.nets.map((net) => {
      const list = members(net.id);
      const parent = new Map<string, string>(list.map((t) => [t.id, t.id]));
      const find = (x: string): string => {
        let r = x;
        while (parent.get(r) !== r) r = parent.get(r)!;
        return r;
      };
      const join = (x: string, y: string) => {
        if (parent.has(x) && parent.has(y)) parent.set(find(x), find(y));
      };
      for (const [x, y] of internal) join(x, y);
      let used = false;
      for (const w of good) {
        if (byId.get(w.a)?.net !== net.id) continue;
        used = true;
        join(w.a, w.b);
      }
      const sizes = new Map<string, number>();
      for (const t of list) sizes.set(find(t.id), (sizes.get(find(t.id)) ?? 0) + 1);
      const connected = used ? Math.max(...sizes.values()) : 0;
      return { net, connected, total: list.length, complete: connected === list.length };
    });
  };

  /** Mạch hoàn chỉnh khi mọi mạch nối đủ chân và không còn dây sai. */
  const status = (wires: Wire[]): WiringStatus => {
    const progress = netProgress(wires);
    const badWires = wires.filter((w) => !checkWire(w).ok).length;
    const netsDone = progress.filter((p) => p.complete).length;
    return { complete: badWires === 0 && netsDone === def.nets.length, badWires, netsDone, netsTotal: def.nets.length, progress };
  };

  /** Thêm dây: bỏ qua dây trùng (kể cả đảo đầu) và dây nối một chân với chính nó. */
  const addWire = (wires: Wire[], a: string, b: string): { wires: Wire[]; note: string | null } => {
    if (a === b) return { wires, note: null };
    if (wires.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a))) return { wires, note: 'Hai chân này đã có dây nối rồi.' };
    return { wires: [...wires, { a, b }], note: null };
  };

  /** Gợi ý một mạch chưa nối xong: nêu tên mạch và các bộ phận liên quan, không nêu thẳng cặp chân. */
  const nextHint = (wires: Wire[]): string => {
    const st = status(wires);
    if (st.badWires > 0) return 'Trong danh sách dây có dây sai (màu đỏ). Hãy gỡ dây sai trước rồi đọc lý do bên dưới nó.';
    const todo = st.progress.find((p) => !p.complete);
    if (!todo) return 'Mạch đã đủ.';
    const parts = Array.from(new Set(members(todo.net.id).map((t) => t.partName)));
    return `Mạch "${todo.net.name}" chưa nối đủ (${todo.connected}/${todo.total} chân). Nó đi qua: ${parts.join(', ')}. Đọc mô tả của từng chân để biết chân nào cùng mạch.`;
  };

  const labelOf = (id: string) => {
    const t = byId.get(id);
    return t ? `${t.partName} · ${t.label}` : id;
  };

  /** Trạng thái dây gửi cho trợ lý AI: chỉ tên, không lộ đáp án. */
  const state = (wires: Wire[]): Record<string, unknown> => {
    const st = status(wires);
    return {
      exercise: def.exercise,
      wires_made: wires.map((w) => {
        const c = checkWire(w);
        return { from: labelOf(w.a), to: labelOf(w.b), correct: c.ok, ...(c.ok ? {} : { why_wrong: c.reason }) };
      }),
      nets_done: st.progress.filter((p) => p.complete).map((p) => p.net.name),
      nets_missing: st.progress.filter((p) => !p.complete).map((p) => ({ net: p.net.name, connected: p.connected, total: p.total })),
      complete: st.complete,
    };
  };

  return { def, terminals: def.terminals, nets: def.nets, terminalById, checkWire, netProgress, status, addWire, nextHint, labelOf, state };
}

export type WiringApi = ReturnType<typeof createWiring>;

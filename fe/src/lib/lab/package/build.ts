/** Từ gói bài thực hành suy ra các cấu trúc mà khung hiện có dùng (bộ phận, bộ máy đi dây, bài tính). */
import type { AsmPart } from '@/components/lab/shared/assembly';
import { createWiring, type NetDef, type Terminal } from '../wiring';
import { getPart, pinPlacement } from '../parts';
import { evaluate, fill } from './expr';
import type { LabPackage, PkgExercise, PkgTerminal } from './types';

export const toAsmParts = (pkg: LabPackage): AsmPart[] =>
  pkg.parts.map(({ id, name, role, color, goal, hint, facts, details }) => ({ id, name, role, color, goal, hint, facts, details }));

/** Vị trí chấm của một chân đấu dây: khai báo tường minh trong bài, hoặc tính từ chân trong thư viện và vị trí đặt bộ phận. */
export function terminalPlacement(pkg: LabPackage, t: PkgTerminal): { pos: [number, number, number]; base: number } {
  if (t.pos && t.base !== undefined) return { pos: t.pos, base: t.base };
  const part = pkg.parts.find((p) => p.id === t.part);
  const pin = part && getPart(part.partId)?.pins.find((q) => q.id === t.pin);
  if (!part || !pin) throw new Error(`Không tính được vị trí chân "${t.id}"`);
  return pinPlacement(part.at, part.yaw, pin);
}

export function buildWiring(pkg: LabPackage) {
  const w = pkg.wiring;
  const nets: NetDef[] = w.nets.map(({ id, name, color, done }) => ({ id, name, color, done }));
  const nameOf = (id: string) => pkg.parts.find((p) => p.id === id)?.name ?? id;
  const terminals: Terminal[] = w.terminals.map((t) => {
    const { pos, base } = terminalPlacement(pkg, t);
    return { id: t.id, part: t.part, partName: nameOf(t.part), label: t.label, desc: t.desc, net: t.net, pos, base };
  });
  const mismatch = (a: Terminal, b: Terminal): string => {
    for (const r of w.rules) {
      const [x, y] = r.nets;
      const netsOk = (a.net === x || x === '*') && (b.net === y || y === '*') ? true : (a.net === y || y === '*') && (b.net === x || x === '*');
      if (!netsOk) continue;
      if (r.terminals) {
        const [p, q] = r.terminals;
        if (!((a.id === p && b.id === q) || (a.id === q && b.id === p))) continue;
      }
      return r.message;
    }
    return w.fallback;
  };
  return createWiring({ exercise: w.exercise, nets, terminals, mismatch });
}

export interface ExerciseCheck {
  ok: boolean;
  text: string;
}

/** Đáp án của bài tính với các giá trị đang chọn (mã tính, không phải AI). */
export function exerciseAnswer(ex: PkgExercise, values: Record<string, number>): number {
  return evaluate(ex.answer, { ...ex.constants, ...values });
}

export function checkExercise(ex: PkgExercise, values: Record<string, number>, guess: number): ExerciseCheck {
  const scope = { ...ex.constants, ...values };
  const expected = evaluate(ex.answer, scope);
  const tol = ex.tolerance;
  const ok = tol.abs !== undefined ? Math.abs(guess - expected) <= tol.abs : Math.abs(guess - expected) / expected <= (tol.rel ?? 0.1);
  return { ok, text: fill(ok ? ex.okText : ex.failText, { ...scope, answer: expected }) };
}

export const exerciseDefaults = (ex: PkgExercise): Record<string, number> => Object.fromEntries(ex.inputs.map((i) => [i.name, i.default]));

/** Mô tả bài tính cho trợ lý AI: chỉ đề bài và giá trị cho trước, không có đáp án */
export function exerciseState(ex: PkgExercise, values: Record<string, number>): Record<string, unknown> {
  return { exercise: ex.title, given_values: { ...ex.constants, ...values } };
}

/** Kích thước và thư viện của một bộ phận trong bài */
export const libraryOf = (partId: string) => getPart(partId);

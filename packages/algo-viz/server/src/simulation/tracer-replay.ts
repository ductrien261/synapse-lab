// Commander uses null for commands that are not associated with a tracer instance.
// tslint:disable:no-null-keyword
import { ArrayPanel, SimulationStep, SimulationTrace } from './types';
import { MAX_TRACE_BYTES, MAX_TRACE_STEPS } from './limits';
export interface TraceCommand { key: string | null; method: string; args: any[]; }
interface Panel extends ArrayPanel { chart?: string; selected: Set<string>; patched: Set<string>; }
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function replayCommands(commands: TraceCommand[], source: string): SimulationTrace {
  const panels = new Map<string, Panel>();
  const logs = new Map<string, string>();
  const layouts = new Set<string>();
  const steps: SimulationStep[] = [];
  let message = '';
  let lastLine = 1;
  let traceBytes = Buffer.byteLength(source);
  let variables: { [key: string]: number } = {};
  const snapshot = (line: number, captured?: { [key: string]: number }) => {
    if (captured) variables = captured;
    const visible = Array.from(panels.values()).filter(panel => panel.cells.length);
    if (!visible.length) return;
    if (steps.length >= MAX_TRACE_STEPS) throw new Error('Trace step limit exceeded.');
    lastLine = Math.max(1, Math.min(line || lastLine, source.split('\n').length));
    const step: SimulationStep = {
      panels: visible.map(panel => ({ id: panel.id, title: panel.title, kind: panel.kind, cells: panel.cells.map((row, x) => row.map((cell, y) => ({ value: cell.value, tone: panel.patched.has(`${x},${y}`) ? 'active' : panel.selected.has(`${x},${y}`) ? 'selected' : 'idle' }))) })),
      message: message || 'Initial state', codeLine: lastLine, action: { label: 'State update', tone: 'active' },
      metrics: [{ label: 'Step', value: String(steps.length + 1) }],
      context: { title: 'Visualization trace', values: visible.map(panel => ({ label: panel.title, value: panel.cells.map(row => row.map(cell => cell.value).join(', ')).join('\n') })).concat(Object.keys(variables).filter(key => typeof variables[key] === 'number').map(key => ({ label: key, value: String(variables[key]) }))) },
    };
    traceBytes += Buffer.byteLength(JSON.stringify(step));
    if (traceBytes > MAX_TRACE_BYTES) throw new Error('Trace size limit exceeded.');
    steps.push(step);
  };
  for (const command of commands) {
    const { key, method, args } = command;
    if (method === 'delay') { snapshot(Number(args[0]), args[1]); continue; }
    if (key === null) {
      if (method !== 'setRoot') throw new Error(`Unsupported layout command: ${method}`);
      continue;
    }
    if (['Array2DTracer', 'Array1DTracer', 'ChartTracer'].indexOf(method) !== -1) {
      panels.set(key, { id: key, title: args[0] || (method === 'Array2DTracer' ? 'Board / matrix' : method === 'ChartTracer' ? 'Chart' : 'Array'), kind: method === 'Array2DTracer' ? 'matrix' : method === 'ChartTracer' ? 'chart' : 'array', cells: [], selected: new Set(), patched: new Set() }); continue;
    }
    if (method === 'LogTracer') { logs.set(key, ''); continue; }
    if (method === 'VerticalLayout' || method === 'HorizontalLayout') { layouts.add(key); continue; }
    if (layouts.has(key)) {
      if (['add', 'remove', 'removeAll', 'destroy'].indexOf(method) === -1) throw new Error(`Unsupported layout command: ${method}`);
      continue;
    }
    if (logs.has(key)) {
      if (method === 'println' || method === 'print' || method === 'set') { message = String(args[0] || ''); logs.set(key, message); }
      else if (method !== 'reset' && method !== 'destroy') throw new Error(`Unsupported log command: ${method}`);
      continue;
    }
    const panel = panels.get(key);
    if (!panel) throw new Error(`Unsupported tracer: ${method}`);
    if (method === 'destroy') { panels.delete(key); continue; }
    if (method === 'reset') { panel.cells = []; panel.selected.clear(); panel.patched.clear(); continue; }
    if (method === 'chart') { panel.chart = args[0]; const chart = panels.get(args[0]); if (chart) chart.cells = clone(panel.cells); continue; }
    const targets = panel.chart && panels.has(panel.chart) ? [panel, panels.get(panel.chart)!] : [panel];
    if (method === 'set') {
      const rows = panel.kind === 'matrix' ? args[0] : [args[0]];
      if (!Array.isArray(rows) || rows.length > 20 || rows.some(row => !Array.isArray(row) || row.length > 100)) throw new Error('Invalid or oversized array.');
      targets.forEach(target => { target.cells = rows.map((row: any[]) => row.map(value => ({ value: String(value), tone: 'idle' }))); target.selected.clear(); target.patched.clear(); }); continue;
    }
    const x = panel.kind === 'matrix' ? Number(args[0]) : 0;
    const y = panel.kind === 'matrix' ? Number(args[1]) : Number(args[0]);
    const valueIndex = panel.kind === 'matrix' ? 2 : 1;
    if (method === 'patch' || method === 'depatch') {
      targets.forEach(target => {
        if (!target.cells[x] || !target.cells[x][y]) return;
        if (method === 'patch') { target.patched.add(`${x},${y}`); if (args.length > valueIndex && args[valueIndex] !== null && args[valueIndex] !== undefined) target.cells[x][y].value = String(args[valueIndex]); }
        else target.patched.delete(`${x},${y}`);
      }); continue;
    }
    if (['select', 'deselect', 'selectRow', 'deselectRow', 'selectCol', 'deselectCol'].indexOf(method) !== -1) {
      let sx = x, sy = y;
      let ex = panel.kind === 'matrix' ? Number(args[2] === undefined ? x : args[2]) : 0;
      let ey = Number(args[panel.kind === 'matrix' ? 3 : 1] === undefined ? y : args[panel.kind === 'matrix' ? 3 : 1]);
      if (method.endsWith('Row')) { ex = sx; ey = Number(args[2]); }
      if (method.endsWith('Col')) { sy = Number(args[0]); sx = Number(args[1]); ex = Number(args[2]); ey = sy; }
      targets.forEach(target => target.cells.forEach((row, r) => row.forEach((_, c) => { if (r >= sx && r <= ex && c >= sy && c <= ey) { if (method.startsWith('deselect')) target.selected.delete(`${r},${c}`); else target.selected.add(`${r},${c}`); } }))); continue;
    }
    throw new Error(`Unsupported array command: ${method}`);
  }
  snapshot(lastLine);
  if (!steps.length) throw new Error('No supported visualization states were emitted.');
  steps[steps.length - 1].action = { label: 'Finished', tone: 'complete' };
  return { renderer: 'matrix', code: { language: 'javascript', source }, steps, summary: message || 'Program finished.' };
}

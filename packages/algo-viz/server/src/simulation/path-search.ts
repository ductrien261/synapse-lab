import fs from 'fs';
import path from 'path';
import { algorithmsDir } from 'config/paths';
import { graphState, markedLines, SimulationStep, SimulationTrace, Tone } from './types';
import { MAX_TRACE_STEPS, MAX_SOURCE_BYTES } from './limits';

export interface PathSearchDefinition {
  sourceFile: string;
  start: number;
  closed: boolean;
  deduplicateReverse?: boolean;
  targetLength?: number;
  minimumLength: number;
  resultLabel: string;
  markers: { [event: string]: string };
  teaching: { [event: string]: { text: string; next: string; pause?: boolean } };
}
const actions: { [key: string]: [string, Tone] } = {
  start: ['Bắt đầu', 'idle'], try: ['Đang thử', 'active'], reject: ['Bỏ ứng viên', 'rejected'],
  choose: ['Chọn đỉnh', 'selected'], recurse: ['Đi sâu', 'selected'], exhausted: ['Trở về', 'idle'],
  backtrack: ['Quay lui', 'active'], solution: ['Có lời giải', 'complete'], done: ['Hoàn tất', 'idle'],
};

// Enumerate simple paths using declared constraints, independently of lesson names.
export function createPathSearch(definition: PathSearchDefinition): (matrix: number[][]) => SimulationTrace {
  return adjacency => {
    const n = adjacency.length;
    const target = definition.targetLength === undefined ? n : definition.targetLength;
    if (n < 2 || n > 6 || adjacency.some(row => row.length !== n || row.some(value => value !== 0 && value !== 1)) || !Number.isInteger(definition.start) || definition.start < 0 || definition.start >= n || !Number.isInteger(target) || target < 2 || target > n) throw new Error('Invalid path-search input.');
    const file = fs.realpathSync(path.resolve(algorithmsDir, definition.sourceFile));
    if (!file.startsWith(fs.realpathSync(algorithmsDir) + path.sep)) throw new Error('Path-search source must be a catalog file.');
    if (fs.statSync(file).size > MAX_SOURCE_BYTES) throw new Error('Path-search source exceeded its size limit.');
    const source = fs.readFileSync(file, 'utf8');
    const markers = markedLines(source);
    const steps: SimulationStep[] = [];
    const solutions: number[][] = [];
    const route = [definition.start];
    const record = (state: string, position: number, candidate: number | undefined, reason?: string) => {
      if (steps.length >= MAX_TRACE_STEPS) throw new Error('Trace step limit exceeded.');
      const eventKey = reason ? `${state}.${reason}` : state;
      const teaching = definition.teaching[eventKey];
      const codeLine = markers[definition.markers[eventKey]];
      if (!teaching || !codeLine) throw new Error(`Missing path-search presentation for ${eventKey}.`);
      const shownRoute = state === 'solution' && definition.closed ? [...route, definition.start] : [...route];
      const values: { [key: string]: string } = {
        start: String(definition.start), n: String(n), k: String(position), candidate: String(candidate),
        from: String(route[route.length - 1]), route: shownRoute.join(' → '), found: String(solutions.length), result: definition.resultLabel,
      };
      const fill = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        if (values[key] === undefined) throw new Error(`Unknown teaching variable ${key}.`);
        return values[key];
      });
      const graph = graphState(adjacency);
      graph.nodes.forEach(node => { if (route.indexOf(node.id) !== -1) node.tone = 'selected'; if (node.id === candidate) node.tone = state === 'reject' ? 'rejected' : 'active'; });
      graph.edges.forEach(edge => {
        if (shownRoute.some((v, index) => index > 0 && ((shownRoute[index - 1] === edge.from && v === edge.to) || (shownRoute[index - 1] === edge.to && v === edge.from)))) edge.tone = state === 'solution' ? 'complete' : 'selected';
      });
      const from = route[route.length - 1];
      if (candidate !== undefined && from !== candidate && (state === 'try' || state === 'reject')) graph.edges.push({ from, to: candidate, tone: state === 'reject' ? 'rejected' : 'active', dashed: true });
      const [label, tone] = actions[state];
      const message = fill(teaching.text), next = fill(teaching.next);
      steps.push({
        graph, message, codeLine, action: { label, tone },
        narration: { text: message + (teaching.pause ? ' ' + next : ''), conclusion: message, next, pause: !!teaching.pause },
        context: { title: state === 'start' || state === 'done' ? 'Khởi tạo / kết thúc' : 'Tìm đường', values: [{ label: 'Đường đi', value: values.route }, { label: 'Vị trí k', value: values.k }, { label: 'Đỉnh đang thử', value: candidate === undefined ? '—' : values.candidate }] },
        metrics: [{ label: 'Đường đi', value: values.route }, { label: 'Đã tìm thấy', value: `${solutions.length} ${definition.resultLabel}` }],
      });
    };
    const search = (position: number) => {
      for (let candidate = 0; candidate < n; candidate++) {
        record('try', position, candidate);
        if (!adjacency[route[route.length - 1]][candidate]) { record('reject', position, candidate, 'edge'); continue; }
        if (route.indexOf(candidate) !== -1) { record('reject', position, candidate, 'duplicate'); continue; }
        if (definition.closed && position === target - 1 && !adjacency[candidate][definition.start]) { record('reject', position, candidate, 'close'); continue; }
        route.push(candidate);
        record('choose', position, candidate);
        if (route.length === target) {
          if (definition.closed && definition.deduplicateReverse && route[1] > route[route.length - 1]) {
            record('reject', position, candidate, 'reverse');
          } else {
            solutions.push(definition.closed ? [...route, definition.start] : [...route]);
            record('solution', position, definition.closed ? definition.start : candidate);
          }
        } else { record('recurse', position, candidate); search(position + 1); }
        route.pop();
        record('backtrack', position, candidate);
      }
      record('exhausted', position, undefined);
    };
    record('start', 1, undefined);
    if (target >= definition.minimumLength) search(1);
    record('done', 1, undefined);
    return { renderer: 'graph', code: { language: 'cpp', source }, steps, summary: solutions.length ? solutions.map(solution => solution.join(' → ')).join(' | ') : `Không tìm thấy ${definition.resultLabel}.` };
  };
}

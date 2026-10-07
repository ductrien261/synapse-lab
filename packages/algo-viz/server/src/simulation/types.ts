export type Tone = 'idle' | 'selected' | 'active' | 'rejected' | 'complete';
export interface GraphState {
  nodes: { id: number; label: string; tone: Tone }[];
  edges: { from: number; to: number; tone: Tone; dashed?: boolean }[];
}
export interface ArrayPanel {
  id: string;
  title: string;
  kind: 'matrix' | 'array' | 'chart';
  cells: { value: string; tone: Tone }[][];
}
export interface SimulationStep {
  narration?: { text?: string; goal?: string; reason?: string; calculation?: string; conclusion: string; next: string; pause: boolean };
  message: string;
  action: { label: string; tone: Tone };
  codeLine: number;
  context: { title: string; values: { label: string; value: string }[] };
  metrics: { label: string; value: string }[];
  graph?: GraphState;
  panels?: ArrayPanel[];
}
export interface SimulationTrace {
  renderer: 'graph' | 'matrix';
  code: { language: 'cpp' | 'typescript' | 'javascript'; source: string; visibleLines?: number[]; description?: string };
  steps: SimulationStep[];
  summary: string;
}
export interface SimulationConfig {
  renderer: 'graph' | 'matrix';
  title: string;
  samples: { key: string; label: string }[];
  customInput?: { kind: 'undirected-graph'; minVertices: number; maxVertices: number };
}
export function graphState(adjacency: number[][]): GraphState {
  return {
    nodes: adjacency.map((_, id) => ({ id, label: String(id), tone: 'idle' as Tone })),
    edges: adjacency.reduce<GraphState['edges']>((edges, row, from) => edges.concat(row.reduce<GraphState['edges']>((result, value, to) => value && from < to ? result.concat({ from, to, tone: 'idle' }) : result, [])), []),
  };
}
export function markedLines(source: string): { [key: string]: number } {
  const lines: { [key: string]: number } = {};
  source.split('\n').forEach((line, index) => { const marker = line.match(/@([a-z]+)/); if (marker) lines[marker[1]] = index + 1; });
  return lines;
}

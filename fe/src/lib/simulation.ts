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
export interface SimulationFrame { step: SimulationStep; code: SimulationTrace['code'] }

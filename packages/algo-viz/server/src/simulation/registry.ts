import { SimulationConfig, SimulationTrace } from './types';
import { createPathSearch, PathSearchDefinition } from './path-search';
import pathDefinitions from './path-definitions.json';
import { runBfs } from './bfs';

interface Runner { config: SimulationConfig; samples: { [key: string]: number[][] }; run: (matrix: number[][]) => SimulationTrace; }
const cycle = [[0, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 0], [0, 0, 1, 0, 1], [1, 0, 0, 1, 0]];
const chain = [[0, 1, 0, 0], [1, 0, 1, 0], [0, 1, 0, 1], [0, 0, 1, 0]];
const customInput: SimulationConfig['customInput'] = { kind: 'undirected-graph', minVertices: 2, maxVertices: 6 };
const runners: { [key: string]: Runner } = {
  'brute-force/breadth-first-search': { config: { renderer: 'graph', title: 'Mô phỏng duyệt theo chiều rộng (BFS)', samples: [{ key: 'cycle', label: 'Đồ thị 5 đỉnh' }, { key: 'chain', label: 'Chuỗi 4 đỉnh' }, { key: 'disconnected', label: 'Đồ thị không liên thông' }], customInput }, samples: { cycle, chain, disconnected: [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]] }, run: runBfs },
};
const definitions = pathDefinitions as { [key: string]: { config: SimulationConfig; samples: { [key: string]: number[][] }; search: PathSearchDefinition } };
Object.keys(definitions).forEach(key => {
  const definition = definitions[key];
  runners[key] = { config: definition.config, samples: definition.samples, run: createPathSearch(definition.search) };
});
export function getRunner(algorithmPath: string): Runner | undefined { return runners[algorithmPath]; }
export function getInput(runner: Runner, sample: unknown, adjacency: unknown): number[][] {
  if (sample !== 'custom') {
    if (typeof sample !== 'string' || !Object.prototype.hasOwnProperty.call(runner.samples, sample)) throw new Error('Unknown graph sample.');
    return runner.samples[sample].map(row => [...row]);
  }
  let matrix: unknown;
  try { matrix = JSON.parse(typeof adjacency === 'string' ? adjacency : 'null'); } catch { throw new Error('Invalid adjacency matrix.'); }
  const limits = runner.config.customInput;
  if (!limits) throw new Error('Custom input is not supported.');
  if (!Array.isArray(matrix)) throw new Error('Invalid adjacency matrix.');
  const size = matrix.length;
  if (size < limits.minVertices || size > limits.maxVertices || matrix.some(row => !Array.isArray(row) || row.length !== size || row.some(value => value !== 0 && value !== 1))) throw new Error('Use a square 0/1 matrix with 2–6 vertices.');
  const input = matrix as number[][];
  if (input.some((row, i) => row[i] !== 0 || row.some((value, j) => value !== input[j][i]))) throw new Error('Use an undirected graph without self-loops.');
  return input;
}

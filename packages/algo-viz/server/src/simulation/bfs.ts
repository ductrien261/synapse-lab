import fs from 'fs';
import path from 'path';
import { algorithmsDir } from 'config/paths';
import { graphState, markedLines, SimulationTrace, SimulationStep } from './types';

interface BfsEvent {
  key: string; current: number | null; candidate: number | null;
  queue: number[]; order: number[]; distances: number[]; parents: number[];
}
export function runBfs(adjacency: number[][]): SimulationTrace {
  const file = path.join(algorithmsDir, 'Brute Force', 'Breadth-First Search', 'Code.ts');
  const { breadthFirstSearch } = require(file) as { breadthFirstSearch: (matrix: number[][], start: number, onStep: (event: BfsEvent) => void) => { order: number[]; distances: number[] } };
  const source = fs.readFileSync(file, 'utf8');
  const lines = markedLines(source);
  const steps: SimulationStep[] = [];
  const result = breadthFirstSearch(adjacency, 0, event => {
    const graph = graphState(adjacency);
    graph.nodes.forEach(node => { node.tone = event.distances[node.id] >= 0 ? 'selected' : 'idle'; if (node.id === event.current) node.tone = 'active'; });
    graph.edges.forEach(edge => { if (event.parents[edge.from] === edge.to || event.parents[edge.to] === edge.from) edge.tone = 'selected'; });
    const messages: { [key: string]: string } = {
      start: 'Bắt đầu tại đỉnh 0, đánh dấu đã thăm và đưa vào hàng đợi.',
      dequeue: `Lấy đỉnh ${event.current} khỏi đầu hàng đợi để xét các đỉnh kề.`,
      scan: `Kiểm tra đỉnh ${event.candidate} kề với đỉnh ${event.current}.`,
      skip: `Đỉnh ${event.candidate} đã được phát hiện nên không đưa vào hàng đợi lần nữa.`,
      discover: `Phát hiện đỉnh ${event.candidate}, lưu khoảng cách và thêm vào cuối hàng đợi.`,
      done: 'Hàng đợi đã rỗng. Hoàn thành duyệt các đỉnh có thể đi tới từ đỉnh 0.',
    };
    if (event.candidate !== null) {
      graph.nodes[event.candidate].tone = event.key === 'skip' ? 'rejected' : 'active';
      graph.edges.push({ from: event.current!, to: event.candidate, tone: event.key === 'skip' ? 'rejected' : 'active', dashed: true });
    }
    steps.push({
      graph, codeLine: lines[event.key], message: messages[event.key],
      action: { label: event.key === 'done' ? 'Hoàn tất' : event.key === 'discover' ? 'Phát hiện đỉnh' : event.key === 'skip' ? 'Đã thăm' : 'Đang xét', tone: event.key === 'done' ? 'complete' : event.key === 'skip' ? 'rejected' : 'active' },
      context: { title: 'BFS', values: [{ label: 'Đỉnh đang xét', value: event.current === null ? '—' : String(event.current) }, { label: 'Hàng đợi', value: event.queue.join(' → ') || 'Rỗng' }, { label: 'Khoảng cách từ 0', value: event.distances.map((distance, id) => `${id}: ${distance < 0 ? '∞' : distance}`).join(', ') }] },
      metrics: [{ label: 'Thứ tự duyệt', value: event.order.join(' → ') || '—' }, { label: 'Hàng đợi', value: event.queue.join(' → ') || 'Rỗng' }],
    });
  });
  return { renderer: 'graph', code: { language: 'typescript', source }, steps, summary: `Thứ tự BFS từ 0: ${result.order.join(' → ')}. Đã duyệt ${result.order.length}/${adjacency.length} đỉnh.` };
}

// Tests include absent values from the public transport contract.
// tslint:disable:no-null-keyword
import assert from 'assert';
import path from 'path';
import { algorithmsDir } from 'config/paths';
import { getInput, getRunner } from './registry';
import { SimulationTrace } from './types';

function validateTrace(trace: SimulationTrace, size: number) {
  assert(trace.steps.length > 0);
  const sourceLines = trace.code.source.split('\n');
  trace.steps.forEach(step => {
    assert(Number.isInteger(step.codeLine) && step.codeLine >= 1 && step.codeLine <= sourceLines.length, 'Every step highlights an actual source line.');
    if (trace.code.visibleLines) assert(trace.code.visibleLines.indexOf(step.codeLine) !== -1, 'Active source lines must remain visible.');
    assert.strictEqual(step.graph!.nodes.length, size);
    step.graph!.edges.forEach(edge => { assert(edge.from >= 0 && edge.from < size); assert(edge.to >= 0 && edge.to < size); });
    assert(step.message && step.context.title && step.action.label);
  });
}
const hamilton = getRunner('backtracking/hamiltonean-cycles')!;
const bfs = getRunner('brute-force/breadth-first-search')!;
assert.strictEqual(getRunner('unknown/algorithm'), undefined);
for (const runner of [hamilton, bfs]) {
  for (const sample of runner.config.samples) {
    const input = getInput(runner, sample.key, undefined);
    const before = JSON.stringify(input);
    validateTrace(runner.run(input), input.length);
    assert.strictEqual(JSON.stringify(input), before, 'Runners must not mutate input.');
  }
  for (const invalid of [null, [], [[0]], [[0, 1], [0, 0]], [[1, 1], [1, 0]], [[0, 2], [2, 0]], [[0, 1, 0], [1, 0]]]) assert.throws(() => getInput(runner, 'custom', JSON.stringify(invalid)));
  assert.throws(() => getInput(runner, 'custom', '{broken'));
  assert.throws(() => getInput(runner, '__proto__', undefined));
  const custom = getInput(runner, 'custom', JSON.stringify([[0, 1], [1, 0]]));
  validateTrace(runner.run(custom), 2);
}
const cycleTrace = hamilton.run(getInput(hamilton, 'cycle', undefined));
assert(cycleTrace.steps.every(step => step.narration && step.narration.text && step.narration.next), 'Every path-search event has teaching data.');
const missingEdge = cycleTrace.steps.find(step => step.action.tone === 'rejected' && step.message.includes('không có cạnh'))!;
assert(missingEdge.narration!.conclusion.includes('Chưa kết luận'), 'A rejected candidate must not be described as global failure.');
const afterCycle = cycleTrace.steps.find(step => step.action.label === 'Quay lui' && step.metrics[1].value !== '0 chu trình')!;
assert(afterCycle.narration!.text!.includes('Đã xét xong nhánh'), 'Backtracking after success continues enumeration.');
assert.strictEqual(cycleTrace.steps.filter(step => step.action.tone === 'complete').length, 1);
assert.strictEqual(hamilton.run(getInput(hamilton, 'none', undefined)).steps.filter(step => step.action.tone === 'complete').length, 0);
assert.strictEqual(cycleTrace.steps[0].metrics[1].value, '0 chu trình');
assert.strictEqual(cycleTrace.steps[cycleTrace.steps.length - 1].metrics[1].value, '1 chu trình');

const { breadthFirstSearch } = require(path.join(algorithmsDir, 'Brute Force', 'Breadth-First Search', 'Code.ts'));
const connected = breadthFirstSearch(getInput(bfs, 'cycle', undefined));
assert.deepStrictEqual(connected.order, [0, 1, 2, 4, 3]);
assert.deepStrictEqual(connected.distances, [0, 1, 1, 2, 1]);
assert.deepStrictEqual(breadthFirstSearch(getInput(bfs, 'disconnected', undefined)).distances, [0, 1, -1, -1]);
assert.deepStrictEqual(breadthFirstSearch([[0, 0], [0, 0]]).order, [0]);
const bfsTrace = bfs.run(getInput(bfs, 'cycle', undefined));
assert.strictEqual(bfsTrace.steps[0].metrics[1].value, '0', 'Earlier queue snapshots must survive later mutations.');
assert.strictEqual(bfsTrace.steps[bfsTrace.steps.length - 1].metrics[1].value, 'Rỗng');
console.log('Passed: Hamilton regression, BFS traversal/distances, immutable snapshots, shared trace contract and input validation.');

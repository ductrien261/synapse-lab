// Trace fixtures mirror Commander's null key for global commands.
// tslint:disable:no-null-keyword
import assert from 'assert';
import { replayCommands } from './tracer-replay';
import { getAutoConfig, runCatalogTracer } from './auto-tracer';
import { Hierarchy } from 'models';
import { presentCode } from './code-presentation';
import { MAX_TRACE_BYTES } from './limits';

const source = 'first\nsecond\nthird\nfourth';
const trace = replayCommands([
  { key: 'board', method: 'Array2DTracer', args: ['Board'] },
  { key: 'board', method: 'set', args: [[[-1, -1], [-1, -1]]] },
  { key: null, method: 'delay', args: [1] },
  { key: 'board', method: 'patch', args: [0, 0, 0] },
  { key: null, method: 'delay', args: [2] },
  { key: 'board', method: 'depatch', args: [0, 0] },
  { key: 'board', method: 'select', args: [0, 0] },
  { key: null, method: 'delay', args: [3] },
  { key: 'board', method: 'deselect', args: [0, 0] },
  { key: 'board', method: 'patch', args: [0, 0, -1] },
  { key: null, method: 'delay', args: [4] },
], source);
assert.strictEqual(trace.steps[0].panels![0].cells[0][0].value, '-1');
assert.strictEqual(trace.steps[1].panels![0].cells[0][0].value, '0');
assert.strictEqual(trace.steps[1].panels![0].cells[0][0].tone, 'active');
assert.strictEqual(trace.steps[2].panels![0].cells[0][0].tone, 'selected');
assert.strictEqual(trace.steps[3].panels![0].cells[0][0].value, '-1');
assert.strictEqual(trace.steps[3].codeLine, 4);
assert.throws(() => replayCommands([{ key: 'x', method: 'UnsupportedTracer', args: [] }], source));
assert.throws(() => replayCommands([], source));
assert.throws(() => replayCommands([
  { key: 'array', method: 'Array1DTracer', args: ['Large'] },
  { key: 'array', method: 'set', args: [['x'.repeat(MAX_TRACE_BYTES)]] },
  { key: null, method: 'delay', args: [1] },
], source), /Trace size limit/);
assert.throws(() => presentCode(trace, { source: 'example', lineMap: {}, narration: [], capture: {}, fingerprint: 'test', description: 'equivalent' }), /no equivalent code line/);

async function main() {
  const hierarchy = new Hierarchy();
  for (const [category, key] of [['backtracking', 'knights-tour-problem'], ['brute-force', 'bubble-sort'], ['brute-force', 'selection-sort']]) {
    const algorithm = hierarchy.find(category, key)!;
    const config = getAutoConfig(algorithm.algorithmName, algorithm.files)!;
    assert.strictEqual(config.renderer, 'matrix');
    const file = algorithm.files.find(item => item.name === config.samples[0].key)!;
    const [result, duplicate] = await Promise.all([runCatalogTracer(file), runCatalogTracer(file)]);
    assert.strictEqual(result, duplicate, 'Concurrent identical requests share a job.');
    assert.strictEqual(await runCatalogTracer(file), result, 'Completed traces are cached.');
    const lineCount = result.code.source.split('\n').length;
    result.steps.forEach(step => { assert(step.panels && step.panels.length); assert(step.codeLine >= 1 && step.codeLine <= lineCount); });
    if (key === 'knights-tour-problem') {
      assert.strictEqual(result.code.language, 'cpp');
      const branchStops = result.steps.filter(step => (step.narration && step.narration.pause) && step.codeLine === 19);
      assert.strictEqual(branchStops.length, 14, 'Each failed choice has exactly one narrated pause.');
      assert(branchStops.every(step => step.narration!.conclusion.toLowerCase().includes('nhánh') && step.narration!.next.toLowerCase().includes('trở về')));
      const rowCalculation = result.steps.find(step => step.codeLine === 13)!;
      const colCalculation = result.steps.find(step => step.codeLine === 14)!;
      assert(rowCalculation.narration!.text!.includes('0 + (2) = 2'), 'The lesson uses real local variables from execution.');
      assert(colCalculation.narration!.text!.includes('0 + (1) = 1'));
      assert(result.steps.filter(step => step.narration).every(step => step.narration!.text && !JSON.stringify(step.narration).includes('{{')));
      assert.strictEqual(result.steps.filter(step => (step.narration && step.narration.pause) && step.codeLine === 32).length, 1, 'Final failure is concluded once.');
      assert(result.code.description!.includes('tương đương'));
      assert(result.code.source.split('\n').length < 50);
      assert(result.steps.some(step => step.codeLine === 17), 'Choosing a destination highlights the C++ assignment.');
      assert(result.steps.some(step => step.codeLine === 19), 'Backtracking highlights the C++ undo.');
      assert.strictEqual(result.steps[result.steps.length - 1].codeLine, 32, 'Failure highlights the C++ result output.');
      assert.strictEqual(result.summary, 'Solution does not exist');
      const first = result.steps[0].panels![0];
      const last = result.steps[result.steps.length - 1].panels![0];
      assert.strictEqual(first.cells[0][0].value, '-1');
      assert.strictEqual(last.cells[0][0].value, '0');
      assert(last.cells.reduce((count, row) => count + row.filter(cell => cell.value !== '-1').length, 0) === 1, 'Unsuccessful routes restore the board.');
    } else {
      const last = result.steps[result.steps.length - 1].panels!.find(panel => panel.kind === 'array')!;
      const values = last.cells[0].map(cell => Number(cell.value));
      assert(values.every((value, index) => index === 0 || values[index - 1] <= value), 'Sorting algorithms really sort their input.');
      const chart = result.steps[result.steps.length - 1].panels!.find(panel => panel.kind === 'chart')!;
      assert.deepStrictEqual(chart.cells, last.cells, 'Linked chart follows actual array updates.');
    }
  }
  console.log('Passed: immutable replay, patch/select/backtrack, source lines, automatic Knight/Bubble/Selection discovery, real execution and cache.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

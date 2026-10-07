import assert from 'assert';
import { Hierarchy } from 'models';
import { resolveSimulation, SimulationError } from './service';

async function main() {
  const hierarchy = new Hierarchy();
  for (const [category, key] of [['backtracking', 'hamiltonean-cycles'], ['backtracking', 'knights-tour-problem'], ['brute-force', 'breadth-first-search'], ['brute-force', 'bubble-sort']]) {
    const algorithm = hierarchy.find(category, key)!;
    const engine = resolveSimulation(`${category}/${key}`, algorithm.algorithmName, algorithm.files)!;
    assert(engine);
    const sample = engine.config.samples[0].key;
    const trace = await engine.generate(sample);
    assert(trace.steps.length && trace.renderer === engine.config.renderer);
    const original = trace.steps[0].message;
    trace.steps[0].message = 'Modified by a consumer';
    assert.strictEqual((await engine.generate(sample)).steps[0].message, original);
    await assert.rejects(engine.generate('../../secret.js'), (error: SimulationError) => error.status === 400);
    if (engine.config.customInput) {
      const custom = await engine.generate('custom', JSON.stringify([[0, 1], [1, 0]]));
      assert.strictEqual(custom.steps[0].graph!.nodes.length, 2);
      await assert.rejects(engine.generate('custom', '[[0,1],[0,0]]'), (error: SimulationError) => error.status === 400);
    } else await assert.rejects(engine.generate(sample, '[]'), (error: SimulationError) => error.status === 400);
  }
  assert.strictEqual(resolveSimulation('unknown/unsupported', 'Unsupported', []), undefined);
  console.log('Passed: shared generation for Hamilton, Knight, BFS and Bubble; custom input, validation and cache isolation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

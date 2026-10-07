import { File } from 'models';
import { getRunner, getInput } from './registry';
import { getAutoConfig, runCatalogTracer, SimulationBusyError } from './auto-tracer';
import { SimulationConfig, SimulationTrace } from './types';
import { MAX_TRACE_BYTES, MAX_TRACE_STEPS } from './limits';

export class SimulationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface SimulationEngine {
  config: SimulationConfig;
  generate(sample: unknown, adjacency?: unknown): Promise<SimulationTrace>;
}

// Both custom playback and database generation enter the same pipeline.
// Algorithm adapters own computation; this service owns dispatch and validation.
export function resolveSimulation(algorithmPath: string, title: string, files: File[]): SimulationEngine | undefined {
  const runner = getRunner(algorithmPath);
  const config = runner ? runner.config : getAutoConfig(title, files);
  if (!config) return;
  return {
    config,
    async generate(sample, adjacency) {
      let execute: () => SimulationTrace | Promise<SimulationTrace>;
      if (runner) {
        let input: number[][];
        try { input = getInput(runner, sample, adjacency); }
        catch (error) { throw new SimulationError(400, error.message); }
        execute = () => runner.run(input);
      } else {
        if (typeof sample !== 'string' || !config.samples.some(item => item.key === sample)) throw new SimulationError(400, 'Unknown source sample.');
        if (adjacency !== undefined) throw new SimulationError(400, 'Custom input is not supported for this source.');
        const file = files.find(item => item.name === sample);
        if (!file) throw new SimulationError(400, 'Unknown source sample.');
        execute = () => runCatalogTracer(file);
      }
      try {
        const trace = await execute();
        validateGeneratedTrace(trace, config);
        // Consumers cannot alter cached states used by later requests.
        return JSON.parse(JSON.stringify(trace));
      } catch (error) {
        if (error instanceof SimulationBusyError) throw new SimulationError(503, error.message);
        throw new SimulationError(422, error.message);
      }
    },
  };
}

function validateGeneratedTrace(trace: SimulationTrace, config: SimulationConfig) {
  if (!trace || trace.renderer !== config.renderer || !trace.code || !trace.code.source || !Array.isArray(trace.steps) || !trace.steps.length || trace.steps.length > MAX_TRACE_STEPS) throw new Error('Invalid generated simulation.');
  if (Buffer.byteLength(JSON.stringify(trace)) > MAX_TRACE_BYTES) throw new Error('Generated simulation exceeded its size limit.');
  const lines = trace.code.source.split('\n').length;
  trace.steps.forEach(step => {
    if (!Number.isInteger(step.codeLine) || step.codeLine < 1 || step.codeLine > lines || !step.message || !step.action || !step.context || !Array.isArray(step.metrics)) throw new Error('Invalid generated simulation step.');
    if (config.renderer === 'graph' && (!step.graph || !step.graph.nodes.length)) throw new Error('Missing graph state.');
    if (config.renderer === 'matrix' && (!step.panels || !step.panels.length)) throw new Error('Missing array state.');
  });
}

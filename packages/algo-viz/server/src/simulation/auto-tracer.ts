import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { File } from 'models';
import { algorithmsDir } from 'config/paths';
import { SimulationConfig, SimulationTrace } from './types';
import { replayCommands, TraceCommand } from './tracer-replay';
import { loadCodePresentation, presentCode, sourceHash } from './code-presentation';
import { MAX_SOURCE_BYTES, MAX_TRACE_BYTES, MAX_TRACE_COMMANDS, MAX_CACHE_BYTES, MAX_CACHE_ENTRIES, MAX_WORKERS } from './limits';

export class SimulationBusyError extends Error {}

// Only repository catalog files are executable; requests cannot supply source code.
export function getAutoConfig(title: string, files: File[]): SimulationConfig | undefined {
  const candidates = files.filter(file => /\.js$/i.test(file.name) && /require\(['"]algorithm-visualizer['"]\)/.test(file.content) && /\bArray[12]DTracer\b/.test(file.content) && !/\b(?:GraphTracer|ScatterTracer)\b/.test(file.content));
  if (!candidates.length) return;
  return { renderer: 'matrix', title: `Mô phỏng ${title}`, samples: candidates.map(file => ({ key: file.name, label: file.name })) };
}
const cache = new Map<string, { trace: SimulationTrace; bytes: number }>();
let cacheBytes = 0;
const pending = new Map<string, Promise<SimulationTrace>>();
let activeWorkers = 0;
export async function runCatalogTracer(file: File): Promise<SimulationTrace> {
  const root = fs.realpathSync(algorithmsDir) + path.sep;
  if (!fs.realpathSync(file.path).startsWith(root) || !file.name.toLowerCase().endsWith('.js')) throw new Error('Only trusted catalog JavaScript is executable.');
  if (fs.statSync(file.path).size > MAX_SOURCE_BYTES) throw new Error('Simulation source exceeded its size limit.');
  const source = fs.readFileSync(file.path, 'utf8');
  const presentation = loadCodePresentation(file.path, source);
  const hash = sourceHash(source + (presentation ? presentation.fingerprint : ''));
  if (cache.has(hash)) {
    const entry = cache.get(hash)!;
    cache.delete(hash); cache.set(hash, entry);
    return entry.trace;
  }
  if (pending.has(hash)) return pending.get(hash)!;
  if (activeWorkers >= MAX_WORKERS) throw new SimulationBusyError('Simulation is busy. Please retry.');
  activeWorkers++;
  const result = new Promise<SimulationTrace>((resolve, reject) => {
    const worker = spawn(process.execPath, ['--max-old-space-size=128', '-r', 'ts-node/register/transpile-only', path.join(__dirname, 'tracer-worker.js')], {
      env: { PATH: process.env.PATH, NODE_PATH: path.resolve(__dirname, '..'), ALGORITHM_VISUALIZER: '1' },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    let finished = false;
    const finish = (error?: Error, trace?: SimulationTrace) => {
      if (finished) return;
      finished = true; clearTimeout(timer); worker.kill();
      if (error) reject(error); else resolve(trace!);
    };
    const timer = setTimeout(() => finish(new Error('Simulation exceeded its time limit.')), 6500);
    worker.on('error', error => finish(error));
    worker.on('exit', () => { if (!finished) finish(new Error('Simulation worker stopped before producing a trace.')); });
    worker.on('message', (message: { error?: string; commands?: TraceCommand[] }) => {
      if (!message || typeof message !== 'object') { finish(new Error('Invalid tracer output.')); return; }
      if (message.error) { finish(new Error(message.error)); return; }
      if (!message || !Array.isArray(message.commands) || message.commands.length > MAX_TRACE_COMMANDS) { finish(new Error('Invalid tracer output.')); return; }
      try { finish(undefined, presentCode(replayCommands(message.commands, source), presentation)); } catch (error) { finish(error); }
    });
    worker.send({ source, capture: presentation ? presentation.capture : {} }, error => { if (error) finish(error); });
  }).then(trace => {
    const bytes = Buffer.byteLength(JSON.stringify(trace));
    if (bytes > MAX_TRACE_BYTES) throw new Error('Simulation exceeded its size limit.');
    while (cache.size && (cache.size >= MAX_CACHE_ENTRIES || cacheBytes + bytes > MAX_CACHE_BYTES)) {
      const oldest = cache.keys().next().value;
      cacheBytes -= cache.get(oldest)!.bytes;
      cache.delete(oldest);
    }
    cache.set(hash, { trace, bytes }); cacheBytes += bytes;
    return trace;
  }).finally(() => { activeWorkers--; pending.delete(hash); });
  pending.set(hash, result);
  return result;
}

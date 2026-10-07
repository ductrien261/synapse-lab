import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SimulationTrace } from './types';
import { MAX_SOURCE_BYTES } from './limits';

export const sourceHash = (source: string) => crypto.createHash('sha256').update(source).digest('hex');
interface NarrationRule { pattern: string; line: number; tracerLine?: number; text?: string; goal?: string; reason?: string; calculation?: string; conclusion: string; next: string; pause: boolean; }

// A reviewed equivalent source can accompany a tracer without executing C++.
// Hashes prevent stale line mappings after either implementation is edited.
export function loadCodePresentation(filePath: string, tracerSource: string) {
  const metadataPath = filePath + '.presentation.json';
  if (!fs.existsSync(metadataPath)) return;
  const directory = fs.realpathSync(path.dirname(filePath)) + path.sep;
  if (!fs.realpathSync(metadataPath).startsWith(directory) || fs.statSync(metadataPath).size > MAX_SOURCE_BYTES) throw new Error('Invalid code presentation file.');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  if (typeof metadata.sourceFile !== 'string' || path.basename(metadata.sourceFile) !== metadata.sourceFile || !metadata.sourceFile.endsWith('.cpp')) throw new Error('Invalid code presentation source.');
  const sourcePath = fs.realpathSync(path.join(directory, metadata.sourceFile));
  if (!sourcePath.startsWith(directory)) throw new Error('Code presentation must remain in its catalog directory.');
  if (fs.statSync(sourcePath).size > MAX_SOURCE_BYTES) throw new Error('Code presentation source exceeded its size limit.');
  const source = fs.readFileSync(sourcePath, 'utf8');
  if (metadata.tracerHash !== sourceHash(tracerSource) || metadata.sourceHash !== sourceHash(source)) throw new Error('Code presentation changed. Review its line mapping before replaying.');
  if (!metadata.lineMap || typeof metadata.lineMap !== 'object' || Array.isArray(metadata.lineMap)) throw new Error('Missing code line mapping.');
  const lineCount = source.split('\n').length;
  Object.keys(metadata.lineMap).forEach(key => {
    const line = metadata.lineMap[key];
    if (!/^\d+$/.test(key) || !Number.isInteger(line) || line < 1 || line > lineCount || !source.split('\n')[line - 1].trim()) throw new Error('Invalid code line mapping.');
  });
  const narration: NarrationRule[] = metadata.narration || [];
  if (!Array.isArray(narration) || narration.length > 30) throw new Error('Invalid narration rules.');
  narration.forEach(rule => {
    if (typeof rule.pattern !== 'string' || rule.pattern.length > 200 || typeof rule.conclusion !== 'string' || typeof rule.next !== 'string' || typeof rule.pause !== 'boolean' || !Number.isInteger(rule.line)) throw new Error('Invalid narration rule.');
    new RegExp(rule.pattern);
    ['goal', 'reason', 'calculation', 'text'].forEach(key => { if (rule[key as 'goal' | 'reason' | 'calculation' | 'text'] !== undefined && typeof rule[key as 'goal' | 'reason' | 'calculation' | 'text'] !== 'string') throw new Error('Invalid teaching text.'); });
  });
  const capture: { [key: string]: string } = metadata.capture || {};
  if (typeof capture !== 'object' || Array.isArray(capture) || Object.keys(capture).length > 20) throw new Error('Invalid variable capture.');
  Object.keys(capture).forEach(key => { if (!/^\w+$/.test(key) || !/^[A-Za-z_$][\w$]*(\[[A-Za-z_$][\w$]*\])?$/.test(capture[key])) throw new Error('Invalid captured variable.'); });
  return { source, lineMap: metadata.lineMap as { [line: string]: number }, narration, capture, fingerprint: sourceHash(JSON.stringify(metadata)), description: 'C++ tương đương · dòng được đối chiếu với bước mô phỏng' };
}

export function presentCode(trace: SimulationTrace, presentation: ReturnType<typeof loadCodePresentation>): SimulationTrace {
  if (!presentation) return trace;
  const rules = presentation.narration.map(rule => ({ ...rule, match: new RegExp(rule.pattern) }));
  return {
    ...trace,
    code: { language: 'cpp', source: presentation.source, description: presentation.description },
    steps: trace.steps.map((step, index) => {
      const codeLine = presentation.lineMap[String(step.codeLine)];
      if (!codeLine) throw new Error('A simulation step has no equivalent code line.');
      const rule = rules.find(item => (item.tracerLine === undefined || item.tracerLine === step.codeLine) && item.line === codeLine && item.match.test(step.message));
      // The replay appends a final snapshot; avoid pausing twice for one result.
      const following = trace.steps[index + 1];
      const duplicate = following && following.message === step.message && presentation.lineMap[String(following.codeLine)] === codeLine;
      const fill = (text: string = '') => step.message.replace(rule!.match, text).replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const value = step.context.values.find(item => item.label === key);
        return value ? value.value : '—';
      });
      const narration = rule ? { text: fill(rule.text), conclusion: fill(rule.conclusion), next: fill(rule.next), pause: rule.pause && !duplicate } : undefined;
      return { ...step, codeLine, narration };
    }),
  };
}

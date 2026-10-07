// Lightweight coloring for the C++ learning sample; tokens preserve source text.
export type CppTokenKind = 'plain' | 'keyword' | 'type' | 'function' | 'number' | 'string' | 'comment' | 'operator';
export interface CppToken { text: string; kind: CppTokenKind }
const KEYWORDS = new Set(['if', 'else', 'for', 'while', 'return', 'continue', 'break', 'using', 'namespace']);
const TYPES = new Set(['int', 'bool', 'void', 'auto', 'vector', 'std']);
const PATTERN = /\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|[+\-*/%=!<>|&]+/g;

export function tokenizeCpp(line: string): CppToken[] {
  const tokens: CppToken[] = [];
  let offset = 0;
  for (const match of line.matchAll(PATTERN)) {
    const index = match.index;
    if (index > offset) tokens.push({ text: line.slice(offset, index), kind: 'plain' });
    const text = match[0];
    let kind: CppTokenKind = 'plain';
    if (text.startsWith('//')) kind = 'comment';
    else if (text.startsWith('"') || text.startsWith("'")) kind = 'string';
    else if (/^\d/.test(text) || text === 'true' || text === 'false') kind = 'number';
    else if (KEYWORDS.has(text)) kind = 'keyword';
    else if (TYPES.has(text)) kind = 'type';
    else if (/^[+\-*/%=!<>|&]+$/.test(text)) kind = 'operator';
    else if (/^\s*\(/.test(line.slice(index + text.length))) kind = 'function';
    tokens.push({ text, kind });
    offset = index + text.length;
  }
  if (offset < line.length) tokens.push({ text: line.slice(offset), kind: 'plain' });
  return tokens;
}

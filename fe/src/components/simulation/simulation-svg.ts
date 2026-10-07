import type { SimulationStep } from '@/lib/simulation';

export function downloadSimulationSvg(element: SVGSVGElement, step: SimulationStep, index: number, titleText: string) {
  const svg = element.cloneNode(true) as SVGSVGElement;
  const ns = 'http://www.w3.org/2000/svg';
  svg.setAttribute('xmlns', ns);
  const [, , originalWidth, originalHeight] = element.getAttribute('viewBox')!.split(/\s+/).map(Number);
  const width = originalWidth || 500;
  const contentHeight = originalHeight || 440;
  const words = [`Bước ${index + 1} · ${step.context.title}`, ...wrapCaption(step.message)];
  const height = contentHeight + words.length * 18 + 32;
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.removeAttribute('class');
  svg.querySelectorAll('[class]').forEach(node => node.removeAttribute('class'));
  const background = document.createElementNS(ns, 'rect');
  background.setAttribute('width', String(width)); background.setAttribute('height', String(height)); background.setAttribute('fill', '#ffffff');
  svg.prepend(background);
  const title = document.createElementNS(ns, 'title');
  title.textContent = `${titleText} — Bước ${index + 1}`;
  svg.prepend(title);
  const description = document.createElementNS(ns, 'desc');
  description.textContent = step.message;
  svg.prepend(description);
  const caption = document.createElementNS(ns, 'text');
  caption.setAttribute('x', '20'); caption.setAttribute('y', String(contentHeight + 20));
  caption.setAttribute('font-family', 'sans-serif'); caption.setAttribute('font-size', '12'); caption.setAttribute('fill', '#243355');
  words.forEach((line, i) => {
    const span = document.createElementNS(ns, 'tspan');
    span.setAttribute('x', '20'); span.setAttribute('dy', i ? '18' : '0'); span.textContent = line; caption.append(span);
  });
  svg.append(caption);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `simulation-step-${index + 1}.svg`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function wrapCaption(text: string): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > 65) { lines.push(line); line = word; }
    else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  return lines;
}

import type { RefObject } from 'react';
import type { GraphState, Tone } from '@/lib/simulation';

const colors: Record<Tone, string> = { idle: '#CBD5E1', selected: '#1E3F82', active: '#D97706', rejected: '#E11D48', complete: '#059669' };
export function GraphRenderer({ graph, svgRef, compact = false }: { graph: GraphState; svgRef?: RefObject<SVGSVGElement | null>; compact?: boolean }) {
  const nodes = graph.nodes.map((node, index) => ({ ...node, x: 250 + 155 * Math.cos(index * 2 * Math.PI / graph.nodes.length - Math.PI / 2), y: 195 + 155 * Math.sin(index * 2 * Math.PI / graph.nodes.length - Math.PI / 2) }));
  const positions = new Map(nodes.map(node => [node.id, node]));
  return <svg ref={svgRef} viewBox={compact ? '0 0 500 380' : '0 0 500 440'} role="img" aria-label="Trạng thái đồ thị ở bước đang xem" className="mx-auto w-full max-w-[580px]">
    {graph.edges.map((edge, index) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return null;
      return <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={colors[edge.tone]} strokeWidth={edge.tone === 'selected' || edge.tone === 'complete' ? 5 : edge.tone === 'idle' ? 2 : 3} strokeDasharray={edge.dashed ? '7 5' : undefined} className="transition-[stroke,stroke-width] duration-200" />;
    })}
    {nodes.map(node => <g key={node.id}><circle cx={node.x} cy={node.y} r={compact ? 26 : 22} fill={node.tone === 'rejected' ? '#FFF1F2' : node.tone === 'idle' ? 'white' : '#E8F0FB'} stroke={colors[node.tone]} strokeWidth="3" className="transition-[fill,stroke] duration-200" /><text x={node.x} y={node.y + 5} textAnchor="middle" fontSize={compact ? 21 : 16} fontWeight="700" fill="#243355">{node.label}</text></g>)}
  </svg>;
}

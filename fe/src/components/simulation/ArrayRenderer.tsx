import type { RefObject } from 'react';
import type { ArrayPanel, Tone } from '@/lib/simulation';
const colors: Record<Tone, string> = { idle: '#CBD5E1', selected: '#1E3F82', active: '#D97706', rejected: '#E11D48', complete: '#059669' };
export function ArrayRenderer({ panels, svgRef, compact = false }: { panels: ArrayPanel[]; svgRef?: RefObject<SVGSVGElement | null>; compact?: boolean }) {
  const width = Math.max(400, ...panels.map(panel => (panel.cells[0]?.length ?? 1) * 44 + 48));
  const sizes = panels.map(panel => 56 + (panel.kind === 'chart' ? 110 : panel.cells.length * 44));
  const height = 12 + sizes.reduce((sum, size) => sum + size, 0);
  const layout = panels.map((panel, index) => ({ panel, chartMax: panel.kind === 'chart' ? Math.max(1, ...(panel.cells[0] ?? []).map(cell => Math.abs(Number(cell.value)) || 0)) : 1, top: 12 + sizes.slice(0, index).reduce((sum, size) => sum + size, 0) }));
  return <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trạng thái mảng hoặc bàn cờ ở bước đang xem" className={`mx-auto w-full ${compact ? 'max-h-72' : 'max-h-[580px]'} max-w-[640px]`}>
    {layout.map(({ panel, top, chartMax }) => <g key={panel.id}><text x="24" y={top + 24} fontSize="15" fontWeight="700" fill="#243355">{panel.title}</text>
      {panel.kind === 'chart' ? panel.cells[0]?.map((cell, col) => {
        const barHeight = Math.max(2, (Math.abs(Number(cell.value)) || 0) / chartMax * 75);
        return <g key={col}><rect x={24 + col * 44} y={top + 115 - barHeight} width="36" height={barHeight} fill={cell.tone === 'idle' ? '#94A3B8' : colors[cell.tone]} /><text x={42 + col * 44} y={top + 132} textAnchor="middle" fontSize="12" fill="#243355">{cell.value}</text></g>;
      }) : panel.cells.map((row, r) => row.map((cell, c) => <g key={`${r}-${c}`}><rect x={24 + c * 44} y={top + 36 + r * 44} width="42" height="42" rx={panel.kind === 'matrix' ? 2 : 6} fill={cell.tone === 'active' ? '#FEF3C7' : cell.tone === 'selected' ? '#E8F0FB' : panel.kind === 'matrix' && (r + c) % 2 ? '#F1F5F9' : 'white'} stroke={colors[cell.tone]} strokeWidth={cell.tone === 'idle' ? 1 : 2} /><text x={45 + c * 44} y={top + 63 + r * 44} textAnchor="middle" fontSize="14" fontWeight={cell.tone === 'idle' ? 400 : 700} fill="#243355">{cell.value}</text></g>))}
    </g>)}
  </svg>;
}

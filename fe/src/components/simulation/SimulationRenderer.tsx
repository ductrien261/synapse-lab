import type { RefObject } from 'react';
import type { SimulationStep } from '@/lib/simulation';
import { GraphRenderer } from './GraphRenderer';
import { ArrayRenderer } from './ArrayRenderer';
export function SimulationRenderer({ step, svgRef, compact }: { step: SimulationStep; svgRef?: RefObject<SVGSVGElement | null>; compact?: boolean }) {
  if (step.graph) return <GraphRenderer graph={step.graph} svgRef={svgRef} compact={compact} />;
  if (step.panels) return <ArrayRenderer panels={step.panels} svgRef={svgRef} compact={compact} />;
  return <p className="p-5 text-sm text-stone-500">Không có trạng thái hình ở bước này.</p>;
}

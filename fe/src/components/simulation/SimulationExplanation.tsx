import type { SimulationStep } from '@/lib/simulation';

export function SimulationExplanation({ narration }: { narration: NonNullable<SimulationStep['narration']> }) {
  const paragraphs = narration.text ? [narration.text] : [narration.conclusion, narration.next];
  return <div className="space-y-3 text-sm leading-6 text-stone-700">
    {paragraphs.filter(Boolean).map((text, index) => <p key={index} className="whitespace-pre-line break-words">
      {text!.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, token) => part.startsWith('`')
        ? <code key={token} className="rounded bg-stone-200/70 px-1.5 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>
        : part.startsWith('**') ? <strong key={token} className="font-semibold text-[#243355]">{part.slice(2, -2)}</strong> : part)}
    </p>)}
  </div>;
}

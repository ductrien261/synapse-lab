import { ArrowRepeat, Box, ChatSquareQuote, People, PersonVcard, PlayCircle } from 'react-bootstrap-icons';
import type { CapabilityKey } from '@/lib/marketing';

const ICONS: Record<CapabilityKey, typeof Box> = {
  'visual-3d': Box,
  simulation: PlayCircle,
  assistant: ChatSquareQuote,
  review: ArrowRepeat,
  profile: PersonVcard,
  spaces: People,
};

export function CapabilityIcon({ name, className = 'h-6 w-6' }: { name: CapabilityKey; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden />;
}

'use client';

import { useAnatomyModels } from '@/lib/anatomy-catalog';

export function usePublishedAnatomyCount() {
  const { models } = useAnatomyModels();
  return models.filter((model) => model.is_published).length;
}

'use client';

import { useEffect, useState } from 'react';
import { algorithmApi } from '@/lib/algorithm-api';

export function useAlgorithmCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    algorithmApi.categories()
      .then((categories) => {
        if (!cancelled) setCount(categories.reduce((total, category) => total + category.algorithms.length, 0));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return count;
}

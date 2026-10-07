'use client';

import { useEffect, useState } from 'react';
const NO_CHECKPOINTS: readonly number[] = [];

export function useSimulationPlayback(length: number, enabled: boolean, checkpoints: readonly number[] = NO_CHECKPOINTS) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const atEnd = index >= length - 1;
  const running = playing && !atEnd && enabled;
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      const next = Math.min(index + 1, length - 1);
      setIndex(next);
      if (checkpoints.includes(next)) setPlaying(false);
    }, 1100 / speed);
    return () => clearTimeout(timer);
  }, [running, index, speed, length, checkpoints]);
  const navigate = (next: number) => { setPlaying(false); setIndex(Math.max(0, Math.min(next, length - 1))); };
  const toggle = () => { if (atEnd) setIndex(0); setPlaying(!running); };
  return { index, running, atEnd, speed, setSpeed, navigate, toggle };
}

'use client';

import { useMemo } from 'react';
import { useStorageValue, writeStorage } from '@/lib/storage';
import { createDefaultLessonPlan, createDefaultQuiz, type LessonPlanDraft, type LessonStep } from './lesson-plan';

function isLessonPlan(value: unknown): value is LessonPlanDraft {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LessonPlanDraft>;
  return typeof candidate.title === 'string' && Array.isArray(candidate.steps);
}

function normalizePlan(plan: LessonPlanDraft): LessonPlanDraft {
  return {
    ...plan,
    steps: plan.steps.map((item) => ({
      ...item,
      materials: Array.isArray(item.materials) ? item.materials : [],
      quiz: item.quiz ? { ...createDefaultQuiz(false), ...item.quiz } : createDefaultQuiz(item.feedbackMode === 'quiz'),
    })),
  };
}

export function useLessonPlanDraft(roomCode: string, roomName: string) {
  const storageKey = useMemo(() => `synapse:lesson-plan:${roomCode}`, [roomCode]);
  const storedValue = useStorageValue(storageKey);
  const fallback = useMemo(() => createDefaultLessonPlan(roomName), [roomName]);
  const plan = useMemo(() => {
    if (!storedValue) return fallback;
    try {
      const parsed: unknown = JSON.parse(storedValue);
      return isLessonPlan(parsed) ? normalizePlan(parsed) : fallback;
    } catch {
      return fallback;
    }
  }, [fallback, storedValue]);

  const commit = (updater: (current: LessonPlanDraft) => LessonPlanDraft) => {
    const next = { ...updater(plan), updatedAt: new Date().toISOString() };
    writeStorage(storageKey, JSON.stringify(next));
  };

  const updatePlan = (patch: Partial<Omit<LessonPlanDraft, 'steps' | 'updatedAt'>>) => {
    commit((current) => ({ ...current, ...patch }));
  };

  const updateStep = (stepId: string, patch: Partial<LessonStep>) => {
    commit((current) => ({
      ...current,
      steps: current.steps.map((item) => item.id === stepId ? { ...item, ...patch } : item),
    }));
  };

  return { plan, commit, updatePlan, updateStep };
}

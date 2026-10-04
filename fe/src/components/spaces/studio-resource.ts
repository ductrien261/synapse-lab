import type { LessonMaterial, LessonPlanDraft, LessonQuiz, LessonStep, MaterialKind } from './lesson-plan';

export interface StudioMaterialResource {
  key: string;
  kind: MaterialKind;
  stepId: string;
  stepTitle: string;
  material: LessonMaterial;
}

export interface StudioQuizResource {
  key: string;
  kind: 'quiz';
  stepId: string;
  stepTitle: string;
  quiz: LessonQuiz;
}

export type StudioResource = StudioMaterialResource | StudioQuizResource;

export function getStudioResources(plan: LessonPlanDraft): StudioResource[] {
  return plan.steps.flatMap((step) => {
    const resources: StudioResource[] = [
      ...step.materials.map((material) => ({
      key: `material:${step.id}:${material.id}`,
      kind: material.kind,
      stepId: step.id,
      stepTitle: step.title,
      material,
      }) as StudioMaterialResource),
    ...(step.quiz.enabled ? [{
      key: `quiz:${step.id}`,
      kind: 'quiz' as const,
      stepId: step.id,
      stepTitle: step.title,
      quiz: step.quiz,
    }] : []),
    ];
    return resources.sort((left, right) => getResourcePosition(left) - getResourcePosition(right));
  });
}

function getResourcePosition(resource: StudioResource): number {
  return resource.kind === 'quiz' ? resource.quiz.position ?? Number.MAX_SAFE_INTEGER : resource.material.position ?? Number.MAX_SAFE_INTEGER;
}

export function getResourceTitle(resource: StudioResource): string {
  return resource.kind === 'quiz' ? resource.quiz.title : resource.material.name;
}

export function getResourceStep(plan: LessonPlanDraft, resource: StudioResource): LessonStep | undefined {
  return plan.steps.find((step) => step.id === resource.stepId);
}

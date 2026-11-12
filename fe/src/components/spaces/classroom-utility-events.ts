export type ClassroomUtility = 'annotations' | 'whiteboard' | 'poll';

export const CLASSROOM_UTILITY_EVENT = 'synapse:classroom-utility';

export function openClassroomUtility(utility: ClassroomUtility) {
  window.dispatchEvent(new CustomEvent<ClassroomUtility>(CLASSROOM_UTILITY_EVENT, { detail: utility }));
}


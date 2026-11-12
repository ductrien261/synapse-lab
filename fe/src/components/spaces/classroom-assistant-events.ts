export const CLASSROOM_ASSISTANT_ACTION_EVENT = 'synapse.classroom-assistant.action';

export type ClassroomAssistantAction = {
  kind: 'chat' | 'explain';
  page: number;
  text: string;
};

export function openClassroomAssistant(action: ClassroomAssistantAction) {
  window.dispatchEvent(new CustomEvent<ClassroomAssistantAction>(CLASSROOM_ASSISTANT_ACTION_EVENT, { detail: action }));
}

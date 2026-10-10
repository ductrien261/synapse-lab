import { request, uploadRequest } from '@/lib/api';
import type { LessonResourceDto } from './lesson-plan-api';

import type { SpacePurpose } from './space-data';

export interface LiveSessionDto {
  id: string;
  title: string;
  status: 'live' | 'ended';
  participant_count: number;
  started_at: string;
  ended_at: string | null;
  last_synced_at: string | null;
  mode: 'livekit';
  current_user_joined: boolean;
}

export interface ClassroomDto {
  id: string;
  name: string;
  description: string;
  code: string;
  purpose: SpacePurpose;
  track: 'cs' | 'med' | null;
  owner_email: string;
  member_count: number;
  is_owner: boolean;
  is_archived: boolean;
  active_session: LiveSessionDto | null;
  created_at: string;
  updated_at: string;
}

export interface PresentationResource {
  id: string;
  title: string;
  kind: 'pdf' | 'doc' | 'slide' | 'video' | 'link' | 'quiz';
  section_title: string;
}

export interface PresentationQuizRun {
  id: string;
  status: 'open' | 'closed';
  closes_at: string;
  remaining_seconds: number;
  response_count: number;
  participant_count: number;
  selected_option: number | null;
  quiz: { id: string; title: string; question: string; options: string[]; duration_seconds: number };
  results?: { correct_option: number; option_counts: number[]; correct_count: number };
  correct_option?: number;
}

export type AnnotationTool = 'none' | 'pen' | 'highlighter' | 'text' | 'eraser';

export interface PresentationAnnotation {
  id: string;
  kind: 'pen' | 'highlighter' | 'text';
  points: [number, number][];
  text: string;
}

export interface PresentationState {
  is_moderator: boolean;
  resources: PresentationResource[];
  selected: Pick<LessonResourceDto, 'id' | 'kind' | 'title' | 'file' | 'external_url' | 'preview_page_count' | 'preview_slide_urls'> | null;
  page: number;
  on_stage: boolean;
  stage: PresentationState['selected'];
  stage_page: number;
  stage_scroll: number;
  stage_annotations: PresentationAnnotation[];
  active_run: PresentationQuizRun | null;
}

export const classroomApi = {
  list: () => request<ClassroomDto[]>('/classrooms/'),

  get: (code: string) => request<ClassroomDto>(`/classrooms/${encodeURIComponent(code)}/`),

  create: (data: { name: string; purpose: SpacePurpose }) =>
    request<ClassroomDto>('/classrooms/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  joinClassroom: (code: string) =>
    request<ClassroomDto>('/classrooms/join/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  startSession: (code: string) =>
    request<ClassroomDto>(`/classrooms/${encodeURIComponent(code)}/sessions/start/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  joinSession: (code: string) =>
    request<{ mode: 'livekit' }>(`/classrooms/${encodeURIComponent(code)}/sessions/join/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  videoToken: (code: string) =>
    request<{ url: string; token: string }>(`/classrooms/${encodeURIComponent(code)}/sessions/video-token/`),

  presentation: (code: string) =>
    request<PresentationState>(`/classrooms/${encodeURIComponent(code)}/sessions/presentation/`),

  presentationAction: (code: string, data: Record<string, unknown>) =>
    request<PresentationState>(`/classrooms/${encodeURIComponent(code)}/sessions/presentation/`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  uploadPresentation: (code: string, file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('action', 'upload');
    form.append('file', file);
    return uploadRequest<PresentationState>(`/classrooms/${encodeURIComponent(code)}/sessions/presentation/`, form, onProgress);
  },

  endSession: (code: string) =>
    request<void>(`/classrooms/${encodeURIComponent(code)}/sessions/end/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  leaveSession: (code: string) =>
    request<void>(`/classrooms/${encodeURIComponent(code)}/sessions/leave/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

};

import { request } from '@/lib/api';

export type LessonSubject = 'anatomy';
export type LessonResourceKind = 'slide' | 'pdf' | 'doc' | 'model_3d' | 'quiz' | 'video' | 'link';

export interface LessonQuizDto {
  question: string;
  options: string[];
  correct_option: number;
  duration_seconds: number;
  trigger_mode: 'manual' | 'after_resource' | 'at_minute' | 'at_slide';
  trigger_minute: number;
  delay_seconds: number;
  trigger_resource: string | null;
  trigger_slide_number: number;
  success_threshold: number;
}

export interface LessonResourceDto {
  id: string;
  section: string;
  kind: LessonResourceKind;
  title: string;
  description: string;
  file: string | null;
  external_url: string;
  anatomy_model: string | null;
  anatomy_model_detail: {
    sketchfab_uid: string;
    title: string;
    thumbnail_url: string;
    embed_url: string;
    system: string | null;
  } | null;
  duration_minutes: number;
  position: number;
  visible_to_students: boolean;
  allow_download: boolean;
  show_page_number: boolean;
  learning_objectives: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  quiz: LessonQuizDto | null;
  preview_status: 'none' | 'processing' | 'ready' | 'failed';
  preview_error: string;
  preview_page_count: number;
  preview_pdf_url: string | null;
  preview_slide_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface LessonSectionDto {
  id: string;
  plan: string;
  title: string;
  objective: string;
  teacher_notes: string;
  duration_minutes: number;
  position: number;
  resources: LessonResourceDto[];
  created_at: string;
  updated_at: string;
}

export interface LessonPlanDto {
  id: string;
  classroom: string;
  subject: LessonSubject;
  title: string;
  objective: string;
  sections: LessonSectionDto[];
  created_at: string;
  updated_at: string;
}

export const lessonPlanApi = {
  get: (code: string) => request<LessonPlanDto>(`/classrooms/${encodeURIComponent(code)}/lesson-plan/`),
  create: (code: string, data: { subject: LessonSubject; title: string; objective?: string }) =>
    request<LessonPlanDto>(`/classrooms/${encodeURIComponent(code)}/lesson-plan/`, { method: 'POST', body: JSON.stringify(data) }),
  update: (code: string, data: Partial<Pick<LessonPlanDto, 'title' | 'objective' | 'subject'>>) =>
    request<LessonPlanDto>(`/classrooms/${encodeURIComponent(code)}/lesson-plan/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (code: string) => request<void>(`/classrooms/${encodeURIComponent(code)}/lesson-plan/`, { method: 'DELETE' }),
  createSection: (code: string, data: Partial<Pick<LessonSectionDto, 'title' | 'objective' | 'teacher_notes' | 'duration_minutes' | 'position'>>) =>
    request<LessonSectionDto>(`/classrooms/${encodeURIComponent(code)}/lesson-plan/sections/`, { method: 'POST', body: JSON.stringify(data) }),
  updateSection: (code: string, id: string, data: Partial<Pick<LessonSectionDto, 'title' | 'objective' | 'teacher_notes' | 'duration_minutes' | 'position'>>) =>
    request<LessonSectionDto>(`/classrooms/${encodeURIComponent(code)}/lesson-plan/sections/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSection: (code: string, id: string) => request<void>(`/classrooms/${encodeURIComponent(code)}/lesson-plan/sections/${id}/`, { method: 'DELETE' }),
  createResource: (code: string, sectionId: string, data: FormData | Record<string, unknown>) =>
    request<LessonResourceDto>(`/classrooms/${encodeURIComponent(code)}/lesson-plan/sections/${sectionId}/resources/`, { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) }),
  updateResource: (code: string, id: string, data: Partial<LessonResourceDto>) =>
    request<LessonResourceDto>(`/classrooms/${encodeURIComponent(code)}/lesson-plan/resources/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteResource: (code: string, id: string) => request<void>(`/classrooms/${encodeURIComponent(code)}/lesson-plan/resources/${id}/`, { method: 'DELETE' }),
};

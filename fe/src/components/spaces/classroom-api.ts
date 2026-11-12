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
  kind: 'pdf' | 'doc' | 'slide' | 'model_3d' | 'video' | 'link' | 'quiz';
  section_title: string;
  trigger_mode?: 'manual' | 'after_resource' | 'at_minute' | 'at_slide' | null;
  trigger_minute?: number | null;
  delay_seconds?: number | null;
  trigger_resource_id?: string | null;
  trigger_resource_title?: string | null;
  trigger_slide_number?: number | null;
}

export interface PresentationQuizRun {
  id: string;
  status: 'open' | 'closed';
  closes_at: string;
  remaining_seconds: number;
  remaining_ms: number;
  response_count: number;
  participant_count: number;
  selected_option: number | null;
  quiz: { id: string; title: string; question: string; options: string[]; duration_seconds: number };
  results?: QuizRunResults;
  correct_option?: number;
  is_correct?: boolean | null;
}

export interface QuizResponseResult {
  user_id: string;
  name: string;
  email: string;
  selected_option: number;
  is_correct: boolean;
  submitted_at: string;
}

export interface QuizRunResults {
  correct_option: number;
  option_counts: number[];
  correct_count: number;
  unanswered_count: number;
  accuracy_percent: number;
  response_rate_percent: number;
  success_threshold: number;
  meets_threshold: boolean;
  responses: QuizResponseResult[];
}

export interface QuizReportRun extends Omit<QuizRunResults, 'correct_option'> {
  id: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  quiz: {
    id: string;
    title: string;
    question: string;
    options: string[];
    correct_option: number;
    success_threshold: number;
  };
  participant_count: number;
  response_count: number;
}

export interface QuizReportSession {
  id: string;
  title: string;
  status: 'live' | 'ended';
  started_at: string;
  ended_at: string | null;
  participant_count: number;
  quiz_count: number;
  response_count: number;
  correct_count: number;
  accuracy_percent: number;
  runs: QuizReportRun[];
}

export interface QuizReport {
  summary: {
    session_count: number;
    quiz_run_count: number;
    response_count: number;
    correct_count: number;
    accuracy_percent: number;
  };
  sessions: QuizReportSession[];
}

export type AnnotationTool = 'none' | 'pen' | 'highlighter' | 'text' | 'eraser';

export interface PresentationAnnotation {
  id: string;
  kind: 'pen' | 'highlighter' | 'text';
  points: [number, number][];
  text: string;
}

export interface WhiteboardStrokeDto {
  id: string;
  authorId: string;
  authorName: string;
  tool: 'pen' | 'highlighter';
  color: string;
  points: [number, number][];
  createdAt: number;
}

export interface WhiteboardSnapshotDto {
  context_key: string;
  resource_id: string | null;
  page: number;
  strokes: WhiteboardStrokeDto[];
  locked: boolean;
  updated_at: string | null;
}

export interface LivePollDto {
  id: string;
  question: string;
  options: string[];
  duration_seconds: number;
  is_anonymous: boolean;
  status: 'open' | 'closed';
  opened_at: string;
  closes_at: string;
  closed_at: string | null;
  remaining_ms: number;
  response_count: number;
  participant_count: number;
  selected_option: number | null;
  option_counts: number[] | null;
  responses?: Array<{
    user_id: string;
    name: string;
    selected_option: number;
    submitted_at: string;
  }>;
}

export interface LivePollState {
  poll: LivePollDto | null;
}

export interface ClassroomCopilotResult {
  status: 'ok';
  summary: string;
  explanation: string;
  key_points: string[];
  misconception: string;
  check_question: string;
  poll: {
    question: string;
    options: string[];
    correct_index: number;
  };
  context: {
    resource_id: string;
    title: string;
    page: number;
    total_pages: number;
  };
}

export interface ClassroomAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  page: number;
  used_external_knowledge?: boolean;
}

export interface ClassroomAssistantResult {
  status: 'ok';
  answer: string;
  used_external_knowledge: boolean;
  suggested_questions: string[];
  context: {
    resource_id: string;
    title: string;
    page: number;
    total_pages: number;
    source_pages: number[];
  };
}

export type PdfTextBox = [number, number, number, number];

export interface PdfTextBlock {
  id: number;
  text: string;
  bbox: PdfTextBox;
}

export interface PdfTextWord {
  id: number;
  text: string;
  block_id: number;
  line: number;
  word: number;
  bbox: PdfTextBox;
}

export interface PdfTextGeometry {
  page: number;
  blocks: PdfTextBlock[];
  words: PdfTextWord[];
}

export interface PresentationState {
  is_moderator: boolean;
  resources: PresentationResource[];
  selected: Pick<LessonResourceDto, 'id' | 'kind' | 'title' | 'file' | 'external_url' | 'anatomy_model_detail' | 'preview_page_count' | 'preview_slide_urls'> | null;
  page: number;
  on_stage: boolean;
  stage: PresentationState['selected'];
  stage_page: number;
  stage_scroll: number;
  stage_annotations: PresentationAnnotation[];
  active_run: PresentationQuizRun | null;
  upcoming_quiz?: {
    quiz_id: string;
    title: string;
    trigger_mode: 'at_slide';
    starts_at: string;
    remaining_ms: number;
  } | null;
  last_automation?: {
    quiz_id: string;
    trigger_mode: 'after_resource' | 'at_minute' | 'at_slide';
    triggered_at: string;
  } | null;
}

export const classroomApi = {
  list: () => request<ClassroomDto[]>('/classrooms/'),

  get: (code: string) => request<ClassroomDto>(`/classrooms/${encodeURIComponent(code)}/`),

  update: (code: string, data: { name?: string; description?: string; is_archived?: boolean }) =>
    request<ClassroomDto>(`/classrooms/${encodeURIComponent(code)}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

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

  startSession: (code: string, resourceIds?: string[]) =>
    request<ClassroomDto>(`/classrooms/${encodeURIComponent(code)}/sessions/start/`, {
      method: 'POST',
      body: JSON.stringify(resourceIds === undefined ? {} : { resource_ids: resourceIds }),
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

  classroomCopilot: (code: string, context: { resourceId: string; page: number }) =>
    request<ClassroomCopilotResult>(`/classrooms/${encodeURIComponent(code)}/sessions/copilot/`, {
      method: 'POST',
      body: JSON.stringify({ resource_id: context.resourceId, page: context.page }),
    }),

  classroomAssistant: (code: string, data: { resourceId: string; page: number; question: string; history: ClassroomAssistantMessage[] }) =>
    request<ClassroomAssistantResult>(`/classrooms/${encodeURIComponent(code)}/sessions/assistant/`, {
      method: 'POST',
      body: JSON.stringify({
        resource_id: data.resourceId,
        page: data.page,
        question: data.question,
        history: data.history,
      }),
    }),

  pdfTextGeometry: (code: string, resourceId: string, page: number) =>
    request<PdfTextGeometry>(`/classrooms/${encodeURIComponent(code)}/sessions/presentation/pdf/${resourceId}/pages/${page}/text/`),

  whiteboardSnapshot: (code: string, context: { resourceId: string | null; page: number }) => {
    const query = new URLSearchParams({ page: String(context.page) });
    if (context.resourceId) query.set('resource_id', context.resourceId);
    return request<WhiteboardSnapshotDto>(`/classrooms/${encodeURIComponent(code)}/sessions/whiteboard/?${query}`);
  },

  saveWhiteboardSnapshot: (code: string, snapshot: { resourceId: string | null; page: number; strokes: WhiteboardStrokeDto[]; locked: boolean }) =>
    request<WhiteboardSnapshotDto>(`/classrooms/${encodeURIComponent(code)}/sessions/whiteboard/`, {
      method: 'PUT',
      body: JSON.stringify({
        resource_id: snapshot.resourceId,
        page: snapshot.page,
        strokes: snapshot.strokes,
        locked: snapshot.locked,
      }),
    }),

  poll: (code: string) =>
    request<LivePollState>(`/classrooms/${encodeURIComponent(code)}/sessions/poll/`),

  startPoll: (code: string, data: { question: string; options: string[]; duration_seconds: number; is_anonymous: boolean }) =>
    request<LivePollState>(`/classrooms/${encodeURIComponent(code)}/sessions/poll/`, {
      method: 'POST',
      body: JSON.stringify({ action: 'start', ...data }),
    }),

  answerPoll: (code: string, pollId: string, selectedOption: number) =>
    request<LivePollState>(`/classrooms/${encodeURIComponent(code)}/sessions/poll/`, {
      method: 'POST',
      body: JSON.stringify({ action: 'answer', poll_id: pollId, selected_option: selectedOption }),
    }),

  closePoll: (code: string, pollId: string) =>
    request<LivePollState>(`/classrooms/${encodeURIComponent(code)}/sessions/poll/`, {
      method: 'POST',
      body: JSON.stringify({ action: 'close', poll_id: pollId }),
    }),

  dismissPoll: (code: string, pollId: string) =>
    request<LivePollState>(`/classrooms/${encodeURIComponent(code)}/sessions/poll/`, {
      method: 'POST',
      body: JSON.stringify({ action: 'dismiss', poll_id: pollId }),
    }),

  quizReport: (code: string) =>
    request<QuizReport>(`/classrooms/${encodeURIComponent(code)}/sessions/quiz-report/`),

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

import { request } from '@/lib/api';

import type { SpacePurpose } from './space-data';

export interface LiveSessionDto {
  id: string;
  title: string;
  status: 'live' | 'ended';
  record: boolean;
  participant_count: number;
  started_at: string;
  ended_at: string | null;
  last_synced_at: string | null;
  mode: 'mock' | 'live';
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
    request<{ mode: 'mock' | 'live'; join_url: string | null }>(`/classrooms/${encodeURIComponent(code)}/sessions/join/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

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

  bbbStatus: () =>
    request<{
      mode: 'mock' | 'live';
      enabled: boolean;
      configured: boolean;
      reachable: boolean;
      detail: string;
    }>('/classrooms/bbb/status/'),
};

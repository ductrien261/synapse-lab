import type { RemoteParticipant } from 'livekit-client';
import type { WhiteboardStrokeDto } from './classroom-api';

export const WHITEBOARD_TOPIC = 'synapse.whiteboard.v1';
export const WHITEBOARD_COLORS = ['#2563EB', '#E11D48', '#059669', '#7C3AED', '#EA580C'] as const;

export type WhiteboardTool = 'cursor' | 'pen' | 'highlighter' | 'eraser';
export type WhiteboardPoint = [number, number];
export type WhiteboardStroke = WhiteboardStrokeDto;
export type WhiteboardPayload =
  | { type: 'stroke'; stroke: Omit<WhiteboardStroke, 'authorId' | 'authorName'> }
  | { type: 'snapshot_stroke'; stroke: WhiteboardStroke }
  | { type: 'remove'; strokeId: string }
  | { type: 'clear' }
  | { type: 'lock'; locked: boolean }
  | { type: 'present'; visible: boolean }
  | { type: 'cursor'; x: number; y: number; visible: boolean; color: string }
  | { type: 'sync_request' }
  | { type: 'sync_reset'; locked: boolean; visible: boolean };
export type WhiteboardMessage = WhiteboardPayload & { contextKey: string; sentAt: number };

export interface WhiteboardCursor {
  identity: string;
  name: string;
  x: number;
  y: number;
  color: string;
  updatedAt: number;
}

const decoder = new TextDecoder();

export function isWhiteboardModerator(participant: RemoteParticipant): boolean {
  try {
    const metadata: unknown = JSON.parse(participant.metadata || '{}');
    return Boolean(metadata && typeof metadata === 'object' && 'role' in metadata && (metadata as { role?: unknown }).role === 'moderator');
  } catch {
    return false;
  }
}

export function parseWhiteboardMessage(payload: Uint8Array): WhiteboardMessage | null {
  try {
    const value: unknown = JSON.parse(decoder.decode(payload));
    if (!value || typeof value !== 'object' || !('type' in value) || !('sentAt' in value)) return null;
    const message = value as WhiteboardMessage;
    if (typeof message.sentAt !== 'number' || typeof message.contextKey !== 'string' || !message.contextKey) return null;
    if (message.type === 'sync_request' || message.type === 'clear') return message;
    if (message.type === 'lock' && typeof message.locked === 'boolean') return message;
    if (message.type === 'present' && typeof message.visible === 'boolean') return message;
    if (message.type === 'sync_reset' && typeof message.locked === 'boolean' && typeof message.visible === 'boolean') return message;
    if (message.type === 'remove' && typeof message.strokeId === 'string') return message;
    if (message.type === 'cursor' && typeof message.x === 'number' && typeof message.y === 'number' && typeof message.visible === 'boolean' && typeof message.color === 'string') return message;
    if ((message.type === 'stroke' || message.type === 'snapshot_stroke') && message.stroke && typeof message.stroke.id === 'string' && (message.stroke.tool === 'pen' || message.stroke.tool === 'highlighter') && Array.isArray(message.stroke.points)) return message;
  } catch {
    return null;
  }
  return null;
}

export function whiteboardPath(points: WhiteboardPoint[]): string {
  return points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x * 1000} ${y * 700}`).join(' ');
}

export function toWireStroke(stroke: WhiteboardStroke): Omit<WhiteboardStroke, 'authorId' | 'authorName'> {
  return { id: stroke.id, tool: stroke.tool, color: stroke.color, points: stroke.points, createdAt: stroke.createdAt };
}

'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParticipants, useRoomContext } from '@livekit/components-react';
import { RemoteParticipant, RoomEvent } from 'livekit-client';
import {
  CheckCircleFill,
  PersonRaisedHand,
  QuestionCircleFill,
} from 'react-bootstrap-icons';

export const CLASSROOM_INTERACTION_TOPIC = 'synapse.classroom.interaction.v1';

type Understanding = 'understood' | 'unclear' | null;
type InteractionMessage =
  | { type: 'status'; handRaised: boolean; understanding: Understanding; sentAt: number }
  | { type: 'reaction'; id: string; emoji: string; sentAt: number }
  | { type: 'sync_request'; sentAt: number }
  | { type: 'reset'; scope: 'hands' | 'understanding' | 'all'; sentAt: number };

interface ParticipantSignal {
  identity: string;
  name: string;
  handRaised: boolean;
  understanding: Understanding;
  updatedAt: number;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  name: string;
}

const REACTIONS = ['👍', '👏', '❤️', '🎉', '❓'] as const;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function parseMessage(payload: Uint8Array): InteractionMessage | null {
  try {
    const value: unknown = JSON.parse(decoder.decode(payload));
    if (!value || typeof value !== 'object' || !('type' in value) || !('sentAt' in value)) return null;
    const message = value as Record<string, unknown>;
    if (typeof message.sentAt !== 'number') return null;
    if (message.type === 'sync_request') return { type: 'sync_request', sentAt: message.sentAt };
    if (message.type === 'reaction' && typeof message.id === 'string' && typeof message.emoji === 'string' && REACTIONS.includes(message.emoji as typeof REACTIONS[number])) {
      return { type: 'reaction', id: message.id, emoji: message.emoji, sentAt: message.sentAt };
    }
    if (message.type === 'status' && typeof message.handRaised === 'boolean' && (message.understanding === null || message.understanding === 'understood' || message.understanding === 'unclear')) {
      return { type: 'status', handRaised: message.handRaised, understanding: message.understanding, sentAt: message.sentAt };
    }
    if (message.type === 'reset' && (message.scope === 'hands' || message.scope === 'understanding' || message.scope === 'all')) {
      return { type: 'reset', scope: message.scope, sentAt: message.sentAt };
    }
  } catch {
    return null;
  }
  return null;
}

function isModeratorParticipant(participant: RemoteParticipant): boolean {
  try {
    if (!participant.metadata) return false;
    const metadata: unknown = JSON.parse(participant.metadata);
    return Boolean(metadata && typeof metadata === 'object' && 'role' in metadata && (metadata as { role?: unknown }).role === 'moderator');
  } catch {
    return false;
  }
}

export function RealtimeClassroomInteractions({ isModerator }: { isModerator: boolean }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const [controlBar, setControlBar] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [understanding, setUnderstanding] = useState<Understanding>(null);
  const [signals, setSignals] = useState<Record<string, ParticipantSignal>>({});
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [sendError, setSendError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ handRaised, understanding });
  const timeoutsRef = useRef<number[]>([]);
  const panelId = useId();

  useEffect(() => { stateRef.current = { handRaised, understanding }; }, [handRaised, understanding]);

  const participantNames = useMemo(() => Object.fromEntries(participants.map((participant) => [participant.identity, participant.name || participant.identity])), [participants]);

  const publish = useCallback(async (message: InteractionMessage, destinationIdentities?: string[]) => {
    await room.localParticipant.publishData(encoder.encode(JSON.stringify(message)), {
      reliable: message.type !== 'reaction',
      topic: CLASSROOM_INTERACTION_TOPIC,
      destinationIdentities,
    });
  }, [room]);

  const publishStatus = useCallback(async (nextHandRaised: boolean, nextUnderstanding: Understanding, destinationIdentities?: string[]) => {
    const sentAt = Date.now();
    setSignals((current) => ({
      ...current,
      [room.localParticipant.identity]: {
        identity: room.localParticipant.identity,
        name: room.localParticipant.name || room.localParticipant.identity,
        handRaised: nextHandRaised,
        understanding: nextUnderstanding,
        updatedAt: sentAt,
      },
    }));
    try {
      await publish({ type: 'status', handRaised: nextHandRaised, understanding: nextUnderstanding, sentAt }, destinationIdentities);
      setSendError('');
    } catch {
      setSendError('Chưa gửi được tín hiệu. Hãy thử lại.');
    }
  }, [publish, room.localParticipant]);

  const addFloatingReaction = useCallback((reaction: FloatingReaction) => {
    setFloatingReactions((current) => [...current.slice(-5), reaction]);
    const timeout = window.setTimeout(() => {
      setFloatingReactions((current) => current.filter((item) => item.id !== reaction.id));
    }, 2800);
    timeoutsRef.current.push(timeout);
  }, []);

  useEffect(() => {
    const findControlBar = () => {
      const target = document.querySelector<HTMLElement>('.lk-video-conference .lk-control-bar');
      if (target) {
        setControlBar(target);
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(findControlBar);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(findControlBar);
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  useEffect(() => {
    const receive = (payload: Uint8Array, participant?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      if (topic !== CLASSROOM_INTERACTION_TOPIC || !participant) return;
      const message = parseMessage(payload);
      if (!message) return;
      if (message.type === 'status') {
        setSignals((current) => ({
          ...current,
          [participant.identity]: {
            identity: participant.identity,
            name: participant.name || participant.identity,
            handRaised: message.handRaised,
            understanding: message.understanding,
            updatedAt: message.sentAt,
          },
        }));
        return;
      }
      if (message.type === 'reaction') {
        if (Date.now() - message.sentAt < 10_000) addFloatingReaction({ id: `${participant.identity}-${message.id}`, emoji: message.emoji, name: participant.name || participant.identity });
        return;
      }
      if (message.type === 'sync_request') {
        const local = stateRef.current;
        void publish({ type: 'status', handRaised: local.handRaised, understanding: local.understanding, sentAt: Date.now() }, [participant.identity]).catch(() => undefined);
        return;
      }
      if (message.type === 'reset') {
        if (!isModeratorParticipant(participant)) return;
        const nextHandRaised = message.scope === 'hands' || message.scope === 'all' ? false : stateRef.current.handRaised;
        const nextUnderstanding = message.scope === 'understanding' || message.scope === 'all' ? null : stateRef.current.understanding;
        stateRef.current = { handRaised: nextHandRaised, understanding: nextUnderstanding };
        setHandRaised(nextHandRaised);
        setUnderstanding(nextUnderstanding);
        setSignals((current) => {
          const next = { ...current };
          for (const identity of Object.keys(next)) {
            next[identity] = {
              ...next[identity],
              handRaised: message.scope === 'hands' || message.scope === 'all' ? false : next[identity].handRaised,
              understanding: message.scope === 'understanding' || message.scope === 'all' ? null : next[identity].understanding,
            };
          }
          return next;
        });
      }
    };
    const disconnected = (participant: RemoteParticipant) => {
      setSignals((current) => {
        const next = { ...current };
        delete next[participant.identity];
        return next;
      });
    };
    room.on(RoomEvent.DataReceived, receive);
    room.on(RoomEvent.ParticipantDisconnected, disconnected);
    void publish({ type: 'sync_request', sentAt: Date.now() }).catch(() => undefined);
    void publishStatus(stateRef.current.handRaised, stateRef.current.understanding);
    const activeTimeouts = timeoutsRef.current;
    return () => {
      room.off(RoomEvent.DataReceived, receive);
      room.off(RoomEvent.ParticipantDisconnected, disconnected);
      activeTimeouts.forEach(window.clearTimeout);
    };
  }, [addFloatingReaction, publish, publishStatus, room]);

  const changeHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    stateRef.current = { ...stateRef.current, handRaised: next };
    void publishStatus(next, understanding);
  };

  const changeUnderstanding = (next: Exclude<Understanding, null>) => {
    const value = understanding === next ? null : next;
    setUnderstanding(value);
    stateRef.current = { ...stateRef.current, understanding: value };
    void publishStatus(handRaised, value);
  };

  const sendReaction = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    addFloatingReaction({ id: `local-${id}`, emoji, name: room.localParticipant.name || 'Bạn' });
    void publish({ type: 'reaction', id, emoji, sentAt: Date.now() }).catch(() => setSendError('Chưa gửi được cảm xúc.'));
  }, [addFloatingReaction, publish, room.localParticipant.name]);

  const reset = (scope: 'hands' | 'understanding' | 'all') => {
    if (!isModerator) return;
    setSignals((current) => Object.fromEntries(Object.entries(current).map(([identity, signal]) => [identity, {
      ...signal,
      handRaised: scope === 'hands' || scope === 'all' ? false : signal.handRaised,
      understanding: scope === 'understanding' || scope === 'all' ? null : signal.understanding,
    }])));
    void publish({ type: 'reset', scope, sentAt: Date.now() }).catch(() => setSendError('Chưa gửi được lệnh đặt lại.'));
  };

  const learnerSignals = Object.values(signals).filter((signal) => !isModerator || signal.identity !== room.localParticipant.identity);
  const raised = learnerSignals.filter((signal) => signal.handRaised);
  const understoodCount = learnerSignals.filter((signal) => signal.understanding === 'understood').length;
  const unclearCount = learnerSignals.filter((signal) => signal.understanding === 'unclear').length;
  const onlineLearners = Math.max(0, participants.length - (isModerator ? 1 : 0));

  const toolbar = controlBar ? createPortal(<div ref={panelRef} className="synapse-utility-actions relative shrink-0">
    <button type="button" aria-label="Tương tác lớp học" title="Tương tác lớp học" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className={`lk-button synapse-utility-button !px-3 ${handRaised || understanding ? '!bg-violet-700 !text-white' : ''}`}>
      <PersonRaisedHand size={20} aria-hidden="true" />
      {isModerator && raised.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{raised.length}</span>}
    </button>
    {open && <aside id={panelId} role="dialog" aria-label="Tương tác lớp học" className="absolute bottom-[calc(100%+12px)] right-0 z-50 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_24px_64px_-16px_rgba(15,34,88,0.45)]">
      <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-[#0F2258]">Tương tác realtime</p><p className="text-[11px] text-slate-500">{onlineLearners} học viên đang ở trong phòng</p></div>{isModerator && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">GIÁO VIÊN</span>}</div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" aria-pressed={handRaised} onClick={changeHand} className={`rounded-xl border px-2 py-3 text-center text-xs font-semibold ${handRaised ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 hover:bg-slate-50'}`}><PersonRaisedHand className="mx-auto mb-1" size={20} />{handRaised ? 'Hạ tay' : 'Giơ tay'}</button>
        <button type="button" aria-pressed={understanding === 'understood'} onClick={() => changeUnderstanding('understood')} className={`rounded-xl border px-2 py-3 text-center text-xs font-semibold ${understanding === 'understood' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'}`}><CheckCircleFill className="mx-auto mb-1" size={18} />Đã hiểu</button>
        <button type="button" aria-pressed={understanding === 'unclear'} onClick={() => changeUnderstanding('unclear')} className={`rounded-xl border px-2 py-3 text-center text-xs font-semibold ${understanding === 'unclear' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 hover:bg-slate-50'}`}><QuestionCircleFill className="mx-auto mb-1" size={18} />Chưa rõ</button>
      </div>
      <div className="mt-3"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Phản ứng nhanh</p><div className="grid grid-cols-5 gap-2">{REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => sendReaction(emoji)} className="rounded-lg border border-slate-200 py-2 text-xl hover:-translate-y-0.5 hover:bg-slate-50" aria-label={`Gửi ${emoji}`}>{emoji}</button>)}</div></div>
      {isModerator && <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-amber-50 p-2"><strong className="block text-lg text-amber-700">{raised.length}</strong><span className="text-[10px] text-amber-800">Giơ tay</span></div><div className="rounded-lg bg-emerald-50 p-2"><strong className="block text-lg text-emerald-700">{understoodCount}</strong><span className="text-[10px] text-emerald-800">Đã hiểu</span></div><div className="rounded-lg bg-rose-50 p-2"><strong className="block text-lg text-rose-700">{unclearCount}</strong><span className="text-[10px] text-rose-800">Chưa rõ</span></div></div>
        {raised.length > 0 && <div className="mt-3 max-h-28 overflow-y-auto rounded-lg bg-slate-50 p-2"><p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Đang giơ tay</p>{raised.map((signal) => <p key={signal.identity} className="truncate py-1 text-xs font-semibold text-slate-700">✋ {participantNames[signal.identity] || signal.name}</p>)}</div>}
        <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => reset('hands')} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold hover:bg-slate-50">Hạ tất cả tay</button><button type="button" onClick={() => reset('understanding')} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold hover:bg-slate-50">Xóa tín hiệu</button></div>
      </div>}
      {sendError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700">{sendError}</p>}
    </aside>}
  </div>, controlBar) : null;

  return <>
    {toolbar}
    <div className="pointer-events-none absolute inset-x-0 top-16 z-40 flex flex-col items-center gap-2" aria-live="polite">{floatingReactions.map((reaction) => <div key={reaction.id} className="synapse-floating-reaction rounded-full border border-white/20 bg-slate-950/85 px-4 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur"><span className="mr-2 text-xl">{reaction.emoji}</span>{reaction.name}</div>)}</div>
  </>;
}

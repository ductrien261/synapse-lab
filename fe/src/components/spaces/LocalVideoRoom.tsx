'use client';

import '@livekit/components-styles';
import './local-video-room.css';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { classroomApi, type AnnotationTool, type PresentationState } from './classroom-api';
import { ClassroomAiPanel } from './ClassroomAiPanel';
import { LocalPresentationPanel } from './LocalPresentationPanel';
import { LocalPresentationStage } from './LocalPresentationStage';
import { InteractionToolbar } from './InteractionToolbar';
import { RealtimeClassroomInteractions } from './RealtimeClassroomInteractions';
import { CollaborativeWhiteboard } from './CollaborativeWhiteboard';
import { RealtimePoll } from './RealtimePoll';

type VideoConnection = { url: string; token: string };

export function LocalVideoRoom({ roomCode }: { roomCode: string }) {
  const [connection, setConnection] = useState<VideoConnection | null>(null);
  const [error, setError] = useState('');
  const [deviceWarning, setDeviceWarning] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [hasFocusLayout, setHasFocusLayout] = useState(false);
  const [participantsCollapsed, setParticipantsCollapsed] = useState(false);
  const [whiteboardVisible, setWhiteboardVisible] = useState(false);
  const [isModerator, setIsModerator] = useState<boolean | null>(null);
  const [presentation, setPresentation] = useState<PresentationState | null>(null);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('none');
  const annotationStageIdRef = useRef<string | null>(null);
  const classroomUrl = `/spaces/${encodeURIComponent(roomCode)}`;
  const openPanel = useCallback(() => { setAiOpen(false); setPanelOpen(true); }, []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const updatePresentation = useCallback((next: PresentationState) => {
    setPresentation(next);
    const stageId = next.on_stage && next.stage?.kind === 'pdf' ? next.stage.id : null;
    if (annotationStageIdRef.current !== stageId) setAnnotationTool('none');
    annotationStageIdRef.current = stageId;
  }, []);

  useEffect(() => {
    let active = true;
    classroomApi.videoToken(roomCode)
      .then((result) => { if (active) setConnection(result); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Không thể vào phòng video.');
      });
    return () => { active = false; };
  }, [roomCode]);

  useEffect(() => {
    let active = true;
    classroomApi.get(roomCode).then((classroom) => {
      if (active) setIsModerator(classroom.is_owner);
    }).catch(() => { if (active) setIsModerator(false); });
    return () => { active = false; };
  }, [roomCode]);

  useEffect(() => {
    if (!connection) return;
    const room = document.querySelector('.synapse-video-room');
    if (!room) return;
    const update = () => setHasFocusLayout(Boolean(room.querySelector('.lk-focus-layout')));
    const observer = new MutationObserver(update);
    observer.observe(room, { childList: true, subtree: true });
    update();
    return () => observer.disconnect();
  }, [connection]);

  if (error || !connection) {
    return <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-[#0F172A] p-6 text-center text-white">
      <div>
        <h1 className="text-xl font-bold">{error ? 'Chưa kết nối được phòng video' : 'Đang vào phòng video…'}</h1>
        {error && <p className="mt-3 max-w-md text-sm text-stone-300">{error}</p>}
        {error && <Link href={classroomUrl} className="mt-5 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1E3F82]">Quay lại lớp</Link>}
      </div>
    </main>;
  }

  return <main className="synapse-video-room flex h-[calc(100dvh-4rem)] min-h-[520px] flex-col bg-[#0F172A] text-white">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-5 py-3">
      <div><h1 className="text-sm font-bold">Phòng video Synapse</h1><p className="text-xs text-white/60">Mã lớp: {roomCode} · Bật mic/camera ở thanh điều khiển khi cần</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" aria-expanded={aiOpen} aria-controls="classroom-ai-panel" onClick={() => { setPanelOpen(false); setAiOpen((value) => !value); }} className="rounded-lg border border-violet-300/50 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">⚡ Kịch bản lớp học</button><button type="button" onClick={() => { setAiOpen(false); setPanelOpen((value) => !value); }} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#1E3F82]">Nội dung đã soạn</button><Link href={classroomUrl} onClick={() => { void classroomApi.leaveSession(roomCode); }} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10">Về bài dạy</Link></div>
    </header>
    {deviceWarning && <p role="alert" className="bg-amber-50 px-5 py-2 text-sm text-amber-900">{deviceWarning}</p>}
    <LiveKitRoom
      className="flex min-h-0 flex-1 flex-col"
      data-lk-theme="default"
      serverUrl={connection.url}
      token={connection.token}
      connect
      onError={(reason) => {
        if (reason.name === 'NotFoundError' || reason.message.includes('Requested device not found')) {
          setDeviceWarning('Máy chưa tìm thấy mic/camera. Bạn vẫn ở trong phòng; hãy kiểm tra thiết bị hoặc chọn thiết bị khác trong thanh điều khiển.');
          return;
        }
        setError(`Không thể kết nối LiveKit: ${reason.message}`);
      }}
      onMediaDeviceFailure={() => setDeviceWarning('Không bật được mic/camera. Hãy kiểm tra thiết bị và quyền truy cập trong trình duyệt.')}
      onDisconnected={() => {
        void classroomApi.leaveSession(roomCode);
        setError((current) => current || 'Bạn đã rời phòng video.');
      }}
    >
      <div className="relative h-full min-h-0 w-full flex-1 overflow-hidden" data-participants-collapsed={participantsCollapsed} data-presentation-active={Boolean(presentation?.on_stage && presentation.stage)} data-whiteboard-active={whiteboardVisible}>
        <VideoConference />
        {presentation?.on_stage && presentation.stage && <LocalPresentationStage roomCode={roomCode} state={presentation} onStateChange={updatePresentation} onOpenPanel={openPanel} annotationTool={annotationTool} />}
        {hasFocusLayout && <button
          type="button"
          aria-expanded={!participantsCollapsed}
          aria-label={participantsCollapsed ? 'Hiện người tham gia' : 'Thu gọn người tham gia'}
          title={participantsCollapsed ? 'Hiện người tham gia' : 'Thu gọn người tham gia'}
          onClick={() => setParticipantsCollapsed((value) => !value)}
          className="synapse-participants-toggle"
        >
          {participantsCollapsed ? <ChevronLeft size={19} aria-hidden="true" /> : <ChevronRight size={19} aria-hidden="true" />}
        </button>}
        {isModerator !== null && <InteractionToolbar isModerator={isModerator} roomCode={roomCode} presentation={presentation} onPresentationChange={updatePresentation} annotationTool={annotationTool} onAnnotationToolChange={setAnnotationTool} />}
        {isModerator !== null && <RealtimeClassroomInteractions isModerator={isModerator} />}
        {isModerator !== null && <CollaborativeWhiteboard roomCode={roomCode} isModerator={isModerator} presentation={presentation} onVisibilityChange={setWhiteboardVisible} />}
        {isModerator !== null && <RealtimePoll roomCode={roomCode} isModerator={isModerator} />}
        <LocalPresentationPanel roomCode={roomCode} open={panelOpen} onClose={closePanel} onStateChange={updatePresentation} />
        {aiOpen && <ClassroomAiPanel roomCode={roomCode} open onClose={() => setAiOpen(false)} />}
      </div>
    </LiveKitRoom>
  </main>;
}

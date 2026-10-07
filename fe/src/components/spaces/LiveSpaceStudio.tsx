'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BoxArrowLeft,
  Broadcast,
  ChatDots,
  Check2,
  Clipboard,
  Fullscreen,
  Gear,
  PeopleFill,
  PersonPlusFill,
  PersonVideo3,
} from 'react-bootstrap-icons';
import { StudioActivity } from './StudioActivity';
import { StudioAgenda } from './StudioAgenda';
import { StudioCanvas } from './StudioCanvas';
import { classroomApi, type ClassroomDto } from './classroom-api';

export function LiveSpaceStudio({ roomCode: rawRoomCode, roomName: rawRoomName }: { roomCode: string; roomName?: string }) {
  const router = useRouter();
  const roomCode = String(rawRoomCode || 'BFS204').toUpperCase();
  const [classroom, setClassroom] = useState<ClassroomDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [message, setMessage] = useState('');
  const [activeStep, setActiveStep] = useState(2);
  const [activeTool, setActiveTool] = useState('Bảng');
  const [copied, setCopied] = useState(false);
  const roomName = classroom?.name || rawRoomName || 'Không gian học tập';
  const activeSession = classroom?.active_session;
  const roleLabel = classroom?.is_owner ? 'Chủ phòng' : 'Thành viên';
  const sessionHint = loading
    ? 'Đang tải trạng thái phòng...'
    : !activeSession
      ? classroom?.is_owner
        ? 'Bước 1: Bấm “Bắt đầu” để mở phiên học. Sau đó cả hai tài khoản bấm “Vào phòng”.'
        : 'Đang chờ chủ phòng bắt đầu phiên học. Trạng thái được cập nhật tự động sau tối đa 5 giây.'
      : activeSession.current_user_joined
        ? `Bạn đang tham gia phiên ${activeSession.mode === 'mock' ? 'mô phỏng' : 'BigBlueButton'}.`
        : 'Phiên học đã bắt đầu. Bấm “Vào phòng” để được tính là đang tham gia.';

  useEffect(() => {
    let active = true;
    const loadClassroom = (initial = false) => {
      classroomApi.get(roomCode)
        .then((result) => {
          if (active) setClassroom(result);
        })
        .catch((reason: unknown) => {
          if (active && initial) setMessage(reason instanceof Error ? reason.message : 'Không thể tải không gian.');
        })
        .finally(() => {
          if (active && initial) setLoading(false);
        });
    };
    loadClassroom(true);
    const timer = window.setInterval(() => loadClassroom(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [roomCode]);

  const copyCode = async () => {
    await navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const startSession = async () => {
    setActionPending(true);
    setMessage('');
    try {
      const updated = await classroomApi.startSession(roomCode);
      setClassroom(updated);
      setMessage(updated.active_session?.mode === 'mock' ? 'Phòng mô phỏng đã bắt đầu trên máy Windows.' : 'Buổi học đã bắt đầu.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể bắt đầu buổi học.');
    } finally {
      setActionPending(false);
    }
  };

  const joinSession = async () => {
    setActionPending(true);
    setMessage('');
    try {
      const result = await classroomApi.joinSession(roomCode);
      if (result.join_url) {
        window.location.assign(result.join_url);
        return;
      }
      setClassroom(await classroomApi.get(roomCode));
      setMessage('Bạn đang ở trong phòng mô phỏng. Khi cấu hình BBB thật, nút này sẽ mở phòng video.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể tham gia buổi học.');
    } finally {
      setActionPending(false);
    }
  };

  const leaveSession = async () => {
    setActionPending(true);
    try {
      await classroomApi.leaveSession(roomCode);
      router.push('/spaces');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể rời buổi học.');
      setActionPending(false);
    }
  };

  const endSession = async () => {
    setActionPending(true);
    setMessage('');
    try {
      await classroomApi.endSession(roomCode);
      setClassroom((current) => current ? { ...current, active_session: null } : current);
      setMessage('Buổi học đã kết thúc.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể kết thúc buổi học.');
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-80px)] flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm sm:rounded-2xl xl:h-[calc(100dvh-88px)] xl:min-h-0">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/spaces" aria-label="Quay lại Không gian" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50 hover:text-[#1E3F82]"><BoxArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-extrabold text-stone-900">{roomName}</h1>
              {classroom && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${classroom.is_owner ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>{roleLabel}</span>}
              {activeSession && <span className="hidden rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-rose-600 sm:inline"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />Trực tiếp</span>}
            </div>
            <button type="button" onClick={copyCode} className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 hover:text-[#1E3F82]">
              Mã phòng: <span className="font-extrabold tracking-wider text-[#1E3F82]">{roomCode}</span> {copied ? <Check2 className="h-3 w-3 text-emerald-600" /> : <Clipboard className="h-3 w-3" />}
            </button>
          </div>
        </div>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-[#F4F7FC] p-1 xl:order-2 xl:w-auto" aria-label="Công cụ không gian">
          {['Slide', 'Bảng', 'Thuật toán', 'Biểu đồ', 'Tài liệu'].map((tool) => (
            <button type="button" key={tool} onClick={() => setActiveTool(tool)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${activeTool === tool ? 'bg-[#1E3F82] text-white shadow-sm' : 'text-stone-500 hover:bg-white hover:text-stone-800'}`}>{tool}</button>
          ))}
        </nav>

        <div className="order-2 flex items-center gap-2 xl:order-3">
          <span className="hidden text-[11px] font-semibold text-stone-500 sm:inline">{classroom?.member_count ?? 0} thành viên</span>
          {classroom?.is_owner && !activeSession && <button type="button" disabled={actionPending || loading} onClick={startSession} className="flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Broadcast className="h-3.5 w-3.5" />Bắt đầu</button>}
          {activeSession && <button type="button" disabled={actionPending} onClick={joinSession} className="flex h-9 items-center gap-2 rounded-xl bg-[#1E3F82] px-3 text-xs font-bold text-white hover:bg-[#163070] disabled:opacity-50"><PersonVideo3 className="h-3.5 w-3.5" />Vào phòng</button>}
          <button type="button" onClick={copyCode} className="flex h-9 items-center gap-2 rounded-xl bg-[#E8F0FB] px-3 text-xs font-bold text-[#1E3F82] hover:bg-[#D5E4F7]"><PersonPlusFill className="h-3.5 w-3.5" /><span className="hidden sm:inline">Mời</span></button>
          <button type="button" aria-label="Toàn màn hình" className="hidden h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 lg:flex"><Fullscreen className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Cài đặt phòng" className="hidden h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 lg:flex"><Gear className="h-3.5 w-3.5" /></button>
        </div>
      </header>

      {message && <div className="border-b border-[#D9E6FA] bg-[#EEF4FF] px-4 py-2 text-xs font-semibold text-[#1E3F82]">{message}</div>}
      <div className={`flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold ${activeSession?.current_user_joined ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : activeSession ? 'border-blue-100 bg-blue-50 text-blue-800' : 'border-amber-100 bg-amber-50 text-amber-800'}`}>
        <span className={`h-2 w-2 shrink-0 rounded-full ${activeSession?.current_user_joined ? 'bg-emerald-500' : activeSession ? 'bg-blue-500' : 'bg-amber-500'}`} />
        <span>{sessionHint}</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[230px_minmax(0,1fr)_290px]">
        <StudioAgenda activeStep={activeStep} onSelect={setActiveStep} />
        <StudioCanvas activeTool={activeTool} activeStep={activeStep} />
        <StudioActivity />
      </div>

      <footer className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-white px-4 py-2 text-[11px]">
        <div className="flex items-center gap-2 text-stone-500"><Broadcast className={`h-3 w-3 ${activeSession ? 'text-rose-500' : 'text-stone-400'}`} /><span className={activeSession ? 'font-bold text-rose-600' : 'font-bold text-stone-500'}>{activeSession ? (activeSession.mode === 'mock' ? 'Mô phỏng đang chạy' : 'Đang trực tiếp') : 'Chưa bắt đầu'}</span></div>
        <div className="flex items-center gap-4 text-stone-500"><span className="flex items-center gap-1.5"><PeopleFill className="h-3 w-3" /> {activeSession ? activeSession.participant_count : classroom?.member_count ?? 0} {activeSession ? 'đang tham gia' : 'thành viên'}</span><span className="flex items-center gap-1.5"><ChatDots className="h-3 w-3" /> Không gian cộng tác</span></div>
        {classroom?.is_owner && activeSession ? (
          <button type="button" disabled={actionPending} onClick={endSession} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50">Kết thúc</button>
        ) : activeSession?.current_user_joined ? (
          <button type="button" disabled={actionPending} onClick={leaveSession} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-50">Rời phòng</button>
        ) : (
          <Link href="/spaces" className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-bold text-stone-600 hover:bg-stone-50">Rời phòng</Link>
        )}
      </footer>
    </div>
  );
}

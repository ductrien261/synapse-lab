'use client';

import Link from 'next/link';
import { useState } from 'react';
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
} from 'react-bootstrap-icons';
import { StudioActivity } from './StudioActivity';
import { StudioAgenda } from './StudioAgenda';
import { StudioCanvas } from './StudioCanvas';

export function LiveSpaceStudio({ roomCode: rawRoomCode, roomName: rawRoomName }: { roomCode: string; roomName?: string }) {
  const roomCode = String(rawRoomCode || 'BFS204').toUpperCase();
  const roomName = rawRoomName || (roomCode === 'BFS204' ? 'Ôn tập BFS & DFS' : 'Không gian mới');
  const [activeStep, setActiveStep] = useState(2);
  const [activeTool, setActiveTool] = useState('Bảng');
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex min-h-[calc(100dvh-88px)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm xl:h-[calc(100dvh-88px)] xl:min-h-0">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/spaces" aria-label="Quay lại Không gian" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50 hover:text-[#1E3F82]"><BoxArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-extrabold text-stone-900">{roomName}</h1>
              <span className="hidden rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-rose-600 sm:inline"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />Trực tiếp</span>
            </div>
            <button type="button" onClick={copyCode} className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 hover:text-[#1E3F82]">
              Mã phòng: <span className="font-extrabold tracking-wider text-[#1E3F82]">{roomCode}</span> {copied ? <Check2 className="h-3 w-3 text-emerald-600" /> : <Clipboard className="h-3 w-3" />}
            </button>
          </div>
        </div>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-[#F4F7FC] p-1 md:order-2 md:w-auto" aria-label="Công cụ không gian">
          {['Slide', 'Bảng', 'Thuật toán', 'Biểu đồ', 'Tài liệu'].map((tool) => (
            <button type="button" key={tool} onClick={() => setActiveTool(tool)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${activeTool === tool ? 'bg-[#1E3F82] text-white shadow-sm' : 'text-stone-500 hover:bg-white hover:text-stone-800'}`}>{tool}</button>
          ))}
        </nav>

        <div className="order-2 flex items-center gap-2 md:order-3">
          <div className="hidden -space-x-2 sm:flex">
            {['AN', 'BM', 'LT'].map((initials, index) => <span key={initials} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[9px] font-extrabold ${['bg-[#DDE9FB] text-[#1E3F82]', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700'][index]}`}>{initials}</span>)}
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-stone-100 text-[9px] font-bold text-stone-500">+3</span>
          </div>
          <button type="button" className="flex h-9 items-center gap-2 rounded-xl bg-[#E8F0FB] px-3 text-xs font-bold text-[#1E3F82] hover:bg-[#D5E4F7]"><PersonPlusFill className="h-3.5 w-3.5" /><span className="hidden sm:inline">Mời</span></button>
          <button type="button" aria-label="Toàn màn hình" className="hidden h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 lg:flex"><Fullscreen className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Cài đặt phòng" className="hidden h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 lg:flex"><Gear className="h-3.5 w-3.5" /></button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[230px_minmax(0,1fr)_290px]">
        <StudioAgenda activeStep={activeStep} onSelect={setActiveStep} />
        <StudioCanvas activeTool={activeTool} activeStep={activeStep} />
        <StudioActivity />
      </div>

      <footer className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-white px-4 py-2 text-[11px]">
        <div className="flex items-center gap-2 text-stone-500"><Broadcast className="h-3 w-3 text-rose-500" /><span className="font-bold text-rose-600">Đang trực tiếp</span><span>·</span><span>18:24</span></div>
        <div className="flex items-center gap-4 text-stone-500"><span className="flex items-center gap-1.5"><PeopleFill className="h-3 w-3" /> 6 người</span><span className="flex items-center gap-1.5"><ChatDots className="h-3 w-3" /> 18 trao đổi</span></div>
        <button type="button" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 font-bold text-rose-600 hover:bg-rose-100">Rời phòng</button>
      </footer>
    </div>
  );
}

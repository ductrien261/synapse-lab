import React from "react";

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-stone-200/80 px-6 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Brand Logo & Tag */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white font-bold text-base shadow-xs">
          S
        </div>
        <span className="font-bold text-lg tracking-tight text-[var(--primary)] font-[family-name:var(--font-headline)]">
          SYNAPSE
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAF3B2] text-[#344015] font-semibold border border-[#D8E4AB]">
          Dual Core
        </span>
      </div>

      {/* Right User & Notification Area */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button 
          title="Thông báo"
          className="relative w-9 h-9 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-stone-200/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3D568F] to-[#9FBAF1] flex items-center justify-center text-white font-bold text-xs ring-2 ring-[#EAF3B2]">
            LM
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-stone-800 leading-none font-[family-name:var(--font-headline)]">
              Lê Minh
            </div>
            <div className="text-[10px] text-stone-500 font-mono mt-1">
              SV ĐH Y Dược / Bách Khoa
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

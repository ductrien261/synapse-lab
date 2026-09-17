import React from "react";
import {
  Search,
  ArrowCounterclockwise,
  Grid3x3GapFill,
  HeartPulseFill,
  CpuFill,
  Sliders,
} from "react-bootstrap-icons";

interface Props {
  activeTab: "all" | "med" | "cs";
  onTabChange: (tab: "all" | "med" | "cs") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedLevel: string;
  onLevelChange: (lvl: string) => void;
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
  onReset: () => void;
  counts: { all: number; med: number; cs: number };
}

export function FilterSection({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  selectedLevel,
  onLevelChange,
  selectedTag,
  onTagClick,
  onReset,
  counts,
}: Props) {
  const quickTags = [
    "Giải phẫu tim",
    "Cây đỏ đen AVL",
    "Hệ thần kinh",
    "Quy hoạch động",
    "Dijkstra đồ thị",
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Sleek Unified Control Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-2.5 sm:p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
        {/* Category Segmented Controls */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#F4F6F9] rounded-2xl border border-stone-200/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => onTabChange("all")}
            className={`group relative px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer flex items-center gap-2.5 shrink-0 ${
              activeTab === "all"
                ? "bg-[#3D568F] text-white shadow-md shadow-[#3D568F]/20"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
            }`}
          >
            <span
              className={`shrink-0 transition-colors ${
                activeTab === "all" ? "text-[#EAF3B2]" : "text-stone-500 group-hover:text-[#3D568F]"
              }`}
            >
              <Grid3x3GapFill className="w-[18px] h-[18px]" />
            </span>
            <span>Tất cả</span>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === "all" ? "bg-white/20 text-white" : "bg-stone-200 text-stone-600"
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("med")}
            className={`group relative px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer flex items-center gap-2.5 shrink-0 ${
              activeTab === "med"
                ? "bg-[#3D568F] text-white shadow-md shadow-[#3D568F]/20"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
            }`}
          >
            <span
              className={`shrink-0 transition-colors ${
                activeTab === "med" ? "text-[#EAF3B2]" : "text-stone-500 group-hover:text-[#3D568F]"
              }`}
            >
              <HeartPulseFill className="w-[18px] h-[18px]" />
            </span>
            <span>Y Khoa & Sinh Học</span>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === "med" ? "bg-white/20 text-white" : "bg-stone-200 text-stone-600"
              }`}
            >
              {counts.med}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("cs")}
            className={`group relative px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer flex items-center gap-2.5 shrink-0 ${
              activeTab === "cs"
                ? "bg-[#3D568F] text-white shadow-md shadow-[#3D568F]/20"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
            }`}
          >
            <span
              className={`shrink-0 transition-colors ${
                activeTab === "cs" ? "text-[#EAF3B2]" : "text-stone-500 group-hover:text-[#3D568F]"
              }`}
            >
              <CpuFill className="w-[18px] h-[18px]" />
            </span>
            <span>KH Máy Tính & Thuật Toán</span>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === "cs" ? "bg-white/20 text-white" : "bg-stone-200 text-stone-600"
              }`}
            >
              {counts.cs}
            </span>
          </button>
        </div>

        {/* Search & Level Filter */}
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm môn học, mã HP, thuật toán..."
              className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl bg-[#F8FAFC] border border-stone-200 text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:border-[#3D568F] focus:bg-white focus:ring-2 focus:ring-[#3D568F]/10 transition-all font-sans"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={selectedLevel}
              onChange={(e) => onLevelChange(e.target.value)}
              className="pl-9 pr-8 py-2.5 text-sm rounded-xl bg-[#F8FAFC] border border-stone-200 text-stone-700 font-semibold focus:outline-hidden focus:border-[#3D568F] focus:bg-white transition-all cursor-pointer font-sans appearance-none"
            >
              <option value="all">Mọi cấp độ</option>
              <option value="Cơ sở">Cơ sở</option>
              <option value="Trung cấp">Trung cấp</option>
              <option value="Nâng cao">Nâng cao</option>
            </select>
            <Sliders className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <svg
              className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
            </svg>
          </div>

          <button
            type="button"
            onClick={onReset}
            title="Đặt lại bộ lọc"
            className="w-10 h-10 rounded-xl border border-stone-200 bg-[#F8FAFC] hover:bg-white hover:border-[#3D568F]/40 text-stone-500 hover:text-[#3D568F] flex items-center justify-center transition-all cursor-pointer shrink-0 group shadow-2xs"
          >
            <ArrowCounterclockwise className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-180" />
          </button>
        </div>
      </div>

      {/* 3. Prominent & Animated Quick Suggestion Chips */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 px-1 pt-1">
        <div className="inline-flex items-center px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#3D568F]/10 via-[#9FBAF1]/15 to-[#EAF3B2]/30 border border-[#3D568F]/20 text-[#243355] text-xs font-bold font-[family-name:var(--font-headline)] shadow-xs shrink-0 select-none tracking-wider uppercase">
          Chủ đề tìm nhanh:
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {quickTags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick(tag)}
                className={`group relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-[#3D568F] text-white shadow-md shadow-[#3D568F]/25 border border-[#3D568F] ring-2 ring-[#EAF3B2] -translate-y-0.5 scale-105"
                    : "bg-white text-stone-700 hover:text-[#3D568F] hover:bg-gradient-to-r hover:from-white hover:to-[#EAF3B2]/30 hover:border-[#3D568F]/50 border border-stone-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                }`}
              >
                <span
                  className={`font-mono text-xs font-bold transition-colors ${
                    isSelected ? "text-[#EAF3B2]" : "text-stone-400 group-hover:text-[#3D568F]"
                  }`}
                >
                  #
                </span>
                <span>{tag}</span>
                {isSelected && (
                  <span
                    className="ml-1 text-[11px] leading-none text-white/80 hover:text-white bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                    title="Bỏ chọn"
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

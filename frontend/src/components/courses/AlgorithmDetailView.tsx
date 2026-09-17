import React, { useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  PlayFill,
  CheckCircleFill,
  ClockHistory,
  BoxSeam,
  LightningChargeFill,
  Download,
  BoxArrowUpRight,
  CodeSlash,
  EyeFill,
} from "react-bootstrap-icons";
import { GREEDY_LESSONS_DATA, GreedyLesson } from "@/data/curriculum";

interface Props {
  onBack: () => void;
  onOpenSimulation?: (lessonId: string) => void;
}

export function AlgorithmDetailView({ onBack, onOpenSimulation }: Props) {
  const [filterTab, setFilterTab] = useState<"all" | "completed" | "todo">("all");

  const totalLessons = GREEDY_LESSONS_DATA.length;
  const completedLessons = GREEDY_LESSONS_DATA.filter((l) => l.status === "completed").length;
  const inProgressLessons = GREEDY_LESSONS_DATA.filter((l) => l.status === "in-progress").length;
  const progressPercent = Math.round((completedLessons / totalLessons) * 100);

  // Filter lessons based on status
  const displayedLessons = GREEDY_LESSONS_DATA.filter((lesson) => {
    if (filterTab === "completed") return lesson.status === "completed";
    if (filterTab === "todo") return lesson.status !== "completed";
    return true;
  });

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-16">
      {/* 1. Top Breadcrumbs & Back Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
          <button
            type="button"
            onClick={onBack}
            className="hover:text-[#3D568F] transition-colors flex items-center gap-1 font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Khóa học</span>
          </button>
          <span>/</span>
          <span className="text-stone-600">Khoa Học Máy Tính</span>
          <span>/</span>
          <span className="text-stone-900 font-bold">Thuật Toán Tham Lam (Greedy)</span>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-stone-300"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Quay lại danh mục</span>
        </button>
      </div>

      {/* 2. Course Hero Banner Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#EAF3B2]/30 via-[#9FBAF1]/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF3B2]/60 text-[#243355] text-xs font-mono font-bold mb-3 border border-[#D9E69B]">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              CHUYÊN ĐỀ CAO CẤP • CS-GREEDY
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-stone-900 font-[family-name:var(--font-headline)] leading-tight tracking-tight">
              Thuật Toán Tham Lam (Greedy Algorithms) & Bản Đồ Ứng Dụng
            </h1>

            <p className="text-xs sm:text-sm text-stone-500 font-[family-name:var(--font-body)] mt-2 leading-relaxed max-w-2xl">
              Tổng hợp 10 dạng bài tập tham lam kinh điển từ chọn hoạt động, nén dữ liệu, cây khung nhỏ nhất đến đồ thị và các bài toán tối ưu cực trị.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-stone-500 mt-3.5">
              <span className="px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 font-bold border border-stone-200">
                10 Bài học trọng tâm
              </span>
              <span>•</span>
              <span className="text-stone-700 font-medium">Mô phỏng 2D/3D Canvas</span>
              <span>•</span>
              <span className="text-stone-700 font-medium">Kiểm thử Testcase tự động</span>
              <span>•</span>
              <span className="text-amber-600 font-bold">★ 4.9/5.0 (1,420 sinh viên)</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenSimulation?.("lesson-06")}
              className="px-5 py-3 rounded-2xl bg-[#3D568F] hover:bg-[#2F4371] text-white text-xs font-extrabold shadow-lg shadow-[#3D568F]/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlayFill className="w-4 h-4" />
              <span>Tiếp tục học ngay</span>
            </button>
            <button
              type="button"
              title="Lưu vào danh sách"
              className="w-12 h-12 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-white text-stone-600 hover:text-[#3D568F] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Course Progress Strip */}
        <div className="mt-6 pt-5 border-t border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <div className="flex items-center justify-between text-xs font-mono text-stone-600 mb-2">
              <span className="font-bold">
                TIẾN ĐỘ CHUYÊN ĐỀ: {completedLessons}/{totalLessons} BÀI HỌC HOÀN THÀNH
              </span>
              <span className="font-extrabold text-[#3D568F]">
                {progressPercent}% Hoàn tất
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-[#3D568F] via-[#6384C6] to-[#9FBAF1] rounded-full transition-all duration-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono text-stone-600">
            <div>
              Điểm thực hành: <strong className="text-stone-900 font-bold">1,840 XP</strong>
            </div>
            <div>
              Streak phân tích: <strong className="text-emerald-600 font-bold">14 Ngày</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Content: Flat Lessons List & Sidebar Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Direct Lessons List (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Section Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3D568F]" />
              <h2 className="text-sm font-bold text-stone-900 font-[family-name:var(--font-headline)] uppercase tracking-wide">
                Danh Sách Bài Học Thuật Toán
              </h2>
            </div>

            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === "all" ? "bg-white text-[#243355] shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Tất cả ({totalLessons})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === "completed" ? "bg-white text-[#243355] shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Đã học ({completedLessons})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("todo")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === "todo" ? "bg-white text-[#243355] shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Chưa học ({totalLessons - completedLessons})
              </button>
            </div>
          </div>

          {/* Clean Flat Lessons List: Bài 01, Bài 02, ..., Bài 10 */}
          <div className="flex flex-col gap-3.5">
            {displayedLessons.map((lesson) => (
              <div
                key={lesson.id}
                onClick={() => onOpenSimulation?.(lesson.id)}
                className="group bg-white p-5 rounded-2xl border border-stone-200/90 hover:border-[#3D568F]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
              >
                {/* Left Side: Number Badge + Content */}
                <div className="flex items-start gap-4 flex-1">
                  {/* Big Number Pill */}
                  <div className="w-12 h-12 rounded-2xl bg-[#3D568F]/10 group-hover:bg-[#3D568F] text-[#3D568F] group-hover:text-white font-mono font-black text-base flex items-center justify-center shrink-0 border border-[#3D568F]/20 transition-all duration-300 shadow-2xs">
                    {lesson.numericIndex < 10 ? `0${lesson.numericIndex}` : lesson.numericIndex}
                  </div>

                  <div className="flex-1">
                    {/* Lesson Header Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#9FBAF1]/20 text-[#243355] border border-[#9FBAF1]/40">
                        {lesson.tag}
                      </span>

                      {lesson.status === "completed" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          <CheckCircleFill className="w-3 h-3 text-emerald-600" />
                          <span>Đã xong</span>
                        </span>
                      )}
                      {lesson.status === "in-progress" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                          <ClockHistory className="w-3 h-3 text-sky-600" />
                          <span>Đang học ({lesson.progress}%)</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-stone-900 group-hover:text-[#3D568F] transition-colors font-[family-name:var(--font-headline)] leading-snug">
                      {lesson.lessonNumber}: {lesson.title}
                    </h3>

                    {/* Subtitle / Core Principle */}
                    <p className="text-xs font-semibold text-stone-700 font-[family-name:var(--font-headline)] mt-0.5">
                      ↳ {lesson.subtitle}
                    </p>

                    {/* Short Description */}
                    <p className="text-xs text-stone-500 font-[family-name:var(--font-body)] mt-1.5 leading-relaxed">
                      {lesson.description}
                    </p>

                    {/* Sub-branches (e.g. Kruskal & Prim, or Interval / Job / Deadline) */}
                    {lesson.subBranches && lesson.subBranches.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="text-[11px] font-mono font-bold text-stone-400">Các dạng con:</span>
                        {lesson.subBranches.map((branch, bIdx) => (
                          <span
                            key={bIdx}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#F4F6F9] hover:bg-[#EAF3B2]/50 text-stone-700 border border-stone-200/80 transition-colors"
                          >
                            • {branch}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tech Badges & Complexities */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold">
                        Time: <strong className="text-stone-900">{lesson.timeComplexity}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold">
                        Space: <strong className="text-stone-900">{lesson.spaceComplexity}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#EAF3B2]/50 text-[#243355] font-semibold border border-[#D9E69B]">
                        {lesson.canvasType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: CTA Action Button */}
                <div className="shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSimulation?.(lesson.id);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs hover:scale-[1.02] active:scale-[0.98] ${
                      lesson.status === "completed"
                        ? "bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200"
                        : "bg-[#3D568F] hover:bg-[#2F4371] text-white shadow-xs"
                    }`}
                  >
                    {lesson.actionText}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Radar Chart, AI Challenge, Cheat Sheet (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Widget 1: Thống kê năng lực hiểu thuật toán */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-stone-900 font-[family-name:var(--font-headline)]">
                Thống Kê Năng Lực Hiểu Thuật Toán
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                5 Trục Đánh Giá
              </span>
            </div>
            <p className="text-xs text-stone-500 font-[family-name:var(--font-body)] mb-4 leading-relaxed">
              Hệ thống đo lường trực tiếp mức độ thông hiểu bản chất thuật toán qua kết quả phân tích, chứng minh và giải quyết test case:
            </p>

            {/* Radar Chart Graphic */}
            <div className="relative w-full h-52 flex items-center justify-center bg-stone-50/80 rounded-2xl border border-stone-100 p-2">
              <svg className="w-44 h-44" viewBox="0 0 160 160">
                {/* Polygon concentric grids */}
                <polygon points="80,15 142,50 118,125 42,125 18,50" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                <polygon points="80,35 125,60 108,112 52,112 35,60" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                <polygon points="80,55 105,70 95,100 65,100 55,70" fill="none" stroke="#E2E8F0" strokeWidth="1" />

                {/* Radar Area Filled */}
                <polygon
                  points="80,24 133,56 112,117 50,113 32,58"
                  fill="#3D568F"
                  fillOpacity="0.22"
                  stroke="#3D568F"
                  strokeWidth="2"
                />
                {/* Points */}
                <circle cx="80" cy="24" r="3.5" fill="#EAF3B2" stroke="#3D568F" strokeWidth="1.5" />
                <circle cx="133" cy="56" r="3.5" fill="#3D568F" />
                <circle cx="112" cy="117" r="3.5" fill="#3D568F" />
                <circle cx="50" cy="113" r="3.5" fill="#3D568F" />
                <circle cx="32" cy="58" r="3.5" fill="#3D568F" />

                {/* Axis lines */}
                <line x1="80" y1="80" x2="80" y2="15" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="80" y1="80" x2="142" y2="50" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="80" y1="80" x2="118" y2="125" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="80" y1="80" x2="42" y2="125" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="80" y1="80" x2="18" y2="50" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
              </svg>

              {/* 5 Core Competency Labels on radar chart */}
              <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-stone-700 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs border border-stone-200">
                Nhận diện bài toán 92%
              </span>
              <span className="absolute top-10 right-1 text-[9px] font-mono font-bold text-stone-700 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs border border-stone-200">
                Phân tích Time/Space 88%
              </span>
              <span className="absolute bottom-2 right-2 text-[9px] font-mono font-bold text-stone-700 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs border border-stone-200">
                Code & DSU/Heap 90%
              </span>
              <span className="absolute bottom-2 left-2 text-[9px] font-mono font-bold text-stone-700 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs border border-stone-200">
                Bẫy & Edge Cases 68%
              </span>
              <span className="absolute top-10 left-1 text-[9px] font-mono font-bold text-stone-700 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs border border-stone-200">
                Chứng minh tối ưu 75%
              </span>
            </div>

            {/* Detailed Competency Breakdown */}
            <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col gap-3 text-xs">
              <div>
                <div className="flex items-center justify-between font-mono mb-1">
                  <span className="text-stone-700 font-semibold">1. Nhận diện tính chất tham lam (Greedy Choice)</span>
                  <span className="font-bold text-[#3D568F]">92%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="w-[92%] h-full bg-[#3D568F] rounded-full" />
                </div>
                <p className="text-[10px] text-stone-400 font-mono mt-0.5">Biết khi nào bài toán giải được bằng Greedy vs Quy hoạch động.</p>
              </div>

              <div>
                <div className="flex items-center justify-between font-mono mb-1">
                  <span className="text-stone-700 font-semibold">2. Phân tích độ phức tạp (Time & Space)</span>
                  <span className="font-bold text-[#3D568F]">88%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="w-[88%] h-full bg-[#3D568F] rounded-full" />
                </div>
                <p className="text-[10px] text-stone-400 font-mono mt-0.5">Nắm vững O(N log N) sắp xếp, O((V+E) log V) Min-Heap.</p>
              </div>

              <div>
                <div className="flex items-center justify-between font-mono mb-1">
                  <span className="text-stone-700 font-semibold">3. Xử lý bẫy thuật toán & Edge Cases</span>
                  <span className="font-bold text-amber-600">68%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="w-[68%] h-full bg-amber-500 rounded-full" />
                </div>
                <p className="text-[10px] text-stone-400 font-mono mt-0.5">Bắt trường hợp biên: đồ thị có cạnh âm, hệ tiền không chuẩn.</p>
              </div>
            </div>
          </div>

          {/* Widget 2: Thử thách kiểm thử thuật toán */}
          <div className="bg-gradient-to-br from-[#FAFBF4] to-[#F1F6D4] p-5 rounded-3xl border border-[#D9E69B] shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#243355] bg-[#EAF3B2] px-2.5 py-1 rounded-full border border-[#D9E69B]">
                  <LightningChargeFill className="w-3 h-3 text-amber-600" />
                  <span>THỬ THÁCH HÔM NAY</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-white/80 px-2 py-0.5 rounded-md">
                  +50 XP
                </span>
              </div>

              <h4 className="text-sm font-bold text-stone-900 font-[family-name:var(--font-headline)] mt-2 leading-snug">
                Khi nào thuật toán tham lam Đổi Tiền (Coin Change) thất bại?
              </h4>
              <p className="text-xs text-stone-600 mt-1.5 font-[family-name:var(--font-body)] leading-relaxed">
                Kiểm tra phản ví dụ với hệ tiền không chuẩn (Non-canonical). Hãy chỉ ra trường hợp Greedy chọn nhiều xu hơn Quy hoạch động!
              </p>

              {/* Code snippet mock */}
              <div className="mt-3 p-3 bg-[#1B253D] text-white rounded-xl font-mono text-[11px] leading-relaxed border border-slate-700 shadow-inner">
                <div className="text-stone-400">// Test case: coins = [1, 3, 4], target = 6</div>
                <div className="text-emerald-400">Greedy: 4 + 1 + 1 (3 xu) ❌</div>
                <div className="text-[#EAF3B2]">Optimal (DP): 3 + 3 (2 xu) ✅</div>
              </div>
            </div>

            <button
              type="button"
              className="mt-4 w-full py-2.5 rounded-xl bg-[#243355] hover:bg-[#1A253D] text-[#EAF3B2] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md"
            >
              <CodeSlash className="w-3.5 h-3.5" />
              <span>Thử Thách & Test Code Tương Tác</span>
            </button>
          </div>

          {/* Widget 3: Tài liệu & Cheat Sheet */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900 font-[family-name:var(--font-headline)]">
                Tài Liệu & Cheat Sheet
              </h3>
              <Download className="w-3.5 h-3.5 text-stone-400" />
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors border border-stone-100 flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
                    PDF
                  </div>
                  <div>
                    <div className="font-bold text-stone-800 group-hover:text-[#3D568F]">
                      Greedy Cheat Sheet Toàn Tập
                    </div>
                    <div className="text-[10px] font-mono text-stone-400">PDF • 3.8 MB • Cập nhật v2.4</div>
                  </div>
                </div>
                <Download className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#3D568F]" />
              </div>

              <div className="p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors border border-stone-100 flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#3D568F] flex items-center justify-center font-bold text-xs">
                    ZIP
                  </div>
                  <div>
                    <div className="font-bold text-stone-800 group-hover:text-[#3D568F]">
                      Khung Mã Nguồn C++ / Python
                    </div>
                    <div className="text-[10px] font-mono text-stone-400">10 Dạng bài chuẩn hóa</div>
                  </div>
                </div>
                <Download className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#3D568F]" />
              </div>

              <div className="p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors border border-stone-100 flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    WEB
                  </div>
                  <div>
                    <div className="font-bold text-stone-800 group-hover:text-[#3D568F]">
                      Ứng Dụng Viễn Thông & Router
                    </div>
                    <div className="text-[10px] font-mono text-stone-400">Định tuyến gói tin với Dijkstra</div>
                  </div>
                </div>
                <BoxArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#3D568F]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

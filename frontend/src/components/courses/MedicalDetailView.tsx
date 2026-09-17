'use client';

import React, { useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  PlayFill,
  CheckCircleFill,
  ClockHistory,
  HeartPulseFill,
  LightningChargeFill,
  Download,
  BoxArrowUpRight,
  EyeFill,
  ShieldCheck,
  Activity,
  LayersFill,
} from "react-bootstrap-icons";
import { MED_LESSONS_DATA, MedicalLesson } from "@/data/medicalCurriculum";

interface Props {
  onBack: () => void;
  onOpenSimulation?: (lessonId: string) => void;
}

export function MedicalDetailView({ onBack, onOpenSimulation }: Props) {
  const [filterTab, setFilterTab] = useState<"all" | "completed" | "todo">("all");

  const totalLessons = MED_LESSONS_DATA.length;
  const completedLessons = MED_LESSONS_DATA.filter((l) => l.status === "completed").length;
  const inProgressLessons = MED_LESSONS_DATA.filter((l) => l.status === "in-progress").length;
  const progressPercent = Math.round((completedLessons / totalLessons) * 100);

  // Filter lessons based on status
  const displayedLessons = MED_LESSONS_DATA.filter((lesson) => {
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
          <span className="text-stone-600">Y Khoa & Giải Phẫu</span>
          <span>/</span>
          <span className="text-stone-900 font-bold">Giải Phẫu 3D Tim Mạch (MED-201)</span>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-stone-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách</span>
        </button>
      </div>

      {/* 2. Hero Course Banner */}
      <div className="rounded-2xl p-6 md:p-8 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E1B4B] text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#EF4444]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#3D568F]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#EF4444] text-white">
                MED-201
              </span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-white/10 text-white/90">
                Năm 2 Y Khoa • 5 Tín chỉ
              </span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#EAF3B2] text-stone-900 flex items-center gap-1">
                <HeartPulseFill className="w-3 h-3 text-[#EF4444]" />
                Mô hình giải phẫu 3D 360°
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display text-white">
              Giải Phẫu Học 3D: Hệ Tuần Hoàn & Cấu Trúc Tim Toàn Diện
            </h1>

            <p className="text-xs md:text-sm text-stone-300 leading-relaxed font-sans">
              Khám phá không gian 3 chiều 360 độ: cấu trúc 4 buồng tim, tuần hoàn vành, huyết động học Poiseuille và sinh lý dẫn truyền điện thế tim từ cấp độ mô học đến can thiệp lâm sàng.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-stone-300">
              <span className="bg-white/10 px-2 py-0.5 rounded text-stone-200">#ĐộngMạchLAD</span>
              <span className="bg-white/10 px-2 py-0.5 rounded text-stone-200">#HuyếtĐộngFFR</span>
              <span className="bg-white/10 px-2 py-0.5 rounded text-stone-200">#ĐịnhLuậtPoiseuille</span>
              <span className="bg-white/10 px-2 py-0.5 rounded text-stone-200">#BócTách4BuồngTim</span>
              <span className="bg-white/10 px-2 py-0.5 rounded text-stone-200">#NútXoangNhĩ</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[220px]">
            <button
              type="button"
              onClick={() => onOpenSimulation?.("med-lesson-03")}
              className="px-5 py-3 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs font-display transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer group"
            >
              <HeartPulseFill className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Khám Phá Mô Phỏng 3D (Bài 03)</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Lưu giáo trình</span>
              </button>
              <button
                type="button"
                className="flex-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Atlas 3D PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Progress & Competency Radar */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Progress Card */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-stone-500">
                Tiến Độ Học Tập
              </h3>
              <span className="text-xs font-bold font-mono text-[#EF4444] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                {completedLessons}/{totalLessons} bài hoàn thành
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-stone-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#EF4444]"
                    strokeDasharray={`${progressPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-sm font-bold font-display text-stone-800">
                  {progressPercent}%
                </span>
              </div>

              <div className="flex flex-col gap-1 text-xs">
                <div className="font-bold text-stone-800">Đã hoàn thành 4/6 bài học</div>
                <div className="text-stone-500 text-[11px] leading-tight">
                  Đang dừng lại tại <strong className="text-stone-700">Bài 03: Mạch vành & LAD 70%</strong>.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-center font-mono">
              <div className="bg-stone-50 rounded-xl p-2">
                <div className="text-[10px] text-stone-500">Mô hình 3D</div>
                <div className="text-sm font-bold text-stone-800">3 Mô hình</div>
              </div>
              <div className="bg-stone-50 rounded-xl p-2">
                <div className="text-[10px] text-stone-500">Điểm đánh giá TB</div>
                <div className="text-sm font-bold text-[#EF4444]">92.5/100</div>
              </div>
            </div>
          </div>

          {/* 5-Axis Medical Competencies */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-stone-500">
                Thống Kê Năng Lực Giải Phẫu & Sinh Lý
              </h3>
              <Activity className="w-3.5 h-3.5 text-stone-400" />
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed font-sans">
              Hệ thống đánh giá mức độ thuần thục qua các buổi thực hành bóc tách 3D và phân tích bệnh học lâm sàng:
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-700">Giải phẫu không gian 3D</span>
                  <span className="font-mono text-stone-500 font-bold">95%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#EF4444] h-2 rounded-full" style={{ width: "95%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-700">Huyết động học mạch vành</span>
                  <span className="font-mono text-stone-500 font-bold">88%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#3D568F] h-2 rounded-full" style={{ width: "88%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-700">Điện sinh lý nút tạo nhịp (SA/AV)</span>
                  <span className="font-mono text-stone-500 font-bold">92%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "92%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-700">Bệnh học mạch máu & FFR</span>
                  <span className="font-mono text-stone-500 font-bold">84%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: "84%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-700">Chẩn đoán can thiệp PCI Stent</span>
                  <span className="font-mono text-stone-500 font-bold">90%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: "90%" }} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <div className="bg-red-50/70 border border-red-100 rounded-xl p-3 flex items-start gap-2.5">
                <HeartPulseFill className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div className="text-[11px] text-stone-700 leading-tight">
                  <strong className="text-stone-900">Mục tiêu bài tiếp theo:</strong> Khảo sát trực quan nhánh LAD tổn thương hẹp 70% và so sánh lưu lượng tưới máu mỏm tim qua mô hình 3D.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Flat Lesson List (Bài 01 to Bài 06) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Header Bar with Filter Tabs */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold font-display text-stone-900">
                Lộ Trình Các Bài Học ({totalLessons} Bài)
              </h2>
              <p className="text-xs text-stone-500">
                Nắm vững từng cấu trúc và sinh lý học tim mạch thông qua bài học trực quan.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl text-xs font-bold font-mono">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterTab === "all"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Tất cả ({totalLessons})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("completed")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterTab === "completed"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Đã học ({completedLessons})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("todo")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterTab === "todo"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Cần học ({inProgressLessons})
              </button>
            </div>
          </div>

          {/* Lesson List */}
          <div className="flex flex-col gap-3">
            {displayedLessons.map((lesson) => {
              const isSimulationLesson = lesson.id === "med-lesson-03";

              return (
                <div
                  key={lesson.id}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col gap-3 shadow-2xs ${
                    isSimulationLesson
                      ? "border-[#EF4444]/60 ring-2 ring-[#EF4444]/10 bg-red-50/20"
                      : "border-stone-200/80 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                          lesson.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : lesson.status === "in-progress"
                            ? "bg-[#EF4444] text-white"
                            : "bg-stone-100 text-stone-400"
                        }`}
                      >
                        {lesson.status === "completed" ? (
                          <CheckCircleFill className="w-4 h-4" />
                        ) : (
                          lesson.order.toString().padStart(2, "0")
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                            {lesson.code}
                          </span>
                          <span className="text-[11px] text-stone-400">•</span>
                          <span className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                            <ClockHistory className="w-3 h-3" />
                            {lesson.duration}
                          </span>
                          <span className="text-[11px] text-stone-400">•</span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-stone-100 text-stone-600">
                            {lesson.difficulty}
                          </span>
                          {lesson.hasSimulation && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 text-[#EF4444] flex items-center gap-1">
                              <HeartPulseFill className="w-2.5 h-2.5" />
                              Mô hình 3D
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm md:text-base font-bold text-stone-900 mt-0.5 font-display">
                          {lesson.title}
                        </h3>
                      </div>
                    </div>

                    {lesson.status === "completed" && lesson.score && (
                      <div className="flex flex-col items-end shrink-0 font-mono">
                        <span className="text-[10px] text-stone-400">Đã đạt</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {lesson.score}/100
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed font-sans pl-12">
                    {lesson.summary}
                  </p>

                  {/* Core Concepts */}
                  <div className="flex flex-wrap items-center gap-1.5 pl-12">
                    <span className="text-[10px] font-mono font-bold text-stone-400">Trọng tâm:</span>
                    {lesson.coreConcepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md border border-stone-200/50"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>

                  {/* Clinical Significance */}
                  <div className="pl-12">
                    <div className="bg-stone-50 border border-stone-200/60 rounded-xl p-3 text-xs text-stone-700 flex flex-col gap-1">
                      <div className="text-[11px] font-bold text-stone-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#3D568F]" />
                        <span>Ý nghĩa lâm sàng & Chẩn đoán:</span>
                      </div>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        {lesson.clinicalSignificance}
                      </p>
                      {lesson.keyFormula && (
                        <div className="mt-1 pt-1 border-t border-stone-200/60 font-mono text-[11px] text-[#3D568F] font-semibold bg-white p-1.5 rounded border border-stone-200/50">
                          {lesson.keyFormula}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 pl-12 mt-1">
                    <div className="text-[11px] font-mono text-stone-400">
                      {lesson.status === "completed" ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          ✓ Đã hoàn thành bài học
                        </span>
                      ) : lesson.status === "in-progress" ? (
                        <span className="text-[#EF4444] font-semibold flex items-center gap-1">
                          ● Đang học dở dang
                        </span>
                      ) : (
                        <span>Chưa mở khóa</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {lesson.hasSimulation ? (
                        <button
                          type="button"
                          onClick={() => onOpenSimulation?.(lesson.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                            isSimulationLesson
                              ? "bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-red-200"
                              : "bg-stone-900 text-white hover:bg-stone-800"
                          }`}
                        >
                          <EyeFill className="w-3.5 h-3.5" />
                          <span>Khám phá mô hình 3D</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <PlayFill className="w-3.5 h-3.5" />
                          <span>{lesson.status === "completed" ? "Ôn tập lại" : "Học bài này"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  HeartPulseFill,
  Activity,
  LayersFill,
  EyeFill,
  ZoomIn,
  ZoomOut,
  ArrowClockwise,
  CheckCircleFill,
  InfoCircleFill,
  ShieldCheck,
  CompassFill,
  LightbulbFill,
  Speedometer2,
  BoxArrowUpRight,
  DropletFill,
  PlayFill,
  PauseFill,
  SkipEndFill,
  SkipStartFill,
  Grid3x3GapFill,
  LightningChargeFill,
} from "react-bootstrap-icons";
import {
  HEART_PINS,
  HeartPin,
  HEART_SIMULATION_STEPS,
  HeartStep,
  RELATED_PRACTICE_TOPICS,
} from "@/data/medicalCurriculum";

interface Props {
  onBack: () => void;
  lessonId?: string;
}

export function MedicalSimulationView({ onBack }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(3); // Default at Step 3 (LAD Stenosis)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [displayMode, setDisplayMode] = useState<"interactive" | "gallery">("interactive");
  const [selectedPinId, setSelectedPinId] = useState<string>("pin-a");
  const [currentLayer, setCurrentLayer] = useState<"pericardium" | "myocardium" | "vessels" | "conduction">("vessels");
  const [isFlowActive, setIsFlowActive] = useState<boolean>(true);
  const [isFFRActive, setIsFFRActive] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"comparison" | "pearls" | "anatomy">("comparison");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isLessonUnderstood, setIsLessonUnderstood] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = HEART_SIMULATION_STEPS.length;
  const currentStep: HeartStep =
    HEART_SIMULATION_STEPS[currentStepIndex - 1] || HEART_SIMULATION_STEPS[0];
  const currentPin: HeartPin =
    HEART_PINS.find((p) => p.id === selectedPinId) || HEART_PINS[0];

  // Auto-sync active layer & pin when step changes
  useEffect(() => {
    if (currentStep.layer) {
      setCurrentLayer(currentStep.layer);
    }
    if (currentStep.focusPinId) {
      setSelectedPinId(currentStep.focusPinId);
    }
  }, [currentStepIndex, currentStep]);

  // Robust auto-play timer like in algorithms
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(2200 / playbackSpeed);
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= totalSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, totalSteps]);

  const handleTogglePlay = () => {
    if (!isPlaying) {
      if (currentStepIndex >= totalSteps) {
        setCurrentStepIndex(1);
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentStepIndex < totalSteps) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setCurrentStepIndex(1);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    if (currentStepIndex > 1) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      setCurrentStepIndex(totalSteps);
    }
  };

  const handleSelectLayer = (layer: "pericardium" | "myocardium" | "vessels" | "conduction") => {
    setCurrentLayer(layer);
    if (layer === "conduction") {
      setSelectedPinId("pin-c");
    } else if (layer === "vessels") {
      setSelectedPinId("pin-a");
    } else if (layer === "myocardium") {
      setSelectedPinId("pin-b");
    }
  };

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
            <span>MED-201</span>
          </button>
          <span>/</span>
          <span className="text-stone-600">Khám Phá Mô Hình 3D</span>
          <span>/</span>
          <span className="text-stone-900 font-bold">Bài 03: Giải Phẫu Tim & Huyết Động LAD</span>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-stone-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về lộ trình bài học</span>
        </button>
      </div>

      {/* 2. Top Banner with Mode Switcher & Lesson Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-[#EF4444] flex items-center gap-1">
              <HeartPulseFill className="w-3 h-3" />
              BÀI HỌC TRỰC QUAN 3D
            </span>
            <span className="text-[11px] font-mono text-stone-400">•</span>
            <span className="text-[11px] font-mono text-stone-600 font-semibold">
              Hệ thống Giải Phẫu & Huyết Động Học Mạch Vành
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold font-display text-stone-900">
            Khám Phá Giải Phẫu Tim 3D & Huyết Động Học Mạch Vành LAD
          </h1>

          <p className="text-xs text-stone-500 font-sans max-w-3xl">
            Tìm hiểu từng bước từ quai động mạch chủ, phân nhánh mạch vành, đo đạc độ hẹp LAD 70% và quan sát hệ quả thiếu máu mỏm tim theo định luật Poiseuille.
          </p>
        </div>

        {/* Display Mode Toggle (Interactive vs Gallery) */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div className="flex items-center bg-stone-100 p-1 rounded-xl font-mono text-xs font-bold">
            <button
              type="button"
              onClick={() => setDisplayMode("interactive")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                displayMode === "interactive"
                  ? "bg-white text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <EyeFill className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Khung nhìn tương tác</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("gallery")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                displayMode === "gallery"
                  ? "bg-white text-stone-900 shadow-2xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <Grid3x3GapFill className="w-3.5 h-3.5 text-[#3D568F]" />
              <span>Sơ đồ 6 bước (Grid)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. STEP CONTROLLER TOOLBAR (Như bên thuật toán) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Step Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center font-mono font-extrabold text-[#EF4444] text-sm shrink-0">
            {currentStepIndex}/{totalSteps}
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-stone-900 flex items-center gap-2">
              <span>{currentStep.title}</span>
              <span className="text-[10px] px-2 py-0.2 rounded bg-stone-100 text-stone-600">
                {currentStep.layer === "pericardium"
                  ? "Màng Tim"
                  : currentStep.layer === "myocardium"
                  ? "Cơ Tim & Buồng Tim"
                  : currentStep.layer === "vessels"
                  ? "Mạch Vành 3D"
                  : "Điện Sinh Lý"}
              </span>
            </div>
            <div className="text-[11px] text-stone-500 font-sans mt-0.5">
              {currentStep.subtitle}
            </div>
          </div>
        </div>

        {/* Step Navigation Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto font-mono text-xs">
          <button
            type="button"
            onClick={handleStepBack}
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer"
            title="Bước trước"
          >
            <SkipStartFill className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isPlaying
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200"
                : "bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-red-200"
            }`}
          >
            {isPlaying ? (
              <>
                <PauseFill className="w-4 h-4" />
                <span>Tạm dừng</span>
              </>
            ) : (
              <>
                <PlayFill className="w-4 h-4" />
                <span>Tự động chạy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleStepForward}
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer"
            title="Bước sau"
          >
            <SkipEndFill className="w-4 h-4" />
          </button>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => setPlaybackSpeed((s) => (s === 1.0 ? 1.5 : s === 1.5 ? 2.0 : 1.0))}
            className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold transition-colors cursor-pointer"
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE: GALLERY MODE OR INTERACTIVE 3D MODE */}
      {displayMode === "gallery" ? (
        /* SƠ ĐỒ 6 BƯỚC DẠNG GRID (NHƯ BÊN THUẬT TOÁN) */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-display text-stone-900">
              Sơ Đồ Từng Bước Khảo Sát Giải Phẫu & Huyết Động Tim Mạch (6 Bước)
            </h3>
            <span className="text-xs text-stone-500 font-mono">
              Nhấp vào một bước bất kỳ để mở góc nhìn 3D chi tiết
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HEART_SIMULATION_STEPS.map((step) => {
              const isActive = step.stepIndex === currentStepIndex;
              return (
                <div
                  key={step.stepIndex}
                  onClick={() => {
                    setCurrentStepIndex(step.stepIndex);
                    setDisplayMode("interactive");
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-2xs hover:shadow-md ${
                    isActive
                      ? "border-[#EF4444] ring-2 ring-[#EF4444]/20 bg-red-50/20"
                      : "bg-white border-stone-200/80 hover:border-stone-300"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                        BƯỚC {step.stepIndex}/6
                      </span>
                      <span className="text-stone-400 font-semibold uppercase">
                        {step.layer}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-stone-900 font-display">
                      {step.title}
                    </h4>

                    <p className="text-xs text-stone-600 font-sans leading-relaxed line-clamp-2">
                      {step.shortExplanation}
                    </p>
                  </div>

                  {/* Compact Normal vs Stenosis Comparison Box */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono p-2 rounded-xl bg-stone-50 border border-stone-200/60">
                    <div className="flex flex-col">
                      <span className="text-stone-400">Bình thường</span>
                      <span className="font-bold text-emerald-700">
                        {step.normalComparison.diameter}
                      </span>
                      <span className="text-stone-500">
                        {step.normalComparison.flowRate}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-stone-400">Hẹp 70% LAD</span>
                      <span className="font-bold text-[#EF4444]">
                        {step.stenosisComparison.diameter}
                      </span>
                      <span className="text-stone-700 font-bold">
                        {step.stenosisComparison.resistance}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px] font-mono">
                    <span className="text-stone-500 truncate max-w-[200px]">
                      {step.clinicalTakeaway}
                    </span>
                    <span className="text-[#EF4444] font-bold shrink-0">Xem 3D →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* INTERACTIVE 3D VIEW MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 3D Heart Simulation Canvas */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-[#0F172A] rounded-2xl border border-stone-800 shadow-xl overflow-hidden flex flex-col relative text-white">
              {/* Top Viewport Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#1E293B]/90 border-b border-stone-800 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-stone-200 font-semibold">
                    Khung Nhìn 3D: {currentStep.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-stone-400">
                  <span className="px-2 py-0.5 rounded bg-white/10 text-stone-300">
                    Lớp: {currentLayer.toUpperCase()}
                  </span>
                  <span>•</span>
                  <span className="text-red-400 font-bold">FFR: 0.68 (Hẹp 70%)</span>
                </div>
              </div>

              {/* 3D Heart Canvas Viewport */}
              <div className="relative w-full h-[470px] flex items-center justify-center p-4 bg-gradient-to-b from-[#0B1120] via-[#0F172A] to-[#1E1B4B] select-none overflow-hidden">
                {/* Background grid */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#9FBAF1 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />

                {/* Layer Watermark Indicator */}
                <div className="absolute top-3 left-4 flex flex-col gap-1 text-[11px] font-mono pointer-events-none">
                  <span className="text-stone-400 font-bold">SYNAPSE 3D CARDIAC ATLAS</span>
                  <span className="text-red-400/80 text-[10px]">
                    Đang bóc tách: {currentLayer === "pericardium" ? "Màng Ngoài Tim (Pericardium)" : currentLayer === "myocardium" ? "Lớp Cơ Tim & 4 Buồng" : currentLayer === "vessels" ? "Cây Mạch Vành (Coronary Vessels)" : "Hệ Thống Dẫn Truyền SA-AV"}
                  </span>
                </div>

                {/* Interactive SVG Heart Representation */}
                <div
                  className="relative transition-transform duration-300 ease-out"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <svg
                    width="390"
                    height="390"
                    viewBox="0 0 390 390"
                    className="filter drop-shadow-[0_12px_24px_rgba(239,68,68,0.25)]"
                  >
                    <defs>
                      <radialGradient id="myoGrad" cx="45%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#C2410C" />
                        <stop offset="40%" stopColor="#991B1B" />
                        <stop offset="80%" stopColor="#7F1D1D" />
                        <stop offset="100%" stopColor="#450A0A" />
                      </radialGradient>

                      <linearGradient id="aortaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="60%" stopColor="#DC2626" />
                        <stop offset="100%" stopColor="#991B1B" />
                      </linearGradient>

                      <linearGradient id="pulmonaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38BDF8" />
                        <stop offset="100%" stopColor="#0284C7" />
                      </linearGradient>

                      <linearGradient id="stenosisFlow" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="45%" stopColor="#F87171" />
                        <stop offset="50%" stopColor="#FEF08A" />
                        <stop offset="60%" stopColor="#B91C1C" />
                        <stop offset="100%" stopColor="#7F1D1D" />
                      </linearGradient>
                    </defs>

                    {/* 1. Aorta Arch (Quai Động Mạch Chủ) */}
                    <path
                      d="M 175 140 C 175 60, 245 50, 260 110 C 265 130, 240 145, 230 150"
                      fill="none"
                      stroke="url(#aortaGrad)"
                      strokeWidth={currentStepIndex === 1 ? "36" : "32"}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                    <line x1="210" y1="62" x2="205" y2="35" stroke="url(#aortaGrad)" strokeWidth="8" strokeLinecap="round" />
                    <line x1="228" y1="66" x2="228" y2="30" stroke="url(#aortaGrad)" strokeWidth="7" strokeLinecap="round" />
                    <line x1="246" y1="78" x2="255" y2="38" stroke="url(#aortaGrad)" strokeWidth="6" strokeLinecap="round" />

                    {/* 2. Pulmonary Trunk */}
                    <path
                      d="M 195 160 C 190 120, 160 110, 130 115"
                      fill="none"
                      stroke="url(#pulmonaryGrad)"
                      strokeWidth="24"
                      strokeLinecap="round"
                      opacity={currentLayer === "pericardium" ? 0.35 : 0.85}
                    />

                    {/* 3. Main Heart Muscle Body (Ventricles & Atria) */}
                    <path
                      d="M 140 150 
                         C 110 130, 70 160, 80 210 
                         C 90 270, 150 320, 205 345 
                         C 260 320, 310 260, 305 190 
                         C 300 140, 250 140, 220 155 
                         C 200 165, 160 165, 140 150 Z"
                      fill="url(#myoGrad)"
                      stroke={currentStepIndex === 5 ? "#FEF08A" : "#F87171"}
                      strokeWidth={currentStepIndex === 5 ? "3.5" : "2"}
                      opacity={
                        currentLayer === "pericardium"
                          ? 0.75
                          : currentLayer === "conduction"
                          ? 0.4
                          : 1
                      }
                      className="transition-all duration-300"
                    />

                    {/* 4. Coronary Vessels (LAD & Branches) */}
                    {(currentLayer === "vessels" || currentLayer === "myocardium" || currentLayer === "pericardium") && (
                      <>
                        {/* Main LAD Path */}
                        <path
                          d="M 215 165 
                             Q 205 195, 195 215 
                             Q 192 230, 190 245 
                             Q 185 285, 200 335"
                          fill="none"
                          stroke={isFFRActive ? "url(#stenosisFlow)" : "#EF4444"}
                          strokeWidth={currentStepIndex === 3 || currentStepIndex === 4 ? "6" : "4"}
                          strokeLinecap="round"
                        />

                        {/* Diagonal branch from LAD */}
                        <path
                          d="M 195 215 Q 165 240, 145 265"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          opacity="0.8"
                        />

                        {/* Circumflex branch (LCx) */}
                        <path
                          d="M 225 170 Q 265 190, 280 220"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          opacity="0.8"
                        />

                        {/* Dynamic Blood Flow Pulse */}
                        {isFlowActive && (
                          <path
                            d="M 215 165 Q 205 195, 195 215 Q 192 230, 190 245 Q 185 285, 200 335"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            strokeDasharray="6, 14"
                            className="animate-pulse"
                            opacity="0.85"
                          />
                        )}

                        {/* Stenosis marker ring around LAD 70% */}
                        <circle
                          cx="192"
                          cy="235"
                          r="9"
                          fill="none"
                          stroke="#FEF08A"
                          strokeWidth="2.5"
                          strokeDasharray="3, 3"
                          className="animate-spin"
                          style={{ transformOrigin: "192px 235px" }}
                        />
                      </>
                    )}

                    {/* 5. Electrical Conduction Pathway (Layer Conduction) */}
                    {(currentLayer === "conduction" || currentStepIndex === 6) && (
                      <g className="animate-pulse">
                        {/* SA Node to AV Node internodal tracts */}
                        <path
                          d="M 135 145 Q 160 175, 185 195"
                          fill="none"
                          stroke="#34D399"
                          strokeWidth="3"
                          strokeDasharray="4, 4"
                        />
                        {/* AV Node */}
                        <circle cx="185" cy="195" r="6" fill="#10B981" />
                        {/* Bundle of His & Purkinje fibers down septum */}
                        <path
                          d="M 185 195 L 195 240 Q 200 290, 202 335"
                          fill="none"
                          stroke="#6EE7B7"
                          strokeWidth="2.5"
                        />
                      </g>
                    )}

                    {/* Apex Ischemia Glow Indicator */}
                    {currentStepIndex === 5 && (
                      <circle
                        cx="202"
                        cy="338"
                        r="14"
                        fill="#EF4444"
                        opacity="0.4"
                        className="animate-ping"
                      />
                    )}
                  </svg>

                  {/* INTERACTIVE PINS */}
                  {/* Pin A: LAD 70% */}
                  <div
                    className="absolute cursor-pointer group"
                    style={{ top: "44%", left: "50%", transform: "translate(-50%, -50%)" }}
                    onClick={() => {
                      setSelectedPinId("pin-a");
                      setCurrentStepIndex(3);
                    }}
                  >
                    <div
                      className={`relative flex items-center justify-center transition-all ${
                        selectedPinId === "pin-a" ? "scale-125 z-30" : "hover:scale-110 z-20"
                      }`}
                    >
                      <span className="absolute w-7 h-7 rounded-full bg-red-500/40 animate-ping" />
                      <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white">
                        A
                      </div>
                    </div>

                    <div
                      className={`absolute left-7 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap shadow-lg border transition-all ${
                        selectedPinId === "pin-a"
                          ? "bg-red-950/90 text-white border-red-500/80 ring-2 ring-red-500/30 font-bold"
                          : "bg-black/75 text-stone-300 border-stone-700 opacity-90 group-hover:opacity-100"
                      }`}
                    >
                      <div>[Pin A] ĐM Vành Trái (LAD)</div>
                      <div className="text-[9px] text-red-400 font-semibold">
                        Hẹp 70% • FFR: 0.68
                      </div>
                    </div>
                  </div>

                  {/* Pin B: Apex Ischemia */}
                  <div
                    className="absolute cursor-pointer group"
                    style={{ top: "82%", left: "54%", transform: "translate(-50%, -50%)" }}
                    onClick={() => {
                      setSelectedPinId("pin-b");
                      setCurrentStepIndex(5);
                    }}
                  >
                    <div
                      className={`relative flex items-center justify-center transition-all ${
                        selectedPinId === "pin-b" ? "scale-125 z-30" : "hover:scale-110 z-20"
                      }`}
                    >
                      <span className="absolute w-7 h-7 rounded-full bg-amber-500/40 animate-ping" />
                      <div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white">
                        B
                      </div>
                    </div>

                    <div
                      className={`absolute left-7 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap shadow-lg border transition-all ${
                        selectedPinId === "pin-b"
                          ? "bg-amber-950/90 text-white border-amber-500/80 ring-2 ring-amber-500/30 font-bold"
                          : "bg-black/75 text-stone-300 border-stone-700 opacity-90 group-hover:opacity-100"
                      }`}
                    >
                      <div>[Pin B] Mỏm Tim & Thất Trái</div>
                      <div className="text-[9px] text-amber-300 font-semibold">
                        Apex Sink • Thiếu máu cơ tim
                      </div>
                    </div>
                  </div>

                  {/* Pin C: SA Node */}
                  <div
                    className="absolute cursor-pointer group"
                    style={{ top: "28%", left: "34%", transform: "translate(-50%, -50%)" }}
                    onClick={() => {
                      setSelectedPinId("pin-c");
                      setCurrentStepIndex(6);
                    }}
                  >
                    <div
                      className={`relative flex items-center justify-center transition-all ${
                        selectedPinId === "pin-c" ? "scale-125 z-30" : "hover:scale-110 z-20"
                      }`}
                    >
                      <span className="absolute w-7 h-7 rounded-full bg-emerald-500/40 animate-ping" />
                      <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white">
                        C
                      </div>
                    </div>

                    <div
                      className={`absolute right-7 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap shadow-lg border transition-all ${
                        selectedPinId === "pin-c"
                          ? "bg-emerald-950/90 text-white border-emerald-500/80 ring-2 ring-emerald-500/30 font-bold"
                          : "bg-black/75 text-stone-300 border-stone-700 opacity-90 group-hover:opacity-100"
                      }`}
                    >
                      <div>[Pin C] Nút Xoang Nhĩ (SA Node)</div>
                      <div className="text-[9px] text-emerald-400 font-semibold">
                        Chủ nhịp 74 bpm
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM IN-CANVAS CONTROLS: BÓC TÁCH LAYER & ZOOM */}
                <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-auto">
                  {/* Zoom buttons */}
                  <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/10 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-stone-300 hover:text-white"
                      title="Phóng to"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-stone-300 hover:text-white"
                      title="Thu nhỏ"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-stone-300 hover:text-white"
                      title="Đặt lại"
                    >
                      <ArrowClockwise className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* NÚT BÓC TÁCH 4 LAYER RÕ RÀNG */}
                  <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/10 text-[11px] font-mono">
                    <span className="text-[10px] text-stone-400 px-1 font-bold flex items-center gap-1">
                      <LayersFill className="w-3 h-3 text-[#EAF3B2]" />
                      Bóc tách Layer:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectLayer("pericardium")}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                        currentLayer === "pericardium"
                          ? "bg-white/20 text-white font-bold"
                          : "text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      Màng Tim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectLayer("myocardium")}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                        currentLayer === "myocardium"
                          ? "bg-white/20 text-white font-bold"
                          : "text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      Cơ Tim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectLayer("vessels")}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                        currentLayer === "vessels"
                          ? "bg-[#EF4444] text-white font-bold shadow-2xs"
                          : "text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      Mạch Vành
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectLayer("conduction")}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                        currentLayer === "conduction"
                          ? "bg-emerald-600 text-white font-bold shadow-2xs"
                          : "text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      Điện Sinh Lý
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Ticker */}
              <div className="px-4 py-2.5 bg-[#0B1120] border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-stone-400">
                <div className="flex items-center gap-2">
                  <span className="text-stone-300 font-semibold">Tóm tắt bước:</span>
                  <span className="text-amber-300">{currentStep.shortExplanation}</span>
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Đồng bộ huyết động: 100%
                </div>
              </div>
            </div>

            {/* Quick Pin Selector Cards */}
            <div className="grid grid-cols-3 gap-2">
              {HEART_PINS.map((pin) => {
                const isSelected = pin.id === selectedPinId;
                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => {
                      setSelectedPinId(pin.id);
                      if (pin.id === "pin-a") setCurrentStepIndex(3);
                      if (pin.id === "pin-b") setCurrentStepIndex(5);
                      if (pin.id === "pin-c") setCurrentStepIndex(6);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer font-mono ${
                      isSelected
                        ? "bg-white border-[#3D568F] ring-2 ring-[#3D568F]/20 shadow-xs"
                        : "bg-stone-50 border-stone-200/80 hover:bg-white hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                        style={{ backgroundColor: pin.statusColor }}
                      >
                        {pin.shortTag.replace("Pin ", "")}
                      </span>
                      <span className="text-[10px] text-stone-400 font-bold">{pin.shortTag}</span>
                    </div>
                    <div className="text-xs font-bold text-stone-800 truncate font-sans">{pin.name}</div>
                    <div className="text-[10px] text-stone-500 truncate mt-0.5">{pin.severity}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: CLEAN, INTUITIVE EDUCATIONAL LEARNING PANEL (KHÔNG CÒN RỐI MẮT) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 text-[#EF4444] flex items-center justify-center font-bold text-sm">
                    <HeartPulseFill className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-stone-900">
                      Sổ Tay Lâm Sàng & Phân Tích Dễ Hiểu
                    </h3>
                    <div className="text-[11px] text-stone-500 font-sans">
                      {currentStep.title}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-100 text-stone-700">
                  Bước {currentStepIndex}/6
                </span>
              </div>

              {/* Intuitive Tab Selector */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("comparison")}
                  className={`flex-1 py-1.5 text-center rounded-lg transition-colors cursor-pointer ${
                    activeTab === "comparison"
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  📊 So Sánh Trực Quan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pearls")}
                  className={`flex-1 py-1.5 text-center rounded-lg transition-colors cursor-pointer ${
                    activeTab === "pearls"
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  💡 Điểm Cốt Lõi
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("anatomy")}
                  className={`flex-1 py-1.5 text-center rounded-lg transition-colors cursor-pointer ${
                    activeTab === "anatomy"
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  🫀 Mốc Giải Phẫu
                </button>
              </div>

              {/* TAB 1: BẢNG SO SÁNH TRỰC QUAN (RÕ RÀNG, DỄ HIỂU, KHÔNG NHỒI CHỮ) */}
              {activeTab === "comparison" && (
                <div className="flex flex-col gap-3 animate-fadeIn">
                  {/* Visual 2-Column Comparison Card */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Column 1: Mạch Bình Thường */}
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-emerald-200 text-emerald-800 font-bold">
                        <span>MẠCH KHỎE MẠNH</span>
                        <span>🟢</span>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div>
                          <div className="text-[10px] text-stone-500">Khẩu kính lòng mạch:</div>
                          <div className="font-bold text-stone-800">{currentStep.normalComparison.diameter}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-stone-500">Trở kháng mạch (R):</div>
                          <div className="font-bold text-emerald-700">{currentStep.normalComparison.resistance}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-stone-500">Lưu lượng tưới máu:</div>
                          <div className="font-bold text-stone-800">{currentStep.normalComparison.flowRate}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-stone-500">Áp lực lòng mạch:</div>
                          <div className="font-bold text-stone-800">{currentStep.normalComparison.pressure}</div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Mạch Tổn Thương Hẹp 70% */}
                    <div className="bg-red-50/60 border border-red-200/80 rounded-xl p-3 flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-red-200 text-red-800 font-bold">
                        <span>HẸP LAD 70%</span>
                        <span>🔴</span>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div>
                          <div className="text-[10px] text-stone-500">Khẩu kính lòng mạch:</div>
                          <div className="font-bold text-[#EF4444]">{currentStep.stenosisComparison.diameter}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-stone-500">Trở kháng mạch (R):</div>
                          <div className="font-bold text-[#EF4444]">{currentStep.stenosisComparison.resistance}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-stone-500">Lưu lượng tưới máu:</div>
                          <div className="font-bold text-red-700">{currentStep.stenosisComparison.flowRate}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-stone-500">Áp lực lòng mạch:</div>
                          <div className="font-bold text-[#EF4444]">{currentStep.stenosisComparison.pressure}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual FFR Gauge Bar */}
                  <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-stone-600 font-semibold">Chỉ số phân số dự trữ mạch vành (FFR):</span>
                      <span className="font-bold text-[#EF4444]">0.68 (Hẹp nặng)</span>
                    </div>
                    {/* Visual Meter Bar */}
                    <div className="relative w-full h-3 bg-stone-200 rounded-full overflow-hidden flex">
                      <div className="bg-red-500 h-full" style={{ width: "68%" }} />
                      <div className="bg-emerald-500 h-full" style={{ width: "32%" }} />
                      {/* Critical threshold pin at 80% */}
                      <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-stone-900" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
                      <span>0.0 (Tắc hoàn toàn)</span>
                      <span className="font-bold text-stone-800">Ngưỡng can thiệp: 0.80</span>
                      <span>1.0 (Sinh lý)</span>
                    </div>
                  </div>

                  {/* 2-Sentence Core Takeaway (Cực Kỳ Dễ Hiểu) */}
                  <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-3 flex items-start gap-2.5">
                    <Speedometer2 className="w-4 h-4 text-[#3D568F] shrink-0 mt-0.5" />
                    <div className="text-xs text-stone-700 leading-relaxed font-sans">
                      <strong className="text-[#3D568F] font-bold">Hiểu nhanh định luật Poiseuille:</strong> Bán kính giảm 70% làm trở kháng tăng lũy thừa 4 ($R \sim 1/r^4 \approx 13$ lần), lưu lượng tưới máu sụt giảm nặng nề gây thiếu oxy nuôi cơ tim.
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ĐIỂM CỐT LÕI LÂM SÀNG */}
              {activeTab === "pearls" && (
                <div className="flex flex-col gap-3 animate-fadeIn text-xs leading-relaxed font-sans">
                  <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex flex-col gap-1.5">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                      <LightbulbFill className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ghi Nhớ Lâm Sàng Trọng Tâm:</span>
                    </div>
                    <p className="text-amber-950 text-[11px] leading-relaxed">
                      {currentStep.clinicalTakeaway}
                    </p>
                  </div>

                  {currentStep.codeFormula && (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex flex-col gap-1 font-mono text-[11px]">
                      <span className="text-stone-500 font-bold uppercase text-[10px]">Công thức định lượng:</span>
                      <div className="bg-white p-2 rounded-lg border border-stone-200 font-semibold text-[#3D568F]">
                        {currentStep.codeFormula}
                      </div>
                    </div>
                  )}

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex flex-col gap-1">
                    <div className="font-bold text-stone-800 text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ý nghĩa chẩn đoán & điều trị:</span>
                    </div>
                    <p className="text-stone-600 text-[11px] leading-relaxed">
                      Khi FFR &lt; 0.80, can thiệp đặt Stent phủ thuốc (DES) giúp phục hồi khẩu kính 3.6mm, giảm trở kháng về mức chuẩn 1x và giải quyết dứt điểm cơn đau thắt ngực.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: MỐC GIẢI PHẪU CHI TIẾT */}
              {activeTab === "anatomy" && (
                <div className="flex flex-col gap-3 animate-fadeIn text-xs">
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm font-display">
                        {currentPin.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-100 text-[#EF4444] font-bold">
                        {currentPin.shortTag}
                      </span>
                    </div>
                    <div className="text-stone-500 text-[11px] font-mono flex items-center gap-1">
                      <CompassFill className="w-3 h-3 text-[#3D568F]" />
                      <span>{currentPin.location}</span>
                    </div>
                    <p className="text-stone-600 text-[11px] leading-relaxed font-sans mt-1">
                      {currentPin.description}
                    </p>
                  </div>

                  <div className="bg-red-50/70 border border-red-200 rounded-xl p-3 text-[11px] text-stone-700 leading-relaxed">
                    <strong className="text-stone-900 font-bold">Ghi chú lâm sàng: </strong>
                    {currentPin.clinicalNote}
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col gap-2 pt-3 border-t border-stone-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStepForward}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:border-stone-300"
                  >
                    <span>Bước tiếp theo ({currentStepIndex < totalSteps ? currentStepIndex + 1 : 1}/{totalSteps})</span>
                    <span className="text-stone-400">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLessonUnderstood(!isLessonUnderstood)}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                      isLessonUnderstood
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-[#3D568F] text-white hover:bg-[#2B3E6A]"
                    }`}
                  >
                    <CheckCircleFill className="w-3.5 h-3.5" />
                    <span>{isLessonUnderstood ? "Đã hiểu bài này" : "Đánh dấu đã hiểu"}</span>
                  </button>
                </div>

                {isLessonUnderstood && (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center font-mono">
                    ✓ Bạn đã hoàn thành việc khám phá 6 bước huyết động học của Bài 03!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Bottom Section: CÁC CHUYÊN ĐỀ TIM MẠCH LIÊN QUAN (100% CARDIOLOGY, NO CS/BRAIN) */}
      <div className="flex flex-col gap-4 pt-4 border-t border-stone-200/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold font-display text-stone-900">
              Các Chuyên Đề Thực Hành Tim Mạch Tiếp Theo
            </h3>
            <p className="text-xs text-stone-500 font-sans">
              Các mô hình mô phỏng chuyên sâu về bệnh học mạch vành, phẫu thuật bóc tách và thăm dò chức năng tim.
            </p>
          </div>

          <span className="text-xs font-mono text-[#3D568F] font-bold hover:underline cursor-pointer">
            Xem toàn bộ giáo trình tim mạch →
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {RELATED_PRACTICE_TOPICS.map((topic) => (
            <div
              key={topic.id}
              className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs hover:border-stone-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className={`px-2 py-0.5 rounded border font-semibold ${topic.badgeColor}`}>
                    {topic.badge}
                  </span>
                  <span className="text-stone-400 font-bold">{topic.meta}</span>
                </div>

                <h4 className="text-sm font-bold text-stone-900 font-display group-hover:text-[#EF4444] transition-colors line-clamp-2">
                  {topic.title}
                </h4>

                <p className="text-xs text-stone-500 font-sans line-clamp-3 leading-relaxed">
                  {topic.desc}
                </p>
              </div>

              <button
                type="button"
                className="w-full py-2 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-mono font-bold transition-colors border border-stone-200/60 flex items-center justify-center cursor-pointer"
              >
                {topic.actionText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

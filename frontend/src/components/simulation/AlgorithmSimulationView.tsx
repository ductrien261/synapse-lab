import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  PlayFill,
  PauseFill,
  SkipBackwardFill,
  SkipForwardFill,
  ArrowCounterclockwise,
  Grid3x3Gap,
  Download,
  BoxArrowUpRight,
  SendFill,
  Cpu,
  CheckCircleFill,
  CodeSlash,
  ChatDotsFill,
  LightningChargeFill,
  Diagram3Fill,
  GridFill,
  PlayCircleFill,
  Check2Circle,
  EyeFill,
} from "react-bootstrap-icons";
import { DIJKSTRA_SIMULATION_DATA, SimulationStep, GraphNode, GraphEdge } from "@/data/simulations";

interface Props {
  lessonId?: string;
  onBack: () => void;
}

export function AlgorithmSimulationView({ lessonId, onBack }: Props) {
  const data = DIJKSTRA_SIMULATION_DATA;
  const [currentStepIndex, setCurrentStepIndex] = useState(4); // Default to Step 4 as in reference
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 1.0x
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [displayMode, setDisplayMode] = useState<"interactive" | "gallery">("interactive");
  const [activeSidebarTab, setActiveSidebarTab] = useState<"ai-tutor" | "code">("ai-tutor");
  const [activeCodeLang, setActiveCodeLang] = useState<"cpp" | "py">("cpp");
  const [selectedQuickQuestion, setSelectedQuickQuestion] = useState<number | null>(null);
  const [userChatInput, setUserChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = data.steps.length;
  const currentStep: SimulationStep = data.steps[currentStepIndex - 1] || data.steps[0];

  // Robust auto-play timer
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(1400 / playbackSpeed);
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
      // If reached the end, automatically loop back to step 1
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
      setCurrentStepIndex(1); // loop back to 1
    }
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    if (currentStepIndex > 1) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(1);
    setSelectedQuickQuestion(null);
  };

  const handleSelectStepFromGallery = (stepNum: number) => {
    setIsPlaying(false);
    setCurrentStepIndex(stepNum);
    setDisplayMode("interactive");
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userChatInput.trim()) return;

    const query = userChatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: query }]);
    setUserChatInput("");

    // Simulated AI response based on current step
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: `Ở bước ${currentStep.stepIndex}, đỉnh đang duyệt là ${currentStep.activeNode}. Thuật toán kiểm tra các cạnh kề để cập nhật khoảng cách ngắn nhất vào bảng dist[] và hàng đợi Min-Heap!`,
        },
      ]);
    }, 500);
  };

  const handleQuickQuestionClick = (idx: number) => {
    setSelectedQuickQuestion(selectedQuickQuestion === idx ? null : idx);
  };

  // Helper to render mini SVG graph snapshot for any step
  const renderMiniGraph = (step: SimulationStep, width = 320, height = 180) => {
    return (
      <svg viewBox="0 0 700 440" className="w-full h-full">
        {/* Edges */}
        {data.edges.map((edge, idx) => {
          const fromNode = data.nodes.find((n) => n.id === edge.from)!;
          const toNode = data.nodes.find((n) => n.id === edge.to)!;
          const isRelaxing =
            step.relaxingEdge &&
            ((step.relaxingEdge.from === edge.from && step.relaxingEdge.to === edge.to) ||
              (step.relaxingEdge.from === edge.to && step.relaxingEdge.to === edge.from));
          const isPath = step.activePathEdges.some(
            (p) =>
              (p.from === edge.from && p.to === edge.to) ||
              (p.from === edge.to && p.to === edge.from)
          );
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;

          return (
            <g key={idx}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isRelaxing ? "#059669" : isPath ? "#243355" : "#CBD5E1"}
                strokeWidth={isRelaxing ? 4 : isPath ? 4 : 2}
                strokeDasharray={isRelaxing ? "6 4" : "none"}
              />
              <circle cx={midX} cy={midY} r="13" fill="white" stroke="#CBD5E1" strokeWidth="1.5" />
              <text
                x={midX}
                y={midY + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill={isRelaxing ? "#059669" : "#64748B"}
                fontFamily="monospace"
              >
                {edge.weight}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {data.nodes.map((node) => {
          const isActive = step.activeNode === node.id;
          const isVisited = step.visitedNodes.includes(node.id);
          const distVal = step.distances[node.id];

          return (
            <g key={node.id}>
              {isActive && (
                <circle cx={node.x} cy={node.y} r="32" fill="none" stroke="#3D568F" strokeWidth="3" opacity="0.4" />
              )}
              {isVisited && (
                <circle cx={node.x} cy={node.y} r="26" fill="none" stroke="#10B981" strokeWidth="2.5" strokeDasharray="3 3" />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r="22"
                fill={isActive ? "#243355" : isVisited ? "#EAF3B2" : "white"}
                stroke={isActive ? "#3D568F" : isVisited ? "#10B981" : "#94A3B8"}
                strokeWidth={isActive ? 3.5 : 2.5}
              />
              <text
                x={node.x}
                y={node.y + 6}
                textAnchor="middle"
                fontSize="15"
                fontWeight="900"
                fill={isActive ? "white" : "#1E293B"}
                fontFamily="var(--font-headline)"
              >
                {node.label}
              </text>
              {/* Distance badge */}
              <rect
                x={node.x - 22}
                y={node.y + (node.y > 250 ? 28 : -38)}
                width="44"
                height="18"
                rx="6"
                fill={isActive ? "#EAF3B2" : isVisited ? "#F0FDF4" : "white"}
                stroke={isActive ? "#D9E69B" : isVisited ? "#86EFAC" : "#E2E8F0"}
                strokeWidth="1.2"
              />
              <text
                x={node.x}
                y={node.y + (node.y > 250 ? 41 : -25)}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill={isActive ? "#243355" : isVisited ? "#15803D" : "#64748B"}
                fontFamily="monospace"
              >
                d: {distVal}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-5 animate-fadeIn pb-16">
      {/* 1. Top Simulation Header Bar */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 md:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-white text-stone-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:border-stone-300 shrink-0"
            title="Quay lại danh sách bài học"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-11 h-11 rounded-2xl bg-[#9FBAF1]/25 text-[#3D568F] flex items-center justify-center font-bold shrink-0 border border-[#9FBAF1]/40">
            <Diagram3Fill className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-0.5 text-[11px] font-mono font-bold">
              <span className="px-2 py-0.2 rounded-md bg-[#EAF3B2] text-[#243355] border border-[#D9E69B]">
                {data.badge}
              </span>
              <span className="text-stone-400">•</span>
              <span className="text-stone-500">{data.sessionCode}</span>
            </div>

            <h1 className="text-base sm:text-lg font-bold text-stone-900 font-[family-name:var(--font-headline)] leading-tight">
              {data.title}
            </h1>
          </div>
        </div>

        {/* Mode Switcher: [🎬 Mô Phỏng Động] ⇄ [📋 Sơ Đồ Từng Bước (Gallery)] */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
            <button
              type="button"
              onClick={() => setDisplayMode("interactive")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === "interactive"
                  ? "bg-white text-[#243355] shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <PlayCircleFill className="w-3.5 h-3.5 text-[#3D568F]" />
              <span>Mô Phỏng Trực Quan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setDisplayMode("gallery");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                displayMode === "gallery"
                  ? "bg-[#243355] text-[#EAF3B2] shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <GridFill className="w-3.5 h-3.5" />
              <span>Sơ Đồ Từng Bước (Grid)</span>
            </button>
          </div>

          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-[#243355] hover:bg-[#1A253D] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất SVG</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE A: SƠ ĐỒ TỪNG BƯỚC (GRID GALLERY - NHƯ ẢNH CỜ VUA NGÂN GỬI) */}
      {/* ========================================================================= */}
      {displayMode === "gallery" ? (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {/* Gallery Header Intro */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF3B2]/70 text-[#243355] text-xs font-mono font-bold mb-2 border border-[#D9E69B]">
                <GridFill className="w-3 h-3 text-[#3D568F]" />
                <span>CHẾ ĐỘ XEM TRỰC QUAN TỪNG BƯỚC (STEP BREAKDOWN)</span>
              </div>
              <h2 className="text-xl font-extrabold text-stone-900 font-[family-name:var(--font-headline)]">
                Bản Đồ Tuần Tự Toàn Bộ Các Bước Chạy Của Thuật Toán
              </h2>
              <p className="text-xs text-stone-500 font-[family-name:var(--font-body)] mt-1 max-w-2xl leading-relaxed">
                Quan sát đồng thời từng trạng thái đồ thị từ Bước 1 đến khi tìm ra đường đi ngắn nhất. Nhấp vào bất kỳ bước nào để mở mô phỏng chi tiết.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDisplayMode("interactive")}
              className="px-4 py-2.5 rounded-2xl bg-[#243355] hover:bg-[#1A253D] text-[#EAF3B2] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs shrink-0 self-start md:self-center"
            >
              <PlayFill className="w-4 h-4" />
              <span>Quay Lại Mô Phỏng Trực Quan</span>
            </button>
          </div>

          {/* Responsive Grid of All Steps (Side-by-side like N-Queens image) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.steps.map((step) => {
              const isCurrent = step.stepIndex === currentStepIndex;

              return (
                <div
                  key={step.stepIndex}
                  onClick={() => handleSelectStepFromGallery(step.stepIndex)}
                  className={`group bg-white rounded-3xl border p-4.5 flex flex-col justify-between transition-all duration-300 cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 ${
                    isCurrent
                      ? "border-[#3D568F] ring-2 ring-[#3D568F]/20"
                      : "border-stone-200/90 hover:border-[#3D568F]/50"
                  }`}
                >
                  <div>
                    {/* Step Card Header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[#243355] text-[#EAF3B2] font-mono font-black text-xs flex items-center justify-center shadow-2xs">
                          {step.stepIndex < 10 ? `0${step.stepIndex}` : step.stepIndex}
                        </span>
                        <span className="text-xs font-bold font-mono text-stone-800">
                          Bước {step.stepIndex}: Node {step.activeNode}
                        </span>
                      </div>

                      {step.stepIndex === totalSteps ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Đích đến F
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                          Min-d: {step.minDist}
                        </span>
                      )}
                    </div>

                    {/* Step Mini Snapshot Graphic */}
                    <div className="w-full h-44 rounded-2xl bg-[#F8FAFC] border border-stone-200/80 p-1 flex items-center justify-center overflow-hidden relative group-hover:border-[#3D568F]/30 transition-colors">
                      {renderMiniGraph(step)}
                    </div>

                    {/* Short Summary (1-2 sentences simple explanation) */}
                    <div className="mt-3.5">
                      <div className="text-xs font-bold text-stone-900 font-[family-name:var(--font-headline)] leading-snug">
                        ↳ {step.shortSummary}
                      </div>
                      <p className="text-xs text-stone-500 font-[family-name:var(--font-body)] mt-1 leading-relaxed">
                        {step.actionExplanation}
                      </p>
                    </div>

                    {/* Mini Distance Table for this step */}
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono text-stone-500">
                      <span className="font-semibold text-stone-400">Khoảng cách:</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        {Object.entries(step.distances).map(([node, dist]) => (
                          <span
                            key={node}
                            className={`px-1 rounded ${
                              node === step.activeNode
                                ? "bg-[#EAF3B2] text-[#243355]"
                                : step.visitedNodes.includes(node)
                                ? "text-emerald-700"
                                : "text-stone-400"
                            }`}
                          >
                            {node}:{dist}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Action */}
                  <div className="mt-3.5 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-stone-400">
                      Heap: {step.heapItems.map((h) => `(${h.node},${h.dist})`).join(" ")}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-bold text-[#3D568F] group-hover:text-[#243355] flex items-center gap-1 transition-colors"
                    >
                      <span>Mở bước này</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW MODE B: MÔ PHỎNG TƯƠNG TÁC LỚN (INTERACTIVE PLAYBACK CANVAS) */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 Cols): Interactive Simulation Canvas + Bottom Theory & Applications */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Main Simulation Canvas Card */}
            <div className="bg-[#FAFBF7] rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden flex flex-col relative">
              {/* Canvas HUD Top Bar */}
              <div className="p-3.5 px-5 bg-white/90 backdrop-blur-md border-b border-stone-200/70 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 font-bold text-stone-900 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                    <span>ĐANG KHẢO SÁT: NODE {currentStep.activeNode}</span>
                  </span>
                  <span className="text-stone-300">|</span>
                  <span className="text-stone-600 font-semibold">
                    Min-Dist: <strong className="text-stone-900">{currentStep.minDist}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-4 text-stone-500 text-[11px]">
                  <span>ZOOM: <strong>100%</strong></span>
                  <span className="hidden sm:inline">COORD: [X: 42, Y: 18, Z: 0]</span>
                  <span className="hidden sm:inline">FPS: <strong>60.0</strong></span>

                  {/* 2D / 3D Mode Toggle */}
                  <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setViewMode("2d")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        viewMode === "2d" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      Ortho 2D
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("3d")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        viewMode === "3d" ? "bg-[#243355] text-white shadow-2xs" : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      Iso 3D
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive SVG Graph Area with Floating HUD Cards */}
              <div className="relative w-full h-[400px] sm:h-[430px] flex items-center justify-center select-none overflow-hidden bg-gradient-to-b from-[#FDFCFA] to-[#F5F8F2]">
                {/* Floating Widget 1: Priority Queue (Min-Heap) */}
                <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-stone-200/90 shadow-md flex flex-col gap-1.5 max-w-[280px]">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-stone-500">
                    <span>PRIORITY QUEUE (MIN-HEAP)</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-[#3D568F]">O(log V)</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentStep.heapItems.length > 0 ? (
                      currentStep.heapItems.map((item, idx) => (
                        <span
                          key={idx}
                          className={`text-xs font-mono font-bold px-2 py-1 rounded-xl border transition-all ${
                            idx === 0
                              ? "bg-[#EAF3B2] text-[#243355] border-[#D9E69B] shadow-2xs ring-2 ring-[#3D568F]/20"
                              : item.isNew
                              ? "bg-amber-50 text-amber-800 border-amber-200 animate-bounce"
                              : "bg-stone-50 text-stone-600 border-stone-200"
                          }`}
                        >
                          ({item.node}, {item.dist}) {idx === 0 && "▲"}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-mono text-stone-400 italic">Rỗng (Empty)</span>
                    )}
                  </div>
                </div>

                {/* Floating Widget 2: Distance Table DIST[V] */}
                <div className="absolute top-24 left-4 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-stone-200/90 shadow-md flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-stone-500">
                    <span>DISTANCE TABLE DIST[V]</span>
                    <span className="text-[10px] text-stone-400">Src: A</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    {Object.entries(currentStep.distances).map(([node, dist]) => {
                      const isActive = currentStep.activeNode === node;
                      const isVisited = currentStep.visitedNodes.includes(node);
                      return (
                        <div
                          key={node}
                          className={`flex flex-col items-center px-2 py-1 rounded-lg border text-center transition-all ${
                            isActive
                              ? "bg-[#EAF3B2] border-[#D9E69B] text-[#243355] font-extrabold shadow-xs"
                              : isVisited
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
                              : "bg-stone-50 border-stone-200/80 text-stone-500"
                          }`}
                        >
                          <span className="text-[10px] text-stone-400">{node}</span>
                          <span className="font-bold">{dist}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* The SVG Graph Renderer */}
                <svg
                  viewBox="0 0 700 440"
                  className={`w-full h-full transition-transform duration-500 ${
                    viewMode === "3d" ? "perspective-3d" : ""
                  }`}
                >
                  <defs>
                    <filter id="glow-halo" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* 1. Render All Edges */}
                  {data.edges.map((edge, idx) => {
                    const fromNode = data.nodes.find((n) => n.id === edge.from)!;
                    const toNode = data.nodes.find((n) => n.id === edge.to)!;
                    const isRelaxing =
                      currentStep.relaxingEdge &&
                      ((currentStep.relaxingEdge.from === edge.from && currentStep.relaxingEdge.to === edge.to) ||
                        (currentStep.relaxingEdge.from === edge.to && currentStep.relaxingEdge.to === edge.from));
                    const isPath = currentStep.activePathEdges.some(
                      (p) =>
                        (p.from === edge.from && p.to === edge.to) ||
                        (p.from === edge.to && p.to === edge.from)
                    );

                    const midX = (fromNode.x + toNode.x) / 2;
                    const midY = (fromNode.y + toNode.y) / 2;

                    return (
                      <g key={idx}>
                        <line
                          x1={fromNode.x}
                          y1={fromNode.y}
                          x2={toNode.x}
                          y2={toNode.y}
                          stroke={isRelaxing ? "#059669" : isPath ? "#243355" : "#CBD5E1"}
                          strokeWidth={isRelaxing ? 3.5 : isPath ? 3.5 : 2}
                          strokeDasharray={isRelaxing ? "6 4" : "none"}
                          className={isRelaxing ? "animate-pulse" : ""}
                        />
                        <circle cx={midX} cy={midY} r="11" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
                        <text
                          x={midX}
                          y={midY + 4}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="bold"
                          fill={isRelaxing ? "#059669" : "#475569"}
                          fontFamily="monospace"
                        >
                          {edge.weight}
                        </text>

                        {isRelaxing && (
                          <g>
                            <rect
                              x={midX + 12}
                              y={midY - 14}
                              width="52"
                              height="18"
                              rx="5"
                              fill="#EAF3B2"
                              stroke="#D9E69B"
                              strokeWidth="1"
                            />
                            <text
                              x={midX + 38}
                              y={midY - 2}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="bold"
                              fill="#243355"
                              fontFamily="monospace"
                            >
                              Relaxing
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* 2. Render All Nodes */}
                  {data.nodes.map((node) => {
                    const isActive = currentStep.activeNode === node.id;
                    const isVisited = currentStep.visitedNodes.includes(node.id);
                    const distValue = currentStep.distances[node.id];

                    return (
                      <g key={node.id} className="cursor-pointer">
                        {isActive && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r="32"
                            fill="none"
                            stroke="#3D568F"
                            strokeWidth="2.5"
                            opacity="0.4"
                            className="animate-ping"
                          />
                        )}

                        {isVisited && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r="26"
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="2"
                            strokeDasharray="3 3"
                          />
                        )}

                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="22"
                          fill={isActive ? "#243355" : isVisited ? "#EAF3B2" : "white"}
                          stroke={isActive ? "#3D568F" : isVisited ? "#10B981" : "#94A3B8"}
                          strokeWidth={isActive ? 3.5 : 2.5}
                          filter={isActive ? "url(#glow-halo)" : undefined}
                        />

                        <text
                          x={node.x}
                          y={node.y + 6}
                          textAnchor="middle"
                          fontSize="15"
                          fontWeight="900"
                          fill={isActive ? "white" : "#1E293B"}
                          fontFamily="var(--font-headline)"
                        >
                          {node.label}
                        </text>

                        <g>
                          <rect
                            x={node.x - 22}
                            y={node.y + (node.y > 250 ? 28 : -38)}
                            width="44"
                            height="18"
                            rx="6"
                            fill={isActive ? "#EAF3B2" : isVisited ? "#F0FDF4" : "white"}
                            stroke={isActive ? "#D9E69B" : isVisited ? "#86EFAC" : "#E2E8F0"}
                            strokeWidth="1.2"
                          />
                          <text
                            x={node.x}
                            y={node.y + (node.y > 250 ? 41 : -25)}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="bold"
                            fill={isActive ? "#243355" : isVisited ? "#15803D" : "#64748B"}
                            fontFamily="monospace"
                          >
                            d: {distValue}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Bottom Playback & Enhanced Step Controller Bar */}
              <div className="p-4 px-6 bg-white border-t border-stone-200/80 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Control Buttons with Clear "Đi Từng Bước" Action */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStepBackward}
                      disabled={currentStepIndex === 1}
                      className="w-10 h-10 rounded-2xl border border-stone-200 hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center text-stone-700 transition-all cursor-pointer shadow-2xs"
                      title="Lùi 1 bước"
                    >
                      <SkipBackwardFill className="w-4 h-4" />
                    </button>

                    {/* Auto-play Button (fixed & responsive) */}
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className={`px-4 h-10 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] ${
                        isPlaying
                          ? "bg-amber-500 text-stone-900 ring-2 ring-amber-400/50"
                          : "bg-[#243355] hover:bg-[#1A253D] text-[#EAF3B2]"
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <PauseFill className="w-4 h-4" />
                          <span>Đang chạy (Tạm dừng)</span>
                        </>
                      ) : (
                        <>
                          <PlayFill className="w-4 h-4" />
                          <span>Tự động chạy</span>
                        </>
                      )}
                    </button>

                    {/* Explicit "Đi Từng Bước" Button Requested by User */}
                    <button
                      type="button"
                      onClick={handleStepForward}
                      className="px-4 h-10 rounded-2xl bg-[#EAF3B2] hover:bg-[#DFEB9B] text-[#243355] font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] border border-[#D9E69B]"
                      title="Bấm để chuyển sang bước kế tiếp"
                    >
                      <span>⏭ Đi từng bước</span>
                      <span className="font-mono text-[10px] bg-white/70 px-1.5 py-0.2 rounded font-bold">
                        {currentStepIndex}/{totalSteps}
                      </span>
                    </button>

                    {/* Reset Button */}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-10 h-10 rounded-2xl border border-stone-200 hover:bg-stone-50 flex items-center justify-center text-stone-600 transition-all cursor-pointer shadow-2xs"
                      title="Đặt lại từ đầu"
                    >
                      <ArrowCounterclockwise className="w-4 h-4" />
                    </button>

                    {/* Quick Button to Open Grid Gallery */}
                    <button
                      type="button"
                      onClick={() => setDisplayMode("gallery")}
                      className="hidden sm:inline-flex items-center gap-1 text-xs font-mono font-bold text-stone-500 hover:text-[#3D568F] px-3 py-2 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
                    >
                      <GridFill className="w-3 h-3" />
                      <span>Xem lưới các bước</span>
                    </button>
                  </div>

                  {/* Speed selector & Step info */}
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1 text-stone-500">
                      <span>Tốc độ:</span>
                      <select
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                        className="bg-stone-100 font-bold text-stone-800 rounded-lg px-2 py-1 border border-stone-200 outline-none cursor-pointer"
                      >
                        <option value={0.5}>0.5x Chậm</option>
                        <option value={1.0}>1.0x Chuẩn</option>
                        <option value={2.0}>2.0x Nhanh</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-500">TIẾN TRÌNH:</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-[#3D568F] font-bold border border-indigo-200">
                        Bước {currentStepIndex} / {totalSteps}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Text & Interactive Step Scrubber */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-stone-700 font-semibold truncate max-w-xl">
                      ↳ <strong className="text-stone-900">{currentStep.shortSummary}</strong>: {currentStep.statusText}
                    </span>
                    <span className="text-stone-400 font-bold shrink-0">
                      {Math.round((currentStepIndex / totalSteps) * 100)}%
                    </span>
                  </div>

                  {/* Step segments click-to-jump */}
                  <div className="flex items-center gap-1.5 w-full">
                    {data.steps.map((step) => (
                      <button
                        key={step.stepIndex}
                        type="button"
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentStepIndex(step.stepIndex);
                        }}
                        className={`h-2.5 rounded-full flex-1 transition-all cursor-pointer ${
                          step.stepIndex === currentStepIndex
                            ? "bg-[#243355] ring-2 ring-[#3D568F]/40 scale-y-125"
                            : step.stepIndex < currentStepIndex
                            ? "bg-emerald-500"
                            : "bg-stone-200 hover:bg-stone-300"
                        }`}
                        title={`Bước ${step.stepIndex}: ${step.shortSummary}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Under Canvas: Lý Thuyết & Ứng Dụng Thực Tế */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Lý Thuyết Thuật Toán */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-mono font-bold text-stone-900 uppercase tracking-wider">
                      {data.theory.title}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-[#3D568F] border border-indigo-200">
                      {data.theory.paradigm}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 font-[family-name:var(--font-body)] leading-relaxed">
                    {data.theory.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-mono text-stone-600">
                  <div>
                    Thời gian: <strong className="text-stone-900">{data.theory.timeComplexity}</strong>
                  </div>
                  <div>
                    Không gian: <strong className="text-stone-900">{data.theory.spaceComplexity}</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Ứng Dụng Thực Tế Của Thuật Toán */}
              <div className="bg-gradient-to-br from-[#FDFDF7] to-[#F3F7DC] p-5 rounded-3xl border border-[#D9E69B] shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-mono font-bold text-[#243355] uppercase tracking-wider">
                      {data.realWorldApp.title}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#EAF3B2] text-[#243355] border border-[#D9E69B]">
                      {data.realWorldApp.badge}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 font-[family-name:var(--font-body)] leading-relaxed mb-2.5">
                    {data.realWorldApp.description}
                  </p>
                  <ul className="flex flex-col gap-1.5 text-xs text-stone-600 font-[family-name:var(--font-body)]">
                    {data.realWorldApp.useCases.map((useCase, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#3D568F] font-bold">•</span>
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-[#D9E69B]/60">
                  <a
                    href="#application-guide"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#243355] hover:text-[#3D568F] transition-colors"
                  >
                    <span>{data.realWorldApp.linkText}</span>
                    <BoxArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 Cols): AI Tutor Trợ Giảng & Code / Mã Giả */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Main Interactive Tab Container */}
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs overflow-hidden flex flex-col min-h-[580px]">
              {/* Top Sidebar Tab Switcher */}
              <div className="p-3 bg-stone-50 border-b border-stone-200/70 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab("ai-tutor")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeSidebarTab === "ai-tutor"
                      ? "bg-white text-[#243355] shadow-xs border border-stone-200/80"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  <ChatDotsFill className="w-3.5 h-3.5 text-[#3D568F]" />
                  <span>AI Tutor Trợ Giảng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSidebarTab("code")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeSidebarTab === "code"
                      ? "bg-white text-[#243355] shadow-xs border border-stone-200/80"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  <CodeSlash className="w-3.5 h-3.5 text-[#3D568F]" />
                  <span>Code & Mã Giả</span>
                </button>
              </div>

              {/* TAB CONTENT 1: AI Tutor Trợ Giảng */}
              {activeSidebarTab === "ai-tutor" && (
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-4">
                    {/* AI Status Banner */}
                    <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#3D568F] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs font-bold text-stone-900">
                          <span>Synapse AI Tutor</span>
                          <CheckCircleFill className="w-3 h-3 text-emerald-600" />
                        </div>
                        <p className="text-[11px] text-stone-500 font-mono">
                          Phân tích từng bước theo thời gian thực
                        </p>
                      </div>
                    </div>

                    {/* Active Step Analysis Box */}
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-stone-200/80 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-stone-500">
                        <span className="text-[#3D568F]">{currentStep.aiAnalysis.title}</span>
                        <span className="text-[10px] text-stone-400 font-normal">vừa xong</span>
                      </div>

                      {/* Short 1-sentence headline */}
                      <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-800">
                        💡 {currentStep.shortSummary}
                      </div>

                      <p className="text-xs text-stone-700 leading-relaxed font-[family-name:var(--font-body)]">
                        {currentStep.aiAnalysis.greeting}
                      </p>

                      {/* Highlight Box for Relaxation / Core Concept */}
                      {currentStep.aiAnalysis.highlightTitle && (
                        <div className="p-3 rounded-xl bg-[#FAFBF2] border border-[#D9E69B] text-xs font-mono text-stone-800 leading-relaxed shadow-2xs">
                          <div className="font-bold text-[#243355] mb-1">
                            {currentStep.aiAnalysis.highlightTitle}
                          </div>
                          <p className="text-[11px] text-stone-600 whitespace-pre-line font-[family-name:var(--font-body)]">
                            {currentStep.aiAnalysis.highlightContent}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quick Suggested Questions */}
                    <div className="flex flex-col gap-2">
                      <div className="text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                        Gợi ý câu hỏi nhanh:
                      </div>
                      {currentStep.aiAnalysis.quickQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleQuickQuestionClick(qIdx)}
                            className="text-left text-xs font-medium text-stone-700 hover:text-[#3D568F] bg-stone-50 hover:bg-[#EAF3B2]/30 p-2.5 rounded-xl border border-stone-200/70 transition-all flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="leading-snug">{q.q}</span>
                            <span className="text-[#3D568F] font-bold shrink-0">→</span>
                          </button>
                          {selectedQuickQuestion === qIdx && (
                            <div className="mt-1.5 p-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-600 leading-relaxed animate-fadeIn">
                              <strong className="text-[#3D568F]">Trả lời:</strong> {q.a}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Chat Messages if user asked */}
                    {chatMessages.length > 0 && (
                      <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                        {chatMessages.map((msg, mIdx) => (
                          <div
                            key={mIdx}
                            className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                              msg.role === "user"
                                ? "bg-[#243355] text-white self-end max-w-[85%]"
                                : "bg-stone-100 text-stone-800 self-start max-w-[90%]"
                            }`}
                          >
                            {msg.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Chat Input Form */}
                  <form onSubmit={handleSendMessage} className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={userChatInput}
                      onChange={(e) => setUserChatInput(e.target.value)}
                      placeholder="Hỏi AI bất kỳ điều gì về bước này..."
                      className="flex-1 bg-stone-100 hover:bg-white focus:bg-white text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-[#3D568F] outline-none transition-all"
                    />
                    <button
                      type="submit"
                      className="w-10 h-10 rounded-xl bg-[#243355] hover:bg-[#1A253D] text-[#EAF3B2] flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      <SendFill className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB CONTENT 2: Code & Mã Giả */}
              {activeSidebarTab === "code" && (
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveCodeLang("cpp")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeCodeLang === "cpp"
                            ? "bg-[#243355] text-white shadow-2xs"
                            : "text-stone-500 hover:text-stone-800"
                        }`}
                      >
                        C++ (STL)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCodeLang("py")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeCodeLang === "py"
                            ? "bg-[#243355] text-white shadow-2xs"
                            : "text-stone-500 hover:text-stone-800"
                        }`}
                      >
                        Python 3
                      </button>
                    </div>

                    <span className="text-[10px] font-mono text-stone-400">
                      Active: Dòng {activeCodeLang === "cpp" ? currentStep.activeCodeLineCpp : currentStep.activeCodeLinePy}
                    </span>
                  </div>

                  <div className="flex-1 bg-[#182133] rounded-2xl p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto text-slate-200 border border-slate-700 shadow-inner max-h-[460px]">
                    {(activeCodeLang === "cpp" ? data.codeCpp : data.codePy).map((line, idx) => {
                      const lineNum = idx + 1;
                      const isActiveLine =
                        lineNum ===
                        (activeCodeLang === "cpp"
                          ? currentStep.activeCodeLineCpp
                          : currentStep.activeCodeLinePy);

                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 px-2 py-0.5 rounded transition-colors ${
                            isActiveLine
                              ? "bg-[#EAF3B2]/25 text-[#EAF3B2] font-bold border-l-2 border-[#EAF3B2]"
                              : "hover:bg-slate-800/50"
                          }`}
                        >
                          <span className="w-5 text-slate-500 text-right select-none text-[10px]">
                            {lineNum}
                          </span>
                          <pre className="flex-1 overflow-visible">{line || " "}</pre>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs font-mono text-stone-600 flex items-center justify-between">
                    <span>Dòng đang thực thi: Relaxation</span>
                    <span className="text-emerald-600 font-bold">● Running</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

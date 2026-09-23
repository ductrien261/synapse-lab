'use client';
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
  ImageFill,
  GearFill,
  X,
  TerminalFill,
  ArrowRepeat,
  Stars,
} from "react-bootstrap-icons";
import type { AlgoDetail } from "@/lib/algo-api";

export interface GraphNode { id: string; label: string; x: number; y: number; distance: number; visited: boolean; isSource?: boolean; isTarget?: boolean; }
export interface GraphEdge { from: string; to: string; weight: number; isHighlighted?: boolean; }
export interface SimulationStep {
  stepIndex: number;
  activeNode: string;
  minDist: number | string;
  statusText?: string;
  shortSummary: string;
  actionExplanation: string;
  visitedNodes: string[];
  relaxingEdge?: { from: string; to: string } | null;
  activePathEdges: { from: string; to: string }[];
  distances: Record<string, number | string>;
  heapItems: { node: string; dist: number | string; isNew?: boolean }[];
  activeCodeLineCpp: number;
  activeCodeLinePy: number;
  aiAnalysis: {
    title: string;
    greeting: string;
    highlightTitle?: string;
    highlightContent?: string;
    quickQuestions: { q: string; a: string }[];
  };
}
export interface RealWorldAppItem { icon: string; title: string; description: string; metric: string; }

const PLACEHOLDER_STEPS: SimulationStep[] = [];
const PLACEHOLDER_NODES: GraphNode[] = [];
const PLACEHOLDER_EDGES: GraphEdge[] = [];
const PLACEHOLDER_APPS: any[] = [];

const FALLBACK_STEP: SimulationStep = {
  stepIndex: 1,
  activeNode: "—",
  minDist: "—",
  statusText: "Chưa có dữ liệu mô phỏng",
  shortSummary: "Chưa có dữ liệu mô phỏng cho thuật toán này",
  actionExplanation: "Xem mã nguồn ở tab Code & Mã Giả.",
  visitedNodes: [],
  relaxingEdge: null,
  activePathEdges: [],
  distances: {},
  heapItems: [],
  activeCodeLineCpp: 1,
  activeCodeLinePy: 1,
  aiAnalysis: {
    title: "TỔNG QUAN",
    greeting: "Dữ liệu mô phỏng từng bước sẽ được bổ sung sau.",
    highlightTitle: "Trực quan hóa",
    highlightContent: "Mã nguồn thật của thuật toán đang hiển thị ở tab bên cạnh.",
    quickQuestions: [
      { q: "Thuật toán này hoạt động như thế nào?", a: "Nội dung đang được admin bổ sung." },
      { q: "Độ phức tạp thời gian là bao nhiêu?", a: "Nội dung đang được admin bổ sung." },
    ],
  },
};

interface Props {
  algorithmDetail?: AlgoDetail | null;
  onBack: () => void;
}

export function AlgorithmSimulationView({ algorithmDetail, onBack }: Props) {
  const data = {
    badge: algorithmDetail?.categoryName?.toUpperCase() || "ALGORITHM",
    sessionCode: algorithmDetail ? `${algorithmDetail.categoryKey}/${algorithmDetail.algorithmKey}` : "",
    title: algorithmDetail?.algorithmName || "Thuật toán",
    description: algorithmDetail?.description || "",
    steps: [] as SimulationStep[],
    nodes: [] as GraphNode[],
    edges: [] as GraphEdge[],
    theory: {
      title: "Lý thuyết thuật toán",
      paradigm: algorithmDetail?.categoryName || "",
      description: algorithmDetail?.description || "Chưa có nội dung, admin sẽ bổ sung.",
      timeComplexity: "—",
      spaceComplexity: "—",
    },
    realWorldApp: {
      title: "Ứng dụng thực tế", badge: "Sắp có",
      description: "Nội dung ứng dụng thực tế sẽ được admin bổ sung.",
      useCases: [] as string[], linkText: "Tìm hiểu thêm",
    },
    codeCpp: [] as string[],
    codePy: [] as string[],
  };

  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [displayMode, setDisplayMode] = useState<"interactive" | "gallery">("interactive");
  const [activeSidebarTab, setActiveSidebarTab] = useState<"ai-tutor" | "code">("code");
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [activeCodeLang, setActiveCodeLang] = useState<"cpp" | "py">("cpp");
  const [selectedQuickQuestion, setSelectedQuickQuestion] = useState<number | null>(null);
  const [userChatInput, setUserChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const [selectedRealWorldApp, setSelectedRealWorldApp] = useState<any>(null);
  const [illustratedAppModal, setIllustratedAppModal] = useState<any>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isExecutingAppCode, setIsExecutingAppCode] = useState(false);
  const [floatingMenu, setFloatingMenu] = useState<{ x: number; y: number; text: string; appId: string } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const totalSteps = data.steps.length || 1;
  const currentStep: SimulationStep = data.steps[currentStepIndex - 1] ?? FALLBACK_STEP;


  // Click-outside listener for floating action menu
  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-floating-menu]")) {
        setTimeout(() => {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed) {
            setFloatingMenu(null);
          }
        }, 150);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, []);

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

  // Real-world practical application handlers
  const handleDetectTextSelection = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length >= 2) {
        const lower = selectedText.toLowerCase();
        let matchedId = "ospf";
        if (
          lower.includes("gps") ||
          lower.includes("map") ||
          lower.includes("bản đồ") ||
          lower.includes("vệ tinh") ||
          lower.includes("tắc nghẽn")
        ) {
          matchedId = "gps";
        } else if (
          lower.includes("logistics") ||
          lower.includes("grab") ||
          lower.includes("shopee") ||
          lower.includes("giao") ||
          lower.includes("hàng không") ||
          lower.includes("hành trình")
        ) {
          matchedId = "logistics";
        } else if (
          lower.includes("điện") ||
          lower.includes("grid") ||
          lower.includes("lưới") ||
          lower.includes("truyền tải")
        ) {
          matchedId = "smartgrid";
        } else if (
          lower.includes("ospf") ||
          lower.includes("router") ||
          lower.includes("mạng") ||
          lower.includes("gói tin") ||
          lower.includes("định tuyến")
        ) {
          matchedId = "ospf";
        }

        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setFloatingMenu({
            x: Math.max(120, rect.left + rect.width / 2),
            y: Math.max(10, rect.top - 8),
            text: selectedText,
            appId: matchedId,
          });
        } catch {
        }
      }
    }, 20);
  };

  const handleGenerateIllustration = (appId: string) => {
    const app = PLACEHOLDER_APPS.find(a => a.title === appId) || null;
    if (!app) { setIllustratedAppModal(app); setFloatingMenu(null); }
  };

  const handleRunPracticalAlgorithm = (appId: string) => {
    const app = PLACEHOLDER_APPS.find(a => a.title === appId) || null;
    if (app) { setSelectedRealWorldApp(app); }
    setActiveSidebarTab("code");
    setFloatingMenu(null);
    setIsExecutingAppCode(true);
    setTerminalLogs([]);


    // Simulate animated terminal logs
    let logIdx = 0;
    const interval = setInterval(() => {
      if (logIdx < app.terminalOutput.length) {
        const nextLog = app.terminalOutput[logIdx];
        setTerminalLogs((prev) => [...prev, nextLog]);
        logIdx++;
      } else {
        clearInterval(interval);
        setIsExecutingAppCode(false);
      }
    }, 250);
  };

  const handleResetToStandardAlgorithm = () => {
    setSelectedRealWorldApp(null);
    setTerminalLogs([]);
    setIsExecutingAppCode(false);
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
  const renderMiniGraph = (step: SimulationStep) => {
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
                <circle cx={node.x} cy={node.y} r="32" fill="none" stroke="#1E3F82" strokeWidth="3" opacity="0.4" />
              )}
              {isVisited && (
                <circle cx={node.x} cy={node.y} r="26" fill="none" stroke="#10B981" strokeWidth="2.5" strokeDasharray="3 3" />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r="22"
                fill={isActive ? "#243355" : isVisited ? "#E8F0FB" : "white"}
                stroke={isActive ? "#1E3F82" : isVisited ? "#10B981" : "#94A3B8"}
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
                fill={isActive ? "#E8F0FB" : isVisited ? "#F0FDF4" : "white"}
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

          <div className="w-11 h-11 rounded-2xl bg-[#5B8FD8]/25 text-[#1E3F82] flex items-center justify-center font-bold shrink-0 border border-[#5B8FD8]/40">
            <Diagram3Fill className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-0.5 text-[11px] font-mono font-bold">
              <span className="px-2 py-0.2 rounded-md bg-[#E8F0FB] text-[#243355] border border-[#D9E69B]">
                {data.badge}
              </span>
              <span className="text-stone-400">•</span>
              <span className="text-stone-500">{data.sessionCode}</span>
            </div>

            <h1 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${displayMode === "interactive"
                ? "bg-white text-[#243355] shadow-xs"
                : "text-stone-600 hover:text-stone-900"
                }`}
            >
              <PlayCircleFill className="w-3.5 h-3.5 text-[#1E3F82]" />
              <span>Mô Phỏng Trực Quan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setDisplayMode("gallery");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${displayMode === "gallery"
                ? "bg-[#243355] text-[#E8F0FB] shadow-xs"
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F0FB]/70 text-[#243355] text-xs font-mono font-bold mb-2 border border-[#D9E69B]">
                <GridFill className="w-3 h-3 text-[#1E3F82]" />
                <span>CHẾ ĐỘ XEM TRỰC QUAN TỪNG BƯỚC (STEP BREAKDOWN)</span>
              </div>
              <h2 className="text-xl font-extrabold text-stone-900">
                Bản Đồ Tuần Tự Toàn Bộ Các Bước Chạy Của Thuật Toán
              </h2>
              <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
                Quan sát đồng thời từng trạng thái đồ thị từ Bước 1 đến khi tìm ra đường đi ngắn nhất. Nhấp vào bất kỳ bước nào để mở mô phỏng chi tiết.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDisplayMode("interactive")}
              className="px-4 py-2.5 rounded-2xl bg-[#243355] hover:bg-[#1A253D] text-[#E8F0FB] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs shrink-0 self-start md:self-center"
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
                  className={`group bg-white rounded-3xl border p-4.5 flex flex-col justify-between transition-all duration-300 cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 ${isCurrent
                    ? "border-[#1E3F82] ring-2 ring-[#1E3F82]/20"
                    : "border-stone-200/90 hover:border-[#1E3F82]/50"
                    }`}
                >
                  <div>
                    {/* Step Card Header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[#243355] text-[#E8F0FB] font-mono font-black text-xs flex items-center justify-center shadow-2xs">
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
                    <div className="w-full h-44 rounded-2xl bg-[#F8FAFC] border border-stone-200/80 p-1 flex items-center justify-center overflow-hidden relative group-hover:border-[#1E3F82]/30 transition-colors">
                      {renderMiniGraph(step)}
                    </div>

                    {/* Short Summary (1-2 sentences simple explanation) */}
                    <div className="mt-3.5">
                      <div className="text-xs font-bold text-stone-900 leading-snug">
                        ↳ {step.shortSummary}
                      </div>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
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
                            className={`px-1 rounded ${node === step.activeNode
                              ? "bg-[#E8F0FB] text-[#243355]"
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
                      className="text-xs font-bold text-[#1E3F82] group-hover:text-[#243355] flex items-center gap-1 transition-colors"
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
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${viewMode === "2d" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500 hover:text-stone-800"
                        }`}
                    >
                      Ortho 2D
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("3d")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${viewMode === "3d" ? "bg-[#243355] text-white shadow-2xs" : "text-stone-500 hover:text-stone-800"
                        }`}
                    >
                      Iso 3D
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive SVG Graph Area with Floating HUD Cards */}
              <div className="relative w-full h-100 sm:h-107.5 flex items-center justify-center select-none overflow-hidden bg-linear-to-b from-[#FDFCFA] to-[#F5F8F2]">
                {/* Floating Widget 1: Priority Queue (Min-Heap) */}
                <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-stone-200/90 shadow-md flex flex-col gap-1.5 max-w-70">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-stone-500">
                    <span>PRIORITY QUEUE (MIN-HEAP)</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-[#1E3F82]">O(log V)</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentStep.heapItems.length > 0 ? (
                      currentStep.heapItems.map((item, idx) => (
                        <span
                          key={idx}
                          className={`text-xs font-mono font-bold px-2 py-1 rounded-xl border transition-all ${idx === 0
                            ? "bg-[#E8F0FB] text-[#243355] border-[#D9E69B] shadow-2xs ring-2 ring-[#1E3F82]/20"
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
                          className={`flex flex-col items-center px-2 py-1 rounded-lg border text-center transition-all ${isActive
                            ? "bg-[#E8F0FB] border-[#D9E69B] text-[#243355] font-extrabold shadow-xs"
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
                  className={`w-full h-full transition-transform duration-500 ${viewMode === "3d" ? "perspective-3d" : ""
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
                              fill="#E8F0FB"
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
                            stroke="#1E3F82"
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
                          fill={isActive ? "#243355" : isVisited ? "#E8F0FB" : "white"}
                          stroke={isActive ? "#1E3F82" : isVisited ? "#10B981" : "#94A3B8"}
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
                            fill={isActive ? "#E8F0FB" : isVisited ? "#F0FDF4" : "white"}
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
                      className={`px-4 h-10 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] ${isPlaying
                        ? "bg-amber-500 text-stone-900 ring-2 ring-amber-400/50"
                        : "bg-[#243355] hover:bg-[#1A253D] text-[#E8F0FB]"
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
                      className="px-4 h-10 rounded-2xl bg-[#E8F0FB] hover:bg-[#DFEB9B] text-[#243355] font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] border border-[#D9E69B]"
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
                      className="hidden sm:inline-flex items-center gap-1 text-xs font-mono font-bold text-stone-500 hover:text-[#1E3F82] px-3 py-2 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
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
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-[#1E3F82] font-bold border border-indigo-200">
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
                        className={`h-2.5 rounded-full flex-1 transition-all cursor-pointer ${step.stepIndex === currentStepIndex
                          ? "bg-[#243355] ring-2 ring-[#1E3F82]/40 scale-y-125"
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
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-[#1E3F82] border border-indigo-200">
                      {data.theory.paradigm}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
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
              <div
                ref={cardRef}
                onMouseUp={handleDetectTextSelection}
                onTouchEnd={handleDetectTextSelection}
                className="bg-linear-to-br from-[#FDFDF7] to-[#F3F7DC] p-5 rounded-3xl border border-[#D9E69B] shadow-2xs flex flex-col justify-between relative select-text"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-mono font-bold text-[#243355] uppercase tracking-wider">
                      {data.realWorldApp.title}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#E8F0FB] text-[#243355] border border-[#D9E69B]">
                      {data.realWorldApp.badge}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed mb-2.5">
                    {data.realWorldApp.description}
                  </p>

                  <ul className="flex flex-col gap-1.5 text-xs text-stone-600">
                    {data.realWorldApp.useCases.map((useCase, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-[#1E3F82] font-bold">•</span>
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-[#D9E69B]/60 flex items-center justify-between">
                  <a
                    href="#application-guide"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#243355] hover:text-[#1E3F82] transition-colors"
                  >
                    <span>{data.realWorldApp.linkText}</span>
                    <BoxArrowUpRight className="w-3 h-3" />
                  </a>

                  {selectedRealWorldApp && (
                    <button
                      type="button"
                      onClick={handleResetToStandardAlgorithm}
                      className="text-xs font-bold text-[#1E3F82] hover:underline flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <ArrowRepeat className="w-3 h-3" />
                      <span>Đặt lại ban đầu</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 Cols): AI Tutor Trợ Giảng & Code / Mã Giả */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Main Interactive Tab Container */}
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs overflow-hidden flex flex-col min-h-145">
              {/* Top Sidebar Tab Switcher */}
              <div className="p-3 bg-stone-50 border-b border-stone-200/70 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab("ai-tutor")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeSidebarTab === "ai-tutor"
                    ? "bg-white text-[#243355] shadow-xs border border-stone-200/80"
                    : "text-stone-500 hover:text-stone-900"
                    }`}
                >
                  <ChatDotsFill className="w-3.5 h-3.5 text-[#1E3F82]" />
                  <span>AI Tutor Trợ Giảng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSidebarTab("code")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeSidebarTab === "code"
                    ? "bg-white text-[#243355] shadow-xs border border-stone-200/80"
                    : "text-stone-500 hover:text-stone-900"
                    }`}
                >
                  <CodeSlash className="w-3.5 h-3.5 text-[#1E3F82]" />
                  <span>Code & Mã Giả</span>
                </button>
              </div>

              {/* TAB CONTENT 1: AI Tutor Trợ Giảng */}
              {activeSidebarTab === "ai-tutor" && (
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-4">
                    {/* AI Status Banner */}
                    <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#1E3F82] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
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
                        <span className="text-[#1E3F82]">{currentStep.aiAnalysis.title}</span>
                        <span className="text-[10px] text-stone-400 font-normal">vừa xong</span>
                      </div>

                      {/* Short 1-sentence headline */}
                      <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-800">
                        💡 {currentStep.shortSummary}
                      </div>

                      <p className="text-xs text-stone-700 leading-relaxed">
                        {currentStep.aiAnalysis.greeting}
                      </p>

                      {/* Highlight Box for Relaxation / Core Concept */}
                      {currentStep.aiAnalysis.highlightTitle && (
                        <div className="p-3 rounded-xl bg-[#FAFBF2] border border-[#D9E69B] text-xs font-mono text-stone-800 leading-relaxed shadow-2xs">
                          <div className="font-bold text-[#243355] mb-1">
                            {currentStep.aiAnalysis.highlightTitle}
                          </div>
                          <p className="text-[11px] text-stone-600 whitespace-pre-line">
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
                            className="text-left text-xs font-medium text-stone-700 hover:text-[#1E3F82] bg-stone-50 hover:bg-[#E8F0FB]/30 p-2.5 rounded-xl border border-stone-200/70 transition-all flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="leading-snug">{q.q}</span>
                            <span className="text-[#1E3F82] font-bold shrink-0">→</span>
                          </button>
                          {selectedQuickQuestion === qIdx && (
                            <div className="mt-1.5 p-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-600 leading-relaxed animate-fadeIn">
                              <strong className="text-[#1E3F82]">Trả lời:</strong> {q.a}
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
                            className={`p-2.5 rounded-xl text-xs leading-relaxed ${msg.role === "user"
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
                      className="flex-1 bg-stone-100 hover:bg-white focus:bg-white text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-[#1E3F82] outline-none transition-all"
                    />
                    <button
                      type="submit"
                      className="w-10 h-10 rounded-xl bg-[#243355] hover:bg-[#1A253D] text-[#E8F0FB] flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      <SendFill className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB CONTENT 2: Code & Mã Giả */}
              {activeSidebarTab === "code" && (
                <div className="p-4 flex-1 flex flex-col gap-3">
                  {/* Real-World Code Notice Banner & Reset Button */}
                  {selectedRealWorldApp ? (
                    <div className="p-3 bg-[#E8F0FB]/50 border border-[#D9E69B] rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <Stars className="w-4 h-4 text-[#1E3F82] shrink-0" />
                        <div>
                          <div className="text-[10px] font-mono text-stone-500 uppercase font-bold">
                            Thuật toán thực tế đang chạy:
                          </div>
                          <div className="text-xs font-bold text-[#243355] leading-tight">
                            {selectedRealWorldApp.title}
                          </div>
                        </div>
                      </div>

                      {/* NÚT ĐẶT LẠI VỀ BAN ĐẦU */}
                      <button
                        type="button"
                        onClick={handleResetToStandardAlgorithm}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-[#243355] text-xs font-mono font-bold border border-stone-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                        title="Reset về code Dijkstra mẫu"
                      >
                        <ArrowRepeat className="w-3.5 h-3.5 text-[#1E3F82]" />
                        <span>Đặt lại ban đầu</span>
                      </button>
                    </div>
                  ) : null}

                  {/* Language Selector */}
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveCodeLang("cpp")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeCodeLang === "cpp"
                          ? "bg-[#243355] text-white shadow-2xs"
                          : "text-stone-500 hover:text-stone-800"
                          }`}
                      >
                        C++ (STL)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCodeLang("py")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeCodeLang === "py"
                          ? "bg-[#243355] text-white shadow-2xs"
                          : "text-stone-500 hover:text-stone-800"
                          }`}
                      >
                        Python 3
                      </button>
                    </div>

                    <span className="text-[10px] font-mono text-stone-400">
                      {selectedRealWorldApp
                        ? `Module: ${selectedRealWorldApp.keyword}`
                        : `Active: Dòng ${activeCodeLang === "cpp" ? currentStep.activeCodeLineCpp : currentStep.activeCodeLinePy}`}
                    </span>
                  </div>

                  {/* File selector tabs if algorithmDetail files available */}
                  {algorithmDetail?.files && algorithmDetail.files.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-1.5 flex-wrap border-b border-stone-200 pb-2">
                        {algorithmDetail.files.map((file, idx) => (
                          <button
                            key={file.name}
                            type="button"
                            onClick={() => setActiveFileIndex(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${activeFileIndex === idx
                              ? "bg-[#1E3F82] text-white shadow-xs"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                              }`}
                          >
                            {file.name}
                          </button>
                        ))}
                      </div>

                      <div className="flex-1 bg-[#182133] rounded-2xl p-4 font-mono text-[11px] leading-relaxed overflow-x-auto text-slate-200 border border-slate-700 shadow-inner max-h-105">
                        {(algorithmDetail.files[activeFileIndex]?.content || "").split("\n").map((line, idx) => (
                          <div key={idx} className="flex items-center gap-3 px-2 py-0.5 hover:bg-slate-800/50 rounded">
                            <span className="w-6 text-slate-500 text-right select-none text-[10px] shrink-0">{idx + 1}</span>
                            <pre className="flex-1 overflow-visible">{line || " "}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 bg-[#182133] rounded-2xl p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto text-slate-200 border border-slate-700 shadow-inner max-h-95">
                      {(activeCodeLang === "cpp" ? data.codeCpp : data.codePy).map((line, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-2 py-0.5 rounded transition-colors hover:bg-slate-800/50">
                          <span className="w-5 text-slate-500 text-right select-none text-[10px]">{idx + 1}</span>
                          <pre className="flex-1 overflow-visible">{line || " "}</pre>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Simulated Terminal Output Box for Practical Code */}
                  {selectedRealWorldApp && (
                    <div className="bg-[#0B1120] rounded-2xl p-3.5 border border-slate-800 text-xs font-mono text-emerald-400 flex flex-col gap-1.5 shadow-md max-h-48 overflow-y-auto animate-fadeIn">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1.5 border-b border-slate-800">
                        <span className="flex items-center gap-1.5 font-bold text-slate-200">
                          <TerminalFill className="w-3 h-3 text-emerald-400" />
                          <span>Console Thực Thi Thuật Toán Thực Tế</span>
                        </span>
                        {isExecutingAppCode ? (
                          <span className="text-amber-400 flex items-center gap-1 font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Đang chạy...
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">✓ Hoàn tất (100% OK)</span>
                        )}
                      </div>

                      <div className="space-y-1 pt-1 text-[11px]">
                        {terminalLogs.map((log, lIdx) => (
                          <div key={lIdx} className="leading-relaxed">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Status Ribbon */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs font-mono text-stone-600 flex items-center justify-between">
                    <span>
                      {selectedRealWorldApp
                        ? `Trạng thái: Đang áp dụng cho ${selectedRealWorldApp.keyword}`
                        : "Dòng đang thực thi: Relaxation (Min-Heap)"}
                    </span>
                    <span className="text-emerald-600 font-bold">● Running</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 5. FLOATING ACTION MENU WHEN USER HIGHLIGHTS TEXT */}
      {floatingMenu && (
        <div
          data-floating-menu="true"
          className="fixed z-9999 bg-[#1E293B] text-white p-1.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-1.5 font-mono text-xs animate-fadeIn pointer-events-auto select-none"
          style={{
            left: `${floatingMenu.x}px`,
            top: `${floatingMenu.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          {/* Downward triangle caret */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1E293B] border-r border-b border-slate-700 transform rotate-45 pointer-events-none" />

          <div className="px-2 text-[10px] text-stone-300 font-sans border-r border-slate-700 max-w-35 truncate">
            "{floatingMenu.text}"
          </div>

          <button
            type="button"
            onClick={() => handleGenerateIllustration(floatingMenu.appId)}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <ImageFill className="w-3.5 h-3.5" />
            <span>Sinh hình minh họa</span>
          </button>

          <button
            type="button"
            onClick={() => handleRunPracticalAlgorithm(floatingMenu.appId)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <GearFill className="w-3.5 h-3.5" />
            <span>Thuật toán minh họa</span>
          </button>

          <button
            type="button"
            onClick={() => setFloatingMenu(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer"
            title="Đóng menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6. ILLUSTRATION MODAL (KHI BẤM SINH HÌNH MINH HỌA) */}
      {illustratedAppModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 text-[#1E3F82] flex items-center justify-center">
                  <ImageFill className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-indigo-100 text-[#1E3F82] font-bold">
                      {illustratedAppModal.badge}
                    </span>
                    <span className="text-xs text-stone-400 font-mono">• Đồ thị thực tế</span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900 font-display mt-0.5">
                    {illustratedAppModal.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIllustratedAppModal(null)}
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Rich SVG Graphic Diagram */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="w-full h-72 bg-[#0B1120] rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden p-4 select-none">
                {/* Background grid */}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#5B8FD8 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* SVG Graphics by Diagram Type */}
                {illustratedAppModal.diagramType === "ospf" && (
                  <svg width="100%" height="100%" viewBox="0 0 500 240" className="drop-shadow-lg">
                    {/* Network Links */}
                    <line x1="80" y1="120" x2="200" y2="60" stroke="#475569" strokeWidth="2.5" />
                    <line x1="80" y1="120" x2="200" y2="180" stroke="#475569" strokeWidth="2.5" />
                    <line x1="200" y1="60" x2="340" y2="60" stroke="#38BDF8" strokeWidth="4" strokeDasharray="4, 4" className="animate-pulse" />
                    <line x1="200" y1="180" x2="340" y2="180" stroke="#475569" strokeWidth="2.5" />
                    <line x1="200" y1="60" x2="340" y2="180" stroke="#475569" strokeWidth="2" strokeDasharray="2, 2" />
                    <line x1="340" y1="60" x2="430" y2="120" stroke="#38BDF8" strokeWidth="4" strokeDasharray="4, 4" className="animate-pulse" />
                    <line x1="340" y1="180" x2="430" y2="120" stroke="#475569" strokeWidth="2.5" />

                    {/* Edge weights (Latency in ms) */}
                    <text x="135" y="80" fill="#94A3B8" fontSize="10" fontFamily="monospace">4ms</text>
                    <text x="135" y="165" fill="#94A3B8" fontSize="10" fontFamily="monospace">9ms</text>
                    <text x="260" y="50" fill="#38BDF8" fontSize="11" fontWeight="bold" fontFamily="monospace">2ms (Optimal)</text>
                    <text x="260" y="195" fill="#94A3B8" fontSize="10" fontFamily="monospace">12ms</text>
                    <text x="390" y="80" fill="#38BDF8" fontSize="11" fontWeight="bold" fontFamily="monospace">3ms</text>

                    {/* Router Nodes */}
                    <g transform="translate(80, 120)">
                      <circle r="22" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                      <text textAnchor="middle" y="4" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">R_A</text>
                    </g>
                    <g transform="translate(200, 60)">
                      <circle r="20" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
                      <text textAnchor="middle" y="4" fill="#38BDF8" fontSize="10" fontWeight="bold" fontFamily="monospace">R_B</text>
                    </g>
                    <g transform="translate(200, 180)">
                      <circle r="20" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                      <text textAnchor="middle" y="4" fill="#94A3B8" fontSize="10" fontWeight="bold" fontFamily="monospace">R_C</text>
                    </g>
                    <g transform="translate(340, 60)">
                      <circle r="20" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
                      <text textAnchor="middle" y="4" fill="#38BDF8" fontSize="10" fontWeight="bold" fontFamily="monospace">R_D</text>
                    </g>
                    <g transform="translate(340, 180)">
                      <circle r="20" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                      <text textAnchor="middle" y="4" fill="#94A3B8" fontSize="10" fontWeight="bold" fontFamily="monospace">R_E</text>
                    </g>
                    <g transform="translate(430, 120)">
                      <circle r="22" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                      <text textAnchor="middle" y="4" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="monospace">DEST</text>
                    </g>
                  </svg>
                )}

                {illustratedAppModal.diagramType === "gps" && (
                  <svg width="100%" height="100%" viewBox="0 0 500 240" className="drop-shadow-lg">
                    {/* Street Grid Map */}
                    <rect x="50" y="40" width="80" height="60" rx="6" fill="#1E293B" stroke="#334155" />
                    <rect x="160" y="40" width="90" height="60" rx="6" fill="#1E293B" stroke="#334155" />
                    <rect x="280" y="40" width="100" height="60" rx="6" fill="#1E293B" stroke="#334155" />
                    <rect x="50" y="130" width="80" height="70" rx="6" fill="#1E293B" stroke="#334155" />
                    <rect x="160" y="130" width="90" height="70" rx="6" fill="#1E293B" stroke="#334155" />
                    <rect x="280" y="130" width="100" height="70" rx="6" fill="#1E293B" stroke="#334155" />

                    {/* Congested red road */}
                    <line x1="140" y1="30" x2="140" y2="210" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" />
                    <text x="148" y="90" fill="#EF4444" fontSize="9" fontFamily="monospace">Kẹt xe x2.8</text>

                    {/* Clear green route */}
                    <path d="M 40 115 L 260 115 L 260 30 L 420 30" fill="none" stroke="#10B981" strokeWidth="5" strokeLinecap="round" />
                    <text x="270" y="70" fill="#10B981" fontSize="9" fontWeight="bold" fontFamily="monospace">Tuyến nhanh nhất (18 ph)</text>

                    {/* Start & End Pins */}
                    <circle cx="40" cy="115" r="10" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="40" y="135" fill="#93C5FD" fontSize="9" textAnchor="middle" fontFamily="monospace">Bắt đầu</text>

                    <circle cx="420" cy="30" r="10" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="420" y="50" fill="#FCA5A5" fontSize="9" textAnchor="middle" fontFamily="monospace">Điểm đến</text>
                  </svg>
                )}

                {illustratedAppModal.diagramType === "logistics" && (
                  <svg width="100%" height="100%" viewBox="0 0 500 240" className="drop-shadow-lg">
                    {/* Warehouse Hub Center */}
                    <circle cx="90" cy="120" r="24" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="90" y="124" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">HUB</text>

                    {/* Multi-stop optimized route */}
                    <path d="M 90 120 L 190 60 L 290 80 L 390 150 L 250 180 Z" fill="none" stroke="#F59E0B" strokeWidth="3" strokeDasharray="5, 5" className="animate-pulse" />

                    {/* Delivery Stop Pins */}
                    <circle cx="190" cy="60" r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="190" y="64" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">#1</text>

                    <circle cx="290" cy="80" r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="290" y="84" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">#2</text>

                    <circle cx="390" cy="150" r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="390" y="154" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">#3</text>

                    <circle cx="250" cy="180" r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="250" y="184" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">#4</text>

                    <text x="280" y="215" fill="#FDE68A" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                      Hành trình tối ưu Dijkstra: Tiết kiệm 32% nhiên liệu
                    </text>
                  </svg>
                )}

                {illustratedAppModal.diagramType === "smartgrid" && (
                  <svg width="100%" height="100%" viewBox="0 0 500 240" className="drop-shadow-lg">
                    {/* Power Plant */}
                    <rect x="50" y="90" width="70" height="60" rx="8" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="85" y="125" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">NHÀ MÁY</text>

                    {/* Power Grid Lines */}
                    <line x1="120" y1="120" x2="220" y2="70" stroke="#FBBF24" strokeWidth="4" />
                    <line x1="120" y1="120" x2="220" y2="170" stroke="#475569" strokeWidth="2" />
                    <line x1="220" y1="70" x2="350" y2="100" stroke="#FBBF24" strokeWidth="4" />
                    <line x1="220" y1="170" x2="350" y2="100" stroke="#475569" strokeWidth="2" />
                    <line x1="350" y1="100" x2="440" y2="120" stroke="#10B981" strokeWidth="4" />

                    {/* Substations */}
                    <circle cx="220" cy="70" r="18" fill="#1E293B" stroke="#FBBF24" strokeWidth="2" />
                    <text x="220" y="74" fill="#FBBF24" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">S1 (500kV)</text>

                    <circle cx="220" cy="170" r="18" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                    <text x="220" y="174" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">S2 (220kV)</text>

                    <circle cx="350" cy="100" r="18" fill="#1E293B" stroke="#FBBF24" strokeWidth="2" />
                    <text x="350" y="104" fill="#FBBF24" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">S3</text>

                    {/* Load Center */}
                    <circle cx="440" cy="120" r="22" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="440" y="124" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">TẢI ĐÔ THỊ</text>
                  </svg>
                )}
              </div>

              {/* Caption & Explanation */}
              <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl flex flex-col gap-1.5 text-xs text-stone-700 leading-relaxed font-sans">
                <div className="font-bold text-stone-900 flex items-center gap-1.5 font-mono text-[11px]">
                  <Stars className="w-3.5 h-3.5 text-[#1E3F82]" />
                  <span>Cơ Chế Ứng Dụng Thực Tế:</span>
                </div>
                <p>{illustratedAppModal.description}</p>
                <div className="text-[11px] text-stone-500 font-mono mt-1 pt-1 border-t border-stone-200">
                  {illustratedAppModal.imageCaption}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setIllustratedAppModal(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-bold transition-colors cursor-pointer"
                >
                  Đóng lại
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const appId = illustratedAppModal.id;
                    setIllustratedAppModal(null);
                    handleRunPracticalAlgorithm(appId);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#243355] hover:bg-[#1A253D] text-white font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <GearFill className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Chuyển sang xem & chạy code thuật toán này →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

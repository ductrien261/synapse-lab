import React from "react";
import { ArrowRepeat, BoxSeam, Activity } from "react-bootstrap-icons";

interface Props {
  type: "graph" | "heart" | "sorting" | "brain" | "dp" | "skeleton";
  categoryLabel: string;
  isMed: boolean;
  complexity?: string;
  badgeText: string;
}

export function CourseThumbnail({
  type,
  categoryLabel,
  isMed,
  complexity,
  badgeText,
}: Props) {
  return (
    <div className="relative w-full h-52 rounded-xl overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#2B3B5C] flex items-center justify-center select-none border border-slate-700/50 shadow-inner group/thumb">
      {/* 1. Sci-Fi Holographic 3D Grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #5B8FD8 1px, transparent 1px), linear-gradient(to bottom, #5B8FD8 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Radial vignette glow */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#0F172A]/40 to-[#0F172A]/90 pointer-events-none" />

      {/* 3D Coordinate Crosshairs in corners */}
      <span className="absolute top-2 left-2 text-[9px] font-mono text-white/30 pointer-events-none">
        +
      </span>
      <span className="absolute top-2 right-2 text-[9px] font-mono text-white/30 pointer-events-none">
        +
      </span>
      <span className="absolute bottom-9 left-2 text-[9px] font-mono text-white/30 pointer-events-none">
        +
      </span>
      <span className="absolute bottom-9 right-2 text-[9px] font-mono text-white/30 pointer-events-none">
        +
      </span>

      {/* 2. Top Floating Badges directly on Thumbnail */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase font-mono shadow-md backdrop-blur-md ${
            isMed
              ? "bg-[#1E3F82]/90 text-white border border-[#5B8FD8]/40"
              : "bg-[#E8F0FB] text-[#243355] border border-[#D9E69B]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isMed ? "bg-rose-400 animate-pulse" : "bg-emerald-600 animate-pulse"
            }`}
          />
          <span>{isMed ? "3D Y Sinh" : "Thuật Toán CS"}</span>
        </span>

        {complexity && (
          <span className="bg-black/60 backdrop-blur-md text-white/95 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border border-white/20 shadow-md">
            {complexity}
          </span>
        )}
      </div>

      {/* 3. Dynamic Visual 3D Simulations */}
      {/* HEART 3D SIMULATION */}
      {type === "heart" && (
        <div className="relative flex flex-col items-center justify-center w-full h-full">
          {/* Subtle ECG line running behind heart */}
          <svg
            className="absolute inset-x-0 h-10 w-full opacity-25 text-rose-400 pointer-events-none"
            viewBox="0 0 300 40"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M0 20 L70 20 L80 8 L90 32 L100 15 L110 24 L120 20 L300 20"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>

          {/* 3D Anatomical Heart with Vessels and Pulsing glow */}
          <div className="relative animate-pulse" style={{ animationDuration: "2.4s" }}>
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl scale-125" />
            <svg
              className="w-32 h-28 drop-shadow-[0_8px_24px_rgba(244,63,94,0.5)] relative z-1"
              viewBox="0 0 120 110"
              fill="none"
            >
              <defs>
                <linearGradient id="aorta-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E11D48" />
                  <stop offset="100%" stopColor="#881337" />
                </linearGradient>
                <linearGradient id="heart-ventricle" x1="0%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#FB7185" />
                  <stop offset="40%" stopColor="#E11D48" />
                  <stop offset="100%" stopColor="#4C0519" />
                </linearGradient>
                <linearGradient id="pulmonary-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>

              {/* Superior Vena Cava & Pulmonary Artery */}
              <path
                d="M48 35 C48 16, 58 10, 72 16 C80 20, 84 28, 86 38"
                stroke="url(#aorta-grad)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M38 32 C38 18, 44 14, 52 16"
                stroke="url(#pulmonary-blue)"
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Main Cardiac Muscular Body */}
              <path
                d="M60 98 C24 72, 8 54, 18 32 C26 16, 48 18, 60 36 C72 18, 94 16, 102 32 C112 54, 96 72, 60 98 Z"
                fill="url(#heart-ventricle)"
                stroke="#FFE4E6"
                strokeWidth="1.2"
              />

              {/* Coronary Artery Surface Mesh lines */}
              <path
                d="M56 38 Q50 55 36 68 M52 50 Q62 62 68 76 M74 44 Q80 54 86 64"
                stroke="#FDFDF5"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                opacity="0.75"
              />
            </svg>
          </div>

          <span className="absolute top-12 right-6 bg-[#243355]/80 backdrop-blur-md text-[9px] text-[#E8F0FB] px-2 py-0.5 rounded-full font-mono border border-white/15 flex items-center gap-1 shadow-sm">
            <Activity className="w-3 h-3 text-rose-400 animate-pulse" />
            <span>72 BPM • 3D Mesh</span>
          </span>
        </div>
      )}

      {/* BRAIN ATLAS 3D */}
      {type === "brain" && (
        <div className="relative flex flex-col items-center justify-center w-full h-full">
          <div className="absolute inset-0 bg-[#1E3F82]/25 rounded-full blur-2xl scale-125" />
          <svg
            className="w-36 h-28 text-[#5B8FD8] drop-shadow-[0_8px_24px_rgba(61,86,143,0.5)] relative z-1"
            viewBox="0 0 120 90"
            fill="none"
          >
            <defs>
              <linearGradient id="brain-left" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E3F82" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
              <linearGradient id="brain-right" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4A69A8" />
                <stop offset="100%" stopColor="#253556" />
              </linearGradient>
            </defs>

            {/* Left Hemisphere Lobe */}
            <path
              d="M60 22 C42 16, 18 26, 20 48 C16 66, 35 80, 56 78 C58 72, 56 58, 60 22 Z"
              fill="url(#brain-left)"
              stroke="#5B8FD8"
              strokeWidth="2"
            />
            {/* Right Hemisphere Lobe */}
            <path
              d="M60 22 C78 16, 102 26, 100 48 C104 66, 85 80, 64 78 C62 72, 64 58, 60 22 Z"
              fill="url(#brain-right)"
              stroke="#E8F0FB"
              strokeWidth="2"
            />

            {/* Internal Gyri & Sulci folds */}
            <path
              d="M34 38 Q46 44 40 56 M78 38 Q86 48 76 60 M42 66 Q52 68 56 60"
              stroke="#5B8FD8"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              opacity="0.8"
            />

            {/* Glowing Synaptic Nodes */}
            <circle cx="38" cy="46" r="4.5" fill="#E8F0FB" className="animate-pulse" />
            <circle cx="82" cy="48" r="4.5" fill="#5B8FD8" className="animate-pulse" />
            <circle cx="60" cy="65" r="3.5" fill="#60A5FA" />
            <line
              x1="38"
              y1="46"
              x2="82"
              y2="48"
              stroke="#E8F0FB"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          </svg>
          <span className="absolute top-12 right-6 bg-[#243355]/80 backdrop-blur-md text-[9px] text-[#E8F0FB] px-2 py-0.5 rounded-full font-mono border border-white/15 shadow-sm">
            VR Synapse • 12 Thùy
          </span>
        </div>
      )}

      {/* SKELETON / BIOMECHANICS 3D */}
      {type === "skeleton" && (
        <div className="relative flex flex-col items-center justify-center w-full h-full">
          <svg className="w-36 h-28 text-white relative z-1" viewBox="0 0 140 100" fill="none">
            {/* Kinematic Angle Arc */}
            <path
              d="M70 50 A 28 28 0 0 1 92 32"
              stroke="#E8F0FB"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text x="96" y="32" fill="#E8F0FB" fontSize="9" fontFamily="monospace" fontWeight="bold">
              θ=42°
            </text>

            {/* Upper Bone Segment */}
            <line
              x1="70"
              y1="50"
              x2="32"
              y2="76"
              stroke="#5B8FD8"
              strokeWidth="7"
              strokeLinecap="round"
            />
            {/* Lower Bone Segment */}
            <line
              x1="70"
              y1="50"
              x2="108"
              y2="22"
              stroke="#FDFDF5"
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Joint Pivot Hinge */}
            <circle cx="70" cy="50" r="10" fill="#243355" stroke="#E8F0FB" strokeWidth="2.5" />
            <circle cx="70" cy="50" r="4" fill="#E8F0FB" className="animate-pulse" />

            {/* Muscle Vector Force Arrow */}
            <line
              x1="46"
              y1="66"
              x2="88"
              y2="34"
              stroke="#F43F5E"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            <polygon points="90,32 82,34 86,39" fill="#F43F5E" />
          </svg>
          <span className="absolute top-12 right-6 bg-[#243355]/80 backdrop-blur-md text-[9px] text-[#E8F0FB] px-2 py-0.5 rounded-full font-mono border border-white/15 shadow-sm">
            206 Xương • Vector F
          </span>
        </div>
      )}

      {/* GRAPH / AVL TREE 3D */}
      {type === "graph" && (
        <div className="relative flex flex-col items-center justify-center w-full h-full">
          <svg className="w-38 h-28 text-[#5B8FD8] relative z-1" viewBox="0 0 160 110" fill="none">
            {/* Edges with luminous pulse */}
            <line x1="80" y1="24" x2="42" y2="56" stroke="#E8F0FB" strokeWidth="2.5" />
            <line x1="80" y1="24" x2="118" y2="56" stroke="#5B8FD8" strokeWidth="2" />
            <line x1="42" y1="56" x2="24" y2="88" stroke="#5B8FD8" strokeWidth="1.5" />
            <line x1="42" y1="56" x2="62" y2="88" stroke="#E8F0FB" strokeWidth="2" />
            <line x1="118" y1="56" x2="98" y2="88" stroke="#5B8FD8" strokeWidth="1.5" />
            <line x1="118" y1="56" x2="138" y2="88" stroke="#5B8FD8" strokeWidth="1.5" />

            {/* Tree Nodes */}
            <circle cx="80" cy="24" r="12" fill="#1E3F82" stroke="#E8F0FB" strokeWidth="2.5" />
            <text x="80" y="27" textAnchor="middle" fill="#E8F0FB" fontSize="9" fontWeight="bold">
              50
            </text>

            <circle cx="42" cy="56" r="10" fill="#243355" stroke="#E8F0FB" strokeWidth="2" />
            <text x="42" y="59" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">
              25
            </text>

            <circle cx="118" cy="56" r="10" fill="#243355" stroke="#5B8FD8" strokeWidth="2" />
            <text x="118" y="59" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">
              75
            </text>

            <circle cx="24" cy="88" r="8" fill="#1C273F" stroke="#5B8FD8" strokeWidth="1.5" />
            <circle cx="62" cy="88" r="8" fill="#1E3F82" stroke="#E8F0FB" strokeWidth="2" />
            <circle cx="98" cy="88" r="8" fill="#1C273F" stroke="#5B8FD8" strokeWidth="1.5" />
            <circle cx="138" cy="88" r="8" fill="#1C273F" stroke="#5B8FD8" strokeWidth="1.5" />
          </svg>
          <span className="absolute top-12 right-6 bg-[#243355]/80 backdrop-blur-md text-[9px] text-[#E8F0FB] px-2 py-0.5 rounded-full font-mono border border-white/15 shadow-sm">
            AVL Bal: 0 • Min-Heap
          </span>
        </div>
      )}

      {/* SORTING / EQUALIZER 3D */}
      {type === "sorting" && (
        <div className="relative flex flex-col items-center justify-center w-full h-full">
          <div className="flex items-end gap-1.5 h-24 px-6 mt-1 relative z-1">
            {[25, 60, 40, 88, 52, 98, 32, 76, 92, 65].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`w-3.5 rounded-t-sm transition-all duration-300 relative group/bar ${
                  i === 5
                    ? "bg-[#E8F0FB] shadow-[0_0_14px_rgba(234,243,178,0.8)]"
                    : i === 3 || i === 8
                    ? "bg-[#5B8FD8] shadow-[0_0_8px_rgba(159,186,241,0.5)]"
                    : "bg-[#1E3F82]/80"
                }`}
              >
                {i === 5 && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-[#E8F0FB] font-bold">
                    P
                  </span>
                )}
              </div>
            ))}
          </div>
          <span className="absolute top-12 right-6 bg-[#243355]/80 backdrop-blur-md text-[9px] text-[#E8F0FB] px-2 py-0.5 rounded-full font-mono border border-white/15 shadow-sm">
            QuickSort • Pivot [5]
          </span>
        </div>
      )}

      {/* DYNAMIC PROGRAMMING MATRIX */}
      {type === "dp" && (
        <div className="relative flex flex-col items-center justify-center w-full h-full">
          <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-[#0F172A]/90 rounded-xl border border-[#5B8FD8]/30 shadow-lg relative z-1">
            {["0", "1", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89"].map(
              (val, idx) => (
                <div
                  key={idx}
                  className={`w-8 h-6 flex items-center justify-center text-[10px] font-mono rounded-md font-bold transition-all ${
                    idx === 11
                      ? "bg-[#E8F0FB] text-[#243355] shadow-[0_0_10px_rgba(234,243,178,0.6)]"
                      : idx === 7 || idx === 10
                      ? "bg-[#5B8FD8] text-[#1E293B]"
                      : "bg-white/10 text-white/80"
                  }`}
                >
                  {val}
                </div>
              )
            )}
          </div>
          <span className="absolute top-12 right-6 bg-[#243355]/80 backdrop-blur-md text-[9px] text-[#E8F0FB] px-2 py-0.5 rounded-full font-mono border border-white/15 shadow-sm">
            Memoize • O(N×W)
          </span>
        </div>
      )}

      {/* 4. Interactive Hover Overlay ("Khám phá 3D 360°") */}
      <div className="absolute inset-0 bg-[#0F172A]/75 backdrop-blur-[2px] opacity-0 group-hover/thumb:opacity-100 transition-all duration-250 flex items-center justify-center z-20 pointer-events-none">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#243355] text-xs font-bold shadow-xl shadow-black/30 transform scale-90 group-hover/thumb:scale-100 transition-transform duration-250 border border-white/90">
          <ArrowRepeat className="w-3.5 h-3.5 text-[#1E3F82] animate-spin" style={{ animationDuration: "3s" }} />
          <span>Mô phỏng 3D tương tác</span>
        </span>
      </div>

      {/* 5. Bottom Telemetry Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 py-2 flex items-center justify-between z-10 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/90 font-medium">
          <BoxSeam className="w-3 h-3 text-[#E8F0FB]" />
          <span>{badgeText}</span>
        </div>
        <span className="text-[9px] font-mono text-white/60 uppercase tracking-tight">
          WebGL • 60 FPS
        </span>
      </div>
    </div>
  );
}

'use client';
import { useRouter } from "next/navigation";


import {
  HeartPulseFill,
  CpuFill,
  BoxSeam,
  Diagram3Fill,
  ClockHistory,
  CheckCircleFill,
  AwardFill,
  ChatSquareQuoteFill,
  ArrowRight,
  LightbulbFill,
  Activity,
  PlayFill,
  EyeFill,
  ArrowsAngleExpand,
  ArrowUpRight,
  ShieldCheck,
  LightningChargeFill,
} from "react-bootstrap-icons";


export function DashboardOverview() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onNavigateToCourses = (domain?: "all" | "med" | "cs") => {
    if (domain === "med") router.push("/anatomy");
    else router.push("/algorithms");
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fadeIn">
      {/* 1. Header Overview Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#243355] via-[#2F4371] to-[#3D568F] text-white rounded-3xl p-7 md:p-8 shadow-sm">
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#9FBAF1]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[#EAF3B2]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[#EAF3B2] text-xs font-mono font-bold mb-3.5 border border-white/15">
              <span className="w-2 h-2 rounded-full bg-[#EAF3B2] animate-pulse" />
              KHÔNG GIAN ĐIỀU PHỐI LIÊN NGÀNH • SYNAPSE DUAL-CORE
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight font-[family-name:var(--font-headline)] leading-tight">
              Chào mừng trở lại, Minh! 👋
            </h1>
            <p className="text-sm md:text-base text-white/90 font-medium font-[family-name:var(--font-headline)] mt-2">
              Hôm nay bạn muốn luyện tập chuyên môn nào?
            </p>
            <p className="text-xs text-white/75 font-[family-name:var(--font-body)] mt-1.5 leading-relaxed max-w-xl">
              Đồng bộ hai bán cầu tư duy: Chuyển đổi linh hoạt giữa mô phỏng giải phẫu không gian 3D và cấu trúc dữ liệu thuật toán rời rạc.
            </p>
          </div>

          {/* Sleek Circular Progress & Resume Widget from Course Banner */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl flex items-center gap-4 sm:gap-5 shadow-lg shadow-black/10 shrink-0">
            {/* Circular Progress Ring */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                {/* Background track circle */}
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  className="stroke-white/15"
                  strokeWidth="5"
                  fill="transparent"
                />
                {/* Progress stroke with gradient */}
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="url(#dash-ring-grad)"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - 0.64)}
                  strokeLinecap="round"
                  fill="transparent"
                />
                <defs>
                  <linearGradient id="dash-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#EAF3B2" />
                    <stop offset="100%" stopColor="#9FBAF1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-extrabold font-[family-name:var(--font-headline)] text-white leading-none">
                  64%
                </span>
                <span className="text-[8px] font-mono tracking-tighter text-white/70 mt-0.5">
                  TIẾN ĐỘ
                </span>
              </div>
            </div>

            {/* Info & Action Button */}
            <div className="flex flex-col gap-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-[family-name:var(--font-headline)]">
                  8 / 12 Chuyên đề
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EAF3B2]/20 text-[#EAF3B2] border border-[#EAF3B2]/30 font-semibold">
                  Đang diễn ra
                </span>
              </div>

              <p className="text-[11px] text-white/75 leading-snug">
                Đang học: <span className="text-white font-semibold">Cây AVL & Tim mạch 3D</span>
              </p>

              <button
                type="button"
                onClick={() => onNavigateToCourses("all")}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold bg-[#EAF3B2] hover:bg-[#DFEB9B] text-[#243355] px-3.5 py-1.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-xs w-fit"
              >
                <span>Tiếp tục học ngay</span>
                <span className="text-sm leading-none">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Upgraded 4 KPI Special Feature Cards (Placed right under Header Banner) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: 14.5h • TƯƠNG TÁC 3D */}
        <div className="group bg-white p-5 rounded-3xl border border-stone-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl hover:border-[#3D568F]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-[#3D568F] flex items-center justify-center font-bold shadow-2xs">
                <ClockHistory className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                <span>+2.4h tuần này</span>
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black text-stone-900 font-[family-name:var(--font-headline)]">
                14.5
              </span>
              <span className="text-sm font-bold text-stone-500 font-mono">giờ</span>
            </div>
            <div className="text-xs font-mono font-bold text-stone-700 uppercase tracking-tight mt-1">
              TƯƠNG TÁC 3D TUẦN NÀY
            </div>
          </div>

          {/* Special Feature: Weekly Sparkline Bar Chart */}
          <div className="mt-5 pt-3.5 border-t border-stone-100">
            <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 mb-2">
              <span>Biểu đồ hoạt động</span>
              <span className="font-semibold text-stone-700">Mục tiêu: 15h</span>
            </div>
            <div className="flex items-end justify-between gap-1.5 h-10">
              {[
                { day: "T2", h: 45 },
                { day: "T3", h: 70 },
                { day: "T4", h: 55 },
                { day: "T5", h: 90 },
                { day: "T6", h: 65 },
                { day: "T7", h: 80 },
                { day: "CN", h: 100, active: true },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    style={{ height: `${bar.h}%` }}
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      bar.active
                        ? "bg-[#3D568F] shadow-[0_0_6px_rgba(61,86,143,0.4)]"
                        : "bg-slate-200 group-hover:bg-slate-300"
                    }`}
                  />
                  <span className="text-[9px] font-mono text-stone-400 leading-none">
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: 08/12 • THUẬT TOÁN ĐÃ THÀNH THẠO */}
        <div className="group bg-white p-5 rounded-3xl border border-stone-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl hover:border-[#3D568F]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
                <CheckCircleFill className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200/80">
                <AwardFill className="w-3 h-3 text-sky-600" />
                <span>Top 5% Synapse</span>
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black text-stone-900 font-[family-name:var(--font-headline)]">
                08
              </span>
              <span className="text-sm font-bold text-stone-400 font-mono">/ 12 thuật toán</span>
            </div>
            <div className="text-xs font-mono font-bold text-stone-700 uppercase tracking-tight mt-1">
              THÀNH THẠO TUYỆT ĐỐI
            </div>
          </div>

          {/* Special Feature: Progress Matrix of Algorithms */}
          <div className="mt-5 pt-3.5 border-t border-stone-100">
            <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 mb-2">
              <span>Độ phức tạp tối ưu</span>
              <span className="font-bold text-stone-800 bg-[#EAF3B2] text-[#243355] px-1.5 py-0.5 rounded text-[10px]">
                O(log N)
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((dot) => (
                <div
                  key={dot}
                  title={dot <= 8 ? `Thuật toán ${dot}: Đạt chuẩn Master` : `Thuật toán ${dot}: Đang học`}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    dot <= 8 ? "bg-emerald-500 shadow-2xs" : "bg-stone-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: 12 • CẤU TRÚC GIẢI PHẪU */}
        <div className="group bg-white p-5 rounded-3xl border border-stone-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl hover:border-[#3D568F]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center font-bold shadow-2xs">
                <HeartPulseFill className="w-5 h-5 animate-pulse" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/80">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                <span>Chuẩn y khoa 98%</span>
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black text-stone-900 font-[family-name:var(--font-headline)]">
                12
              </span>
              <span className="text-sm font-bold text-stone-400 font-mono">/ 15 mô hình</span>
            </div>
            <div className="text-xs font-mono font-bold text-stone-700 uppercase tracking-tight mt-1">
              GIẢI PHẪU 3D ĐẠT CHUẨN
            </div>
          </div>

          {/* Special Feature: Category Distribution Badges */}
          <div className="mt-5 pt-3.5 border-t border-stone-100">
            <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 mb-2">
              <span>Phân bổ bóc tách 3D</span>
              <span className="font-semibold text-rose-600">Đạt 80%</span>
            </div>
            <div className="flex items-center justify-between gap-1.5 text-[10px] font-mono">
              <span className="flex-1 py-1 text-center rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200/60">
                Tim: 4/4
              </span>
              <span className="flex-1 py-1 text-center rounded-lg bg-indigo-50 text-[#3D568F] font-bold border border-indigo-200/60">
                Não: 5/6
              </span>
              <span className="flex-1 py-1 text-center rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200/60">
                Khớp: 3/5
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: 92/100 • ĐÁNH GIÁ TỪ AI TUTOR */}
        <div className="group bg-white p-5 rounded-3xl border border-stone-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-xl hover:border-[#3D568F]/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-2xs">
                <LightningChargeFill className="w-5 h-5 animate-pulse" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
                <span>Hạng A+ (Xuất sắc)</span>
              </span>
            </div>

            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-stone-900 font-[family-name:var(--font-headline)]">
                92
              </span>
              <span className="text-sm font-bold text-stone-400 font-mono">/ 100</span>
            </div>
            <div className="text-xs font-mono font-bold text-stone-700 uppercase tracking-tight mt-1">
              ĐÁNH GIÁ TỪ AI TUTOR
            </div>
          </div>

          {/* Special Feature: Dual-Core Brain Sync Meter */}
          <div className="mt-5 pt-3.5 border-t border-stone-100">
            <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 mb-1.5">
              <span>Đồng bộ 2 bán cầu não</span>
              <span className="font-bold text-[#3D568F]">94% Khớp</span>
            </div>
            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden flex p-0.5 border border-stone-200/60">
              <div
                style={{ width: "52%" }}
                className="h-full bg-gradient-to-r from-rose-500 to-[#3D568F] rounded-l-full"
                title="Không gian 3D Y Khoa"
              />
              <div
                style={{ width: "48%" }}
                className="h-full bg-gradient-to-r from-[#3D568F] to-[#EAF3B2] rounded-r-full"
                title="Logic Thuật Toán CS"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dual-Track Hub Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Track A: Medical 3D */}
        <div className="group bg-white rounded-3xl border border-stone-200/90 hover:border-[#3D568F]/60 p-6 md:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-8px_rgba(61,86,143,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />

          <div>
            {/* Header & Badges */}
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-xs">
                <HeartPulseFill className="w-6 h-6 animate-pulse" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 text-xs font-mono font-bold shadow-2xs">
                <BoxSeam className="w-3.5 h-3.5" />
                <span>18 Mô hình tương tác</span>
              </span>
            </div>

            {/* Sub-label & Title */}
            <div className="text-xs font-mono font-extrabold text-rose-600 tracking-wider uppercase mb-1">
              TRACK A • BIO-SPATIAL 3D
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-stone-900 font-[family-name:var(--font-headline)] group-hover:text-[#3D568F] transition-colors">
              Y Khoa & Giải Phẫu Học 3D
            </h2>
            <p className="text-xs text-stone-500 mt-2.5 leading-relaxed font-[family-name:var(--font-body)]">
              Khám phá giải phẫu tim, hệ thần kinh trung ương, vòng tuần hoàn vi mô và bài kiểm tra lâm sàng trực quan hóa với độ chính xác chuẩn y khoa.
            </p>

            {/* Metrics Triplet */}
            <div className="grid grid-cols-3 gap-3 my-6">
              <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-stone-200/70 text-left">
                <span className="block text-[11px] font-mono text-stone-500">Độ phóng đại</span>
                <span className="text-base font-extrabold text-stone-800 font-[family-name:var(--font-headline)] mt-0.5 block">
                  40x Micro
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-stone-200/70 text-left">
                <span className="block text-[11px] font-mono text-stone-500">Lớp cắt MRI</span>
                <span className="text-base font-extrabold text-stone-800 font-[family-name:var(--font-headline)] mt-0.5 block">
                  256 Lớp
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-stone-200/70 text-left">
                <span className="block text-[11px] font-mono text-stone-500">Đã mở khóa</span>
                <span className="text-base font-extrabold text-rose-600 font-[family-name:var(--font-headline)] mt-0.5 block">
                  82% Atlas
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateToCourses("med")}
              className="flex-1 py-3 px-5 rounded-xl bg-[#3D568F] hover:bg-[#2F4371] text-white text-xs font-bold shadow-md shadow-[#3D568F]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 group/btn"
            >
              <span>Vào Không Gian Y Khoa</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateToCourses("med")}
              title="Mở toàn cảnh 3D"
              className="w-11 h-11 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white text-stone-600 hover:text-[#3D568F] flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              <ArrowsAngleExpand className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Track B: Computer Science */}
        <div className="group bg-white rounded-3xl border border-stone-200/90 hover:border-[#3D568F]/60 p-6 md:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-8px_rgba(61,86,143,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />

          <div>
            {/* Header & Badges */}
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF3B2]/50 border border-[#D9E69B] flex items-center justify-center text-[#243355] shadow-xs">
                <CpuFill className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3B2]/50 text-[#243355] border border-[#D9E69B] text-xs font-mono font-bold shadow-2xs">
                <Diagram3Fill className="w-3.5 h-3.5" />
                <span>24 Thuật toán tương tác</span>
              </span>
            </div>

            {/* Sub-label & Title */}
            <div className="text-xs font-mono font-extrabold text-[#3D568F] tracking-wider uppercase mb-1">
              TRACK B • DISCRETE LOGIC
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-stone-900 font-[family-name:var(--font-headline)] group-hover:text-[#3D568F] transition-colors">
              Khoa Học Máy Tính & Thuật Toán
            </h2>
            <p className="text-xs text-stone-500 mt-2.5 leading-relaxed font-[family-name:var(--font-body)]">
              Mô phỏng trực quan Step-by-Step Graph, Dynamic Programming, Tree Balancing, kiểm thử con trỏ và thực thi mã nguồn từng câu lệnh.
            </p>

            {/* Metrics Triplet */}
            <div className="grid grid-cols-3 gap-3 my-6">
              <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-stone-200/70 text-left">
                <span className="block text-[11px] font-mono text-stone-500">Độ phức tạp TB</span>
                <span className="text-base font-extrabold text-stone-800 font-[family-name:var(--font-headline)] mt-0.5 block font-mono">
                  O(log N)
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-stone-200/70 text-left">
                <span className="block text-[11px] font-mono text-stone-500">Kiểm thử Code</span>
                <span className="text-base font-extrabold text-stone-800 font-[family-name:var(--font-headline)] mt-0.5 block">
                  Python/C++
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-stone-200/70 text-left">
                <span className="block text-[11px] font-mono text-stone-500">Thử thách qua</span>
                <span className="text-base font-extrabold text-[#3D568F] font-[family-name:var(--font-headline)] mt-0.5 block">
                  19 / 24
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateToCourses("cs")}
              className="flex-1 py-3 px-5 rounded-xl bg-[#EAF3B2] hover:bg-[#DFEB9B] text-[#243355] text-xs font-extrabold shadow-md shadow-[#EAF3B2]/30 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 group/btn"
            >
              <span>Vào Không Gian Thuật Toán</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateToCourses("cs")}
              title="Mở cửa sổ code"
              className="w-11 h-11 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white text-stone-600 hover:text-[#3D568F] flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              <EyeFill className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Two-Column WIP & AI Tutor Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tiếp tục bài học đang dở (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <PlayFill className="w-4 h-4 text-[#3D568F]" />
              <h3 className="text-base font-bold text-stone-900 font-[family-name:var(--font-headline)]">
                Tiếp tục bài học đang dở
              </h3>
            </div>
            <span className="text-xs font-mono text-stone-500 font-medium">
              2 bài học cần hoàn thành hôm nay
            </span>
          </div>

          {/* Lesson Card 1: Tim Mạch 3D */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
            {/* Viewport mini preview */}
            <div className="w-full sm:w-36 h-28 bg-[#1B253D] rounded-xl flex items-center justify-center relative overflow-hidden shrink-0 border border-slate-700/60 shadow-inner">
              <div className="absolute top-1.5 left-2 text-[9px] font-mono text-white/70">
                Layer 4/6
              </div>
              <HeartPulseFill className="w-12 h-12 text-rose-500 animate-pulse drop-shadow-[0_4px_12px_rgba(244,63,94,0.4)]" />
              <span className="absolute bottom-1 right-2 text-[8px] font-mono text-[#EAF3B2]">
                360° MESH
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-rose-600 font-bold uppercase">HỆ TUẦN HOÀN TIM MẠCH</span>
                  <span className="font-extrabold text-stone-800">65% Hoàn tất</span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 font-[family-name:var(--font-headline)] leading-snug">
                  Giải phẫu Tim người & Vòng tuần hoàn lớn
                </h4>
                <p className="text-xs text-stone-500 mt-1 font-[family-name:var(--font-body)]">
                  Đang ở bước: <strong className="text-stone-700">Van 2 lá & Van 3 lá trong chu kỳ tâm thất</strong>
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-100">
                <span className="text-[11px] font-mono text-stone-400">
                  ⏱ Còn khoảng 18 phút
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onOpenCourseDetail ? onOpenCourseDetail("med-201") : onNavigateToCourses("med")
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-[#3D568F] hover:bg-[#2F4371] text-white text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Tiếp tục học ngay</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Lesson Card 2: Dijkstra CS */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
            {/* Viewport mini preview */}
            <div className="w-full sm:w-36 h-28 bg-[#1B253D] rounded-xl flex items-center justify-center relative overflow-hidden shrink-0 border border-slate-700/60 shadow-inner">
              <div className="absolute top-1.5 left-2 text-[9px] font-mono text-white/70">
                Step 12/30
              </div>
              <Diagram3Fill className="w-12 h-12 text-[#EAF3B2] drop-shadow-[0_4px_12px_rgba(234,243,178,0.4)]" />
              <span className="absolute bottom-1 right-2 text-[8px] font-mono text-[#9FBAF1]">
                MIN-HEAP
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-[#3D568F] font-bold uppercase">SHORTEST PATH ROUTING</span>
                  <span className="font-extrabold text-stone-800">60% Hoàn tất</span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 font-[family-name:var(--font-headline)] leading-snug">
                  Thuật toán Dijkstra & Tìm đường đi ngắn nhất
                </h4>
                <p className="text-xs text-stone-500 mt-1 font-[family-name:var(--font-body)]">
                  Đang ở bước: <strong className="text-stone-700">Min-Heap Relaxation & Cập nhật trọng số đỉnh</strong>
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-100">
                <span className="text-[11px] font-mono text-stone-400">
                  ⏱ Còn khoảng 25 phút
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onOpenCourseDetail ? onOpenCourseDetail("cs-504") : onNavigateToCourses("cs")
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-[#EAF3B2] hover:bg-[#DFEB9B] text-[#243355] text-xs font-extrabold shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Chạy mô phỏng</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Đề xuất từ AI Tutor (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <LightbulbFill className="w-4 h-4 text-amber-500" />
              <h3 className="text-base font-bold text-stone-900 font-[family-name:var(--font-headline)]">
                Đề xuất từ AI Tutor
              </h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#3D568F]/10 text-[#3D568F] font-bold">
              3 cá nhân hóa
            </span>
          </div>

          {/* Suggestion 1 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                Ôn tập ngắt quãng
              </span>
              <span className="text-[11px] font-mono text-stone-400">5 thẻ • 6 phút</span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-stone-900 font-[family-name:var(--font-headline)]">
              Flashcard 3D: Cấu trúc Thùy Trán vs Thùy Đỉnh
            </h4>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed font-[family-name:var(--font-body)]">
              Phát hiện tỷ lệ nhầm lẫn rãnh trung tâm (Rolando) ở quiz trước đạt 34%. Cần xoay mô hình đa hướng để củng cố phản xạ không gian.
            </p>
            <div className="mt-3 pt-2.5 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => onNavigateToCourses("med")}
                className="text-xs font-bold text-[#3D568F] hover:text-[#243355] flex items-center gap-1 cursor-pointer group/link"
              >
                <span>Bắt đầu ôn tập</span>
                <span className="transition-transform group-hover/link:translate-x-1">→</span>
              </button>
            </div>
          </div>

          {/* Suggestion 2 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                Thử thách Code
              </span>
              <span className="text-[11px] font-mono text-stone-400">1 bài test • 8 phút</span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-stone-900 font-[family-name:var(--font-headline)]">
              Edge Case: QuickSort khi mảng đã sắp xếp
            </h4>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed font-[family-name:var(--font-body)]">
              Thực hành chọn Pivot (Lomuto vs Hoare) để tránh thoái hóa thời gian chạy thành O(N²) và overflow call stack trong bộ nhớ đệm.
            </p>
            <div className="mt-3 pt-2.5 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => onNavigateToCourses("cs")}
                className="text-xs font-bold text-[#3D568F] hover:text-[#243355] flex items-center gap-1 cursor-pointer group/link"
              >
                <span>Vào Debugger</span>
                <span className="transition-transform group-hover/link:translate-x-1">→</span>
              </button>
            </div>
          </div>

          {/* Mẹo ghi nhớ liên kết */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F4F6F9] to-[#EAF3B2]/30 border border-stone-200/80 flex items-start gap-3">
            <LightbulbFill className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-stone-700 leading-relaxed font-[family-name:var(--font-body)]">
              <strong>Mẹo liên kết:</strong> Cung động mạch chủ uốn cong phân nhánh tương tự cấu trúc rẽ nhánh của cây nhị phân cân bằng (AVL Tree). Học đối sánh sẽ gia tăng phản xạ ghi nhớ sâu.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Bottom Live Activity Telemetry Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono font-bold text-stone-700 uppercase tracking-wider">
            SYNAPSE Live Core Activity
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-stone-600">
          <div>
            AI Engine: <strong className="text-stone-900">142 ms</strong>
          </div>
          <div>
            Render 3D: <strong className="text-emerald-600">60 FPS</strong>
          </div>
          <div>
            Đồng bộ Cloud: <strong className="text-[#3D568F]">100% Khớp</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

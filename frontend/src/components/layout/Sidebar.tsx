import React from "react";
import {
  Grid1x2Fill,
  JournalBookmarkFill,
  Diagram3Fill,
  LightningChargeFill,
  GraphUpArrow,
  Gear,
  QuestionCircle,
} from "react-bootstrap-icons";

interface Props {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export function Sidebar({ activeTab, onSelectTab }: Props) {
  const navItems = [
    {
      id: "overview",
      label: "Tổng quan",
      icon: <Grid1x2Fill className="w-[18px] h-[18px]" />,
    },
    {
      id: "courses",
      label: "Khóa học & Chuyên đề",
      icon: <JournalBookmarkFill className="w-[18px] h-[18px]" />,
    },
    {
      id: "simulations",
      label: "Phòng mô phỏng 3D & Thuật toán",
      icon: <Diagram3Fill className="w-[18px] h-[18px]" />,
    },
    {
      id: "ai-practice",
      label: "Luyện tập cùng AI",
      icon: <LightningChargeFill className="w-[18px] h-[18px]" />,
    },
    {
      id: "analytics",
      label: "Thống kê & Tiến độ",
      icon: <GraphUpArrow className="w-[18px] h-[18px]" />,
    },
  ];

  return (
    <aside className="w-72 bg-white border-r border-stone-200/80 min-h-[calc(100vh-64px)] flex flex-col justify-between p-5 shrink-0 shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col gap-6">
        {/* Header Label */}
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-xs font-mono font-bold tracking-wider text-stone-500 uppercase">
            ĐIỀU HƯỚNG NỀN TẢNG
          </span>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF3B2] text-[#344015] border border-[#D8E4AB]">
            v2.4 Pro
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
                  isActive
                    ? "bg-[#3D568F] text-white shadow-md shadow-[#3D568F]/20"
                    : "text-stone-600 hover:text-stone-900 hover:bg-[#F4F6F9]"
                }`}
              >
                <span
                  className={`shrink-0 transition-colors ${
                    isActive ? "text-[#EAF3B2]" : "text-stone-500"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="leading-snug">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area */}
      <div className="flex flex-col gap-5 pt-4">
        {/* Dual Study Session Card */}
        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
            <span className="text-stone-700">PHIÊN HỌC TẬP KÉP</span>
            <span className="text-[#3D568F] bg-[#9FBAF1]/25 px-2 py-0.5 rounded-md">34%</span>
          </div>
          <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden mb-2.5">
            <div className="h-full bg-gradient-to-r from-[#3D568F] to-[#9FBAF1] rounded-full w-[34%]" />
          </div>
          <p className="text-xs text-stone-500 leading-relaxed font-sans">
            Đang đồng bộ: <strong>Tim mạch (3D)</strong> & <strong>Cây AVL (CS)</strong>
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-2 pt-3 border-t border-stone-100 text-xs font-semibold text-stone-500">
          <button className="hover:text-[#3D568F] transition-colors flex items-center gap-2 cursor-pointer py-1">
            <Gear className="w-4 h-4 text-stone-500" />
            <span>Cài đặt</span>
          </button>
          <button className="hover:text-[#3D568F] transition-colors flex items-center gap-2 cursor-pointer py-1">
            <QuestionCircle className="w-4 h-4 text-stone-500" />
            <span>Trợ giúp</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

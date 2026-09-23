import React, { useState } from "react";

export function RequestBanner() {
  const [requestText, setRequestText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setRequestText("");
      setSubmitted(false);
    }, 3000);
  };

  return (
    <section className="bg-gradient-to-br from-[#FDFDF5] to-[#F5F8E6] rounded-2xl border border-[#D8E4AB] p-8 shadow-xs my-8 relative overflow-hidden">
      {/* Decorative subtle background accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#E8F0FB]/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#5B8FD8]/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F0FB] text-[#364214] text-[11px] font-mono font-semibold mb-3 border border-[#D8E4AB]">
          <span>KHU VỰC ĐỀ XUẤT NGHIÊN CỨU</span>
          <span>•</span>
          <span>AI Synthesizer On-Demand</span>
        </div>

        {/* Headline */}
        <h2 className="text-xl md:text-2xl font-bold text-[#1E232E] tracking-tight">
          Chưa tìm thấy mô hình giải phẫu hoặc cấu trúc thuật toán bạn cần?
        </h2>

        {/* Description */}
        <p className="text-xs md:text-sm text-stone-600 mt-2 leading-relaxed">
          Gửi yêu cầu chuyên đề mới. Hệ thống <strong>AI Tutor</strong> và đội ngũ biên soạn Synapse sẽ tự động dựng mô hình giải phẫu 3D DICOM hoặc biên dịch tương tác mã nguồn thuật toán theo giáo trình đại học của bạn trong vòng 24 giờ.
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col sm:flex-row gap-3 max-w-xl">
          <div className="relative flex-1">
            <input
              type="text"
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="Nhập tên thuật toán hoặc cơ quan (vd: Red-Black Tree, Cầu não...)"
              className="w-full px-4 py-3 text-xs rounded-xl bg-white border border-[#D8E4AB] text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:border-[var(--primary)] focus:ring-2 focus:ring-[#1E3F82]/20 font-mono transition-all"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
          >
            <span>⚛</span>
            <span>{submitted ? "Đã gửi yêu cầu ✓" : "Gửi yêu cầu khởi tạo"}</span>
          </button>
        </form>
      </div>
    </section>
  );
}

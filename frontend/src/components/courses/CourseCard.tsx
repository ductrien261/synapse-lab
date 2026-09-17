import React from "react";
import { Course } from "@/data/courses";
import { CourseThumbnail } from "./CourseThumbnail";
import { ArrowRight, ArrowRepeat } from "react-bootstrap-icons";

interface Props {
  course: Course;
  onSelect?: (courseId: string) => void;
}

export function CourseCard({ course, onSelect }: Props) {
  const isMed = course.category === "med";

  // Level dot color mapping
  const getLevelDotColor = (lvl: string) => {
    if (lvl.includes("Cơ sở")) return "bg-emerald-500";
    if (lvl.includes("Trung cấp")) return "bg-sky-500";
    return "bg-amber-500";
  };

  return (
    <article
      onClick={() => onSelect?.(course.id)}
      className="group bg-white rounded-2xl border border-stone-200/90 hover:border-[#3D568F]/50 p-3.5 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(36,51,85,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
    >
      <div>
        {/* Top 3D Simulation Viewport with interactive overlay */}
        <CourseThumbnail
          type={course.thumbnailType}
          categoryLabel={course.categoryLabel}
          isMed={isMed}
          complexity={course.complexity}
          badgeText={course.badgeText}
        />

        {/* Content Body */}
        <div className="pt-3.5 px-1">
          {/* Metadata Row */}
          <div className="flex items-center gap-2 text-xs font-mono mb-2">
            <span className="font-extrabold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200 shadow-2xs">
              {course.code}
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-stone-600 font-semibold">{course.credits} Tín chỉ</span>
            <span className="text-stone-300">•</span>
            <div className="flex items-center gap-1.5 text-stone-600 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${getLevelDotColor(course.level)}`} />
              <span>{course.level}</span>
            </div>
          </div>

          {/* Title with balanced 2 lines */}
          <h3 className="text-[15px] sm:text-base font-bold text-stone-900 group-hover:text-[#3D568F] transition-colors line-clamp-2 min-h-[2.8rem] leading-snug font-[family-name:var(--font-headline)]">
            {course.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-stone-500 mt-1.5 line-clamp-2 leading-relaxed font-[family-name:var(--font-body)] min-h-[2.5rem]">
            {course.description}
          </p>

          {/* Modern Hashtag Chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {course.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#F4F6F9] hover:bg-[#EAF3B2]/40 text-stone-600 hover:text-[#243355] border border-stone-200/70 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Progress & Bottom Bar */}
      <div className="pt-4 px-1 mt-2">
        {/* Progress Bar Widget */}
        <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-stone-200/70 mb-3">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500 mb-1.5">
            <span className="font-medium">
              Tiến độ: <strong className="text-stone-800">{course.completedTopics}/{course.totalTopics}</strong> {course.unitLabel}
            </span>
            <span className="font-bold text-stone-900 font-mono">{course.progress}%</span>
          </div>
          <div className="w-full h-2 bg-stone-200/80 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                course.progress === 100
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "bg-gradient-to-r from-[#3D568F] via-[#6384C6] to-[#9FBAF1]"
              }`}
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="truncate max-w-[130px] font-semibold text-stone-600">
              {course.statusBadge}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(course.id);
            }}
            className={`group/btn text-xs font-bold py-2 px-3.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
              course.actionType === "outlined"
                ? "border border-stone-300 text-stone-700 hover:bg-stone-100 hover:border-stone-400"
                : "bg-[#3D568F] text-white hover:bg-[#2F4371] shadow-xs hover:shadow-md hover:shadow-[#3D568F]/25"
            }`}
          >
            <span>{course.actionText}</span>
            {course.actionType === "outlined" ? (
              <ArrowRepeat className="w-3 h-3 transition-transform duration-300 group-hover/btn:-rotate-180" />
            ) : (
              <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover/btn:translate-x-1" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

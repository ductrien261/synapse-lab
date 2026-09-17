'use client';

import { useState, useMemo } from "react";
import { COURSES_DATA } from "@/data/courses";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { FilterSection } from "@/components/courses/FilterSection";
import { CourseCard } from "@/components/courses/CourseCard";
import { RequestBanner } from "@/components/courses/RequestBanner";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { AlgorithmDetailView } from "@/components/courses/AlgorithmDetailView";
import { AlgorithmSimulationView } from "@/components/simulation/AlgorithmSimulationView";

export default function Home() {
  const [activeNavTab, setActiveNavTab] = useState("overview");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeSimulationLessonId, setActiveSimulationLessonId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<"all" | "med" | "cs">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter courses based on domain, search, level, and tag
  const filteredCourses = useMemo(() => {
    return COURSES_DATA.filter((course) => {
      // Domain filter
      if (selectedDomain !== "all" && course.category !== selectedDomain) {
        return false;
      }

      // Level filter
      if (selectedLevel !== "all" && !course.level.toLowerCase().includes(selectedLevel.toLowerCase())) {
        return false;
      }

      // Quick Tag filter
      if (selectedTag) {
        const matchesTag = course.tags.some((t) =>
          t.toLowerCase().includes(selectedTag.toLowerCase())
        );
        const matchesTitle = course.title.toLowerCase().includes(selectedTag.toLowerCase());
        if (!matchesTag && !matchesTitle) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = course.title.toLowerCase().includes(query);
        const matchCode = course.code.toLowerCase().includes(query);
        const matchDesc = course.description.toLowerCase().includes(query);
        const matchTag = course.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchCode && !matchDesc && !matchTag) return false;
      }

      return true;
    });
  }, [selectedDomain, selectedLevel, selectedTag, searchQuery]);

  // Counts for category badges
  const counts = useMemo(() => {
    const med = COURSES_DATA.filter((c) => c.category === "med").length;
    const cs = COURSES_DATA.filter((c) => c.category === "cs").length;
    return { all: COURSES_DATA.length, med, cs };
  }, []);

  const handleResetFilters = () => {
    setSelectedDomain("all");
    setSearchQuery("");
    setSelectedLevel("all");
    setSelectedTag(null);
  };

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
  };

  const handleNavigateToCourses = (domainFilter?: "all" | "med" | "cs") => {
    if (domainFilter) {
      setSelectedDomain(domainFilter);
    }
    setActiveNavTab("courses");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col antialiased">
      {/* Top Global Header */}
      <Header />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex w-full">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={
            activeSimulationLessonId || selectedCourseId ? "courses" : activeNavTab
          }
          onSelectTab={(tab) => {
            setActiveSimulationLessonId(null);
            setSelectedCourseId(null);
            setActiveNavTab(tab);
          }}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
          {activeSimulationLessonId ? (
            <AlgorithmSimulationView
              lessonId={activeSimulationLessonId}
              onBack={() => setActiveSimulationLessonId(null)}
            />
          ) : selectedCourseId ? (
            <AlgorithmDetailView
              onBack={() => setSelectedCourseId(null)}
              onOpenSimulation={(lessonId) => setActiveSimulationLessonId(lessonId)}
            />
          ) : activeNavTab === "overview" ? (
            <DashboardOverview
              onNavigateToCourses={handleNavigateToCourses}
              onOpenCourseDetail={(id) => setSelectedCourseId(id)}
            />
          ) : (
            <>
              {/* Main Filter Section */}
              <FilterSection
                activeTab={selectedDomain}
                onTabChange={setSelectedDomain}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedLevel={selectedLevel}
                onLevelChange={setSelectedLevel}
                selectedTag={selectedTag}
                onTagClick={handleTagClick}
                onReset={handleResetFilters}
                counts={counts}
              />

              {/* Course Cards Grid */}
              {filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      onSelect={(id) => setSelectedCourseId(id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[var(--border)] p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="text-3xl">🔍</div>
                  <h4 className="font-bold text-base text-stone-800">Không tìm thấy chuyên đề phù hợp</h4>
                  <p className="text-xs text-stone-500 max-w-md font-mono">
                    Không có chuyên đề nào khớp với từ khóa & bộ lọc hiện tại. Bạn có thể nhấn nút đặt lại hoặc gửi yêu cầu tổng hợp mới bên dưới.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="btn btn-primary text-xs mt-2"
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              )}

              {/* AI On-Demand Request Banner */}
              <RequestBanner />

              {/* Pagination Footer */}
              <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-12 border-t border-[var(--border)] text-xs font-mono text-stone-500">
                <div>
                  Hiển thị <strong>{filteredCourses.length}</strong> trong tổng số {COURSES_DATA.length} chuyên đề học tập kép
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
                  >
                    ‹
                  </button>
                  <button
                    className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-colors cursor-pointer ${
                      currentPage === 1
                        ? "bg-[var(--primary)] text-white shadow-2xs"
                        : "border border-[var(--border)] hover:bg-white"
                    }`}
                    onClick={() => setCurrentPage(1)}
                  >
                    1
                  </button>
                  <button
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      currentPage === 2
                        ? "bg-[var(--primary)] text-white shadow-2xs"
                        : "border border-[var(--border)] hover:bg-white"
                    }`}
                    onClick={() => setCurrentPage(2)}
                  >
                    2
                  </button>
                  <button
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      currentPage === 3
                        ? "bg-[var(--primary)] text-white shadow-2xs"
                        : "border border-[var(--border)] hover:bg-white"
                    }`}
                    onClick={() => setCurrentPage(3)}
                  >
                    3
                  </button>
                  <span className="px-1 text-stone-400">...</span>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
                  >
                    ›
                  </button>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}


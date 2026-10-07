export type LessonActivityType = 'opening' | 'concept' | 'simulation' | 'quiz' | 'discussion' | 'wrap-up';

export type FeedbackMode = 'understanding' | 'quiz' | 'discussion' | 'none';

export type MaterialKind = 'slide' | 'pdf' | 'doc' | 'model_3d' | 'video' | 'link';
export type QuizTriggerMode = 'manual' | 'after_activity' | 'at_minute' | 'at_slide';

export interface LessonMaterial {
  id: string;
  position?: number;
  name: string;
  kind: MaterialKind;
  sizeLabel: string;
  description?: string;
  durationMinutes?: number;
  visibleToStudents?: boolean;
  allowDownload?: boolean;
  showPageNumber?: boolean;
  tags?: string[];
  learningObjectives?: string[];
  fileUrl?: string | null;
  previewStatus?: 'none' | 'processing' | 'ready' | 'failed';
  previewError?: string;
  previewPageCount?: number;
  previewPdfUrl?: string | null;
  previewSlideUrls?: string[];
  externalUrl?: string;
  anatomyModel?: {
    sketchfabUid: string;
    title: string;
    thumbnailUrl: string;
    embedUrl: string;
    system: string | null;
  } | null;
}

export interface LessonQuiz {
  resourceId?: string;
  position?: number;
  enabled: boolean;
  title: string;
  question: string;
  options: string[];
  correctOption: number;
  durationSeconds: number;
  triggerMode: QuizTriggerMode;
  triggerMinute: number;
  delaySeconds: number;
  triggerResourceId?: string;
  triggerSlideNumber: number;
}

export interface LessonStep {
  id: string;
  title: string;
  type: LessonActivityType;
  durationMinutes: number;
  objective: string;
  teacherInstructions: string;
  resource: string;
  materials: LessonMaterial[];
  quiz: LessonQuiz;
  transitionCondition: string;
  feedbackMode: FeedbackMode;
  successThreshold: number;
  autoAdvance: boolean;
}

export interface LessonPlanDraft {
  title: string;
  objective: string;
  audience: string;
  steps: LessonStep[];
  updatedAt: string;
}

export const activityTypeLabels: Record<LessonActivityType, string> = {
  opening: 'Khởi động',
  concept: 'Kiến thức',
  simulation: 'Mô phỏng',
  quiz: 'Kiểm tra nhanh',
  discussion: 'Thảo luận',
  'wrap-up': 'Tổng kết',
};

export const feedbackModeLabels: Record<FeedbackMode, string> = {
  understanding: 'Đã hiểu / Cần hỗ trợ',
  quiz: 'Câu hỏi trắc nghiệm',
  discussion: 'Ý kiến thảo luận',
  none: 'Không thu phản hồi',
};

export const quizTriggerLabels: Record<QuizTriggerMode, string> = {
  manual: 'Giáo viên phát thủ công',
  after_activity: 'Tự bật sau nội dung',
  at_minute: 'Tự bật tại mốc thời gian',
  at_slide: 'Tự bật khi tới slide',
};

export function createDefaultQuiz(enabled = false): LessonQuiz {
  return {
    enabled,
    title: 'Mini-quiz kiểm tra nhanh',
    question: 'Nội dung quan trọng nhất bạn vừa học là gì?',
    options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
    correctOption: 0,
    durationSeconds: 60,
    triggerMode: enabled ? 'after_activity' : 'manual',
    triggerMinute: 15,
    delaySeconds: 5,
    triggerResourceId: undefined,
    triggerSlideNumber: 1,
  };
}

function step(id: string, value: Omit<LessonStep, 'id'>): LessonStep {
  return { id, ...value };
}

export function createDefaultLessonPlan(roomName: string): LessonPlanDraft {
  return {
    title: roomName || 'Bài học mới',
    objective: 'Học viên hiểu khái niệm, quan sát ví dụ và tự kiểm tra mức độ nắm bài.',
    audience: 'Học viên trong không gian này',
    updatedAt: new Date().toISOString(),
    steps: [
      step('opening', {
        title: 'Khởi động & mục tiêu',
        type: 'opening',
        durationMinutes: 5,
        objective: 'Kết nối kiến thức cũ và giới thiệu mục tiêu của buổi học.',
        teacherInstructions: 'Đặt một câu hỏi ngắn để kiểm tra kiến thức nền trước khi trình bày nội dung mới.',
        resource: 'Slide mở đầu',
        materials: [{ id: 'opening-slide', name: 'Slide mở đầu.pptx', kind: 'slide', sizeLabel: '6 trang' }],
        quiz: createDefaultQuiz(false),
        transitionCondition: 'Ít nhất 70% học viên đã gửi phản hồi.',
        feedbackMode: 'understanding',
        successThreshold: 70,
        autoAdvance: false,
      }),
      step('concept', {
        title: 'Trình bày kiến thức trọng tâm',
        type: 'concept',
        durationMinutes: 15,
        objective: 'Học viên mô tả được khái niệm và các bước chính.',
        teacherInstructions: 'Trình bày theo từng ý nhỏ, dừng lại ở mỗi ví dụ để thu tín hiệu hiểu bài.',
        resource: 'Slide bài giảng',
        materials: [{ id: 'concept-slide', name: 'Nội dung bài giảng.pptx', kind: 'slide', sizeLabel: '12 trang' }],
        quiz: createDefaultQuiz(false),
        transitionCondition: 'Giáo viên xác nhận đã trình bày đủ nội dung.',
        feedbackMode: 'understanding',
        successThreshold: 75,
        autoAdvance: false,
      }),
      step('practice', {
        title: 'Hoạt động luyện tập',
        type: 'quiz',
        durationMinutes: 12,
        objective: 'Học viên vận dụng kiến thức vào một tình huống cụ thể.',
        teacherInstructions: 'Mở câu hỏi, cho học viên làm độc lập rồi giải thích đáp án dựa trên kết quả chung.',
        resource: 'Bộ câu hỏi luyện tập',
        materials: [{ id: 'practice-pdf', name: 'Phiếu luyện tập.pdf', kind: 'pdf', sizeLabel: '1 tài liệu' }],
        quiz: {
          ...createDefaultQuiz(true),
          question: 'Sau phần trình bày vừa rồi, phương án nào là chính xác nhất?',
        },
        transitionCondition: 'Tối thiểu 70% câu trả lời đúng hoặc giáo viên cho phép chuyển bước.',
        feedbackMode: 'quiz',
        successThreshold: 70,
        autoAdvance: false,
      }),
      step('wrap-up', {
        title: 'Tổng kết & Q&A',
        type: 'wrap-up',
        durationMinutes: 8,
        objective: 'Củng cố nội dung và ghi nhận điểm còn chưa rõ.',
        teacherInstructions: 'Tóm tắt ba ý chính, nhận câu hỏi và giao nhiệm vụ sau buổi học.',
        resource: 'Phiếu tổng kết',
        materials: [{ id: 'wrap-doc', name: 'Phiếu tổng kết.docx', kind: 'doc', sizeLabel: '1 tài liệu' }],
        quiz: createDefaultQuiz(false),
        transitionCondition: 'Giáo viên kết thúc buổi học.',
        feedbackMode: 'discussion',
        successThreshold: 60,
        autoAdvance: false,
      }),
    ],
  };
}

export function createEmptyLessonStep(index: number): LessonStep {
  return step(`step-${Date.now()}`, {
    title: `Hoạt động ${index + 1}`,
    type: 'discussion',
    durationMinutes: 10,
    objective: '',
    teacherInstructions: '',
    resource: '',
    materials: [],
    quiz: createDefaultQuiz(false),
    transitionCondition: 'Giáo viên xác nhận chuyển bước.',
    feedbackMode: 'understanding',
    successThreshold: 70,
    autoAdvance: false,
  });
}

export function getPlanDuration(plan: LessonPlanDraft): number {
  return plan.steps.reduce((total, item) => total + Math.max(0, item.durationMinutes || 0), 0);
}

export function getPlanReadiness(plan: LessonPlanDraft): number {
  if (plan.steps.length === 0) return 0;
  const complete = plan.steps.filter((item) => item.title.trim() && item.objective.trim() && item.teacherInstructions.trim()).length;
  return Math.round((complete / plan.steps.length) * 100);
}

import { createDefaultQuiz, type LessonActivityType, type LessonPlanDraft } from './lesson-plan';
import type { LessonPlanDto, LessonResourceDto } from './lesson-plan-api';

function activityType(resources: LessonResourceDto[]): LessonActivityType {
  if (resources.some((item) => item.kind === 'quiz')) return 'quiz';
  if (resources.some((item) => item.kind === 'model_3d')) return 'simulation';
  return 'concept';
}

export function mapLessonPlan(dto: LessonPlanDto): LessonPlanDraft {
  return {
    title: dto.title,
    objective: dto.objective,
    audience: 'Học viên trong lớp',
    updatedAt: dto.updated_at,
    steps: dto.sections.map((section) => {
      const quizResource = section.resources.find((item) => item.kind === 'quiz' && item.quiz);
      return {
        id: section.id,
        title: section.title,
        type: activityType(section.resources),
        durationMinutes: section.duration_minutes,
        objective: section.objective,
        teacherInstructions: section.teacher_notes,
        resource: '',
        materials: section.resources.filter((item) => item.kind !== 'quiz').map((item) => ({
          id: item.id,
          position: item.position,
          name: item.title,
          kind: item.kind as Exclude<LessonResourceDto['kind'], 'quiz'>,
          sizeLabel: item.kind === 'model_3d' ? 'Mô hình tương tác' : String(item.metadata.size_label || 'Tài liệu'),
          description: item.description,
          durationMinutes: item.duration_minutes,
          visibleToStudents: item.visible_to_students,
          allowDownload: item.allow_download,
          showPageNumber: item.show_page_number,
          tags: item.tags,
          learningObjectives: item.learning_objectives,
          fileUrl: item.file,
          previewStatus: item.preview_status,
          previewError: item.preview_error,
          previewPageCount: item.preview_page_count,
          previewPdfUrl: item.preview_pdf_url,
          previewSlideUrls: item.preview_slide_urls,
          externalUrl: item.external_url,
          anatomyModel: item.anatomy_model_detail ? {
            sketchfabUid: item.anatomy_model_detail.sketchfab_uid,
            title: item.anatomy_model_detail.title,
            thumbnailUrl: item.anatomy_model_detail.thumbnail_url,
            embedUrl: item.anatomy_model_detail.embed_url,
            system: item.anatomy_model_detail.system,
          } : null,
        })),
        quiz: quizResource?.quiz ? {
          ...createDefaultQuiz(true),
          resourceId: quizResource.id,
          position: quizResource.position,
          title: quizResource.title,
          question: quizResource.quiz.question,
          options: quizResource.quiz.options,
          correctOption: quizResource.quiz.correct_option,
          durationSeconds: quizResource.quiz.duration_seconds,
          triggerMode: quizResource.quiz.trigger_mode === 'after_resource' ? 'after_activity' : quizResource.quiz.trigger_mode,
          triggerMinute: quizResource.quiz.trigger_minute,
          delaySeconds: quizResource.quiz.delay_seconds,
        } : createDefaultQuiz(false),
        transitionCondition: 'Giáo viên xác nhận chuyển bước.',
        feedbackMode: quizResource ? 'quiz' : 'understanding',
        successThreshold: quizResource?.quiz?.success_threshold || 70,
        autoAdvance: false,
      };
    }),
  };
}

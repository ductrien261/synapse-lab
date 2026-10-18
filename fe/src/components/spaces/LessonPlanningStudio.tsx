'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BarChartFill, BoxArrowLeft, Broadcast, Check2, Clipboard, PeopleFill, PersonPlusFill, PersonVideo3, StopCircle } from 'react-bootstrap-icons';
import { classroomApi, type ClassroomDto } from './classroom-api';
import { AnatomyModelPicker } from './AnatomyModelPicker';
import { DocumentWorkspace } from './DocumentWorkspace';
import { EditableLessonTree } from './LessonContentTree';
import { LessonToolsRail } from './LessonToolsRail';
import { QuizReportPanel } from './QuizReportPanel';
import { SessionResourcePicker } from './SessionResourcePicker';
import { type LessonMaterial, type LessonQuiz, type MaterialKind } from './lesson-plan';
import { lessonPlanApi, type LessonPlanDto, type LessonResourceDto } from './lesson-plan-api';
import { mapLessonPlan } from './lesson-plan-mapper';
import { getResourceStep, getStudioResources } from './studio-resource';
import { ApiError } from '@/lib/api';
import type { AnatomyModelSummary } from '@/lib/anatomy-catalog';

export function LessonPlanningStudio({ roomCode: rawRoomCode }: { roomCode: string; roomName?: string }) {
  const router = useRouter();
  const roomCode = String(rawRoomCode || 'BFS204').toUpperCase();
  const [classroom, setClassroom] = useState<ClassroomDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [planDto, setPlanDto] = useState<LessonPlanDto | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const uploadingRef = useRef(false);
  const [modelPickerStepId, setModelPickerStepId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const quizSaveTimerRef = useRef<number | null>(null);
  const plan = planDto ? mapLessonPlan(planDto) : null;
  const [selectedResourceKey, setSelectedResourceKey] = useState('');
  const activeSession = classroom?.active_session;
  const resources = plan ? getStudioResources(plan) : [];
  const selectedResource = resources.find((item) => item.key === selectedResourceKey) || resources[0];
  const selectedStep = plan && selectedResource ? getResourceStep(plan, selectedResource) : undefined;

  useEffect(() => {
    let mounted = true;
    const initialClassroom = classroomApi.get(roomCode);
    void initialClassroom
      .then((result) => { if (mounted) setClassroom(result); })
      .catch((reason: unknown) => { if (mounted) setMessage(reason instanceof Error ? reason.message : 'Không thể tải không gian.'); })
      .finally(() => { if (mounted) setLoading(false); });

    void lessonPlanApi.get(roomCode)
      .catch(async (reason: unknown) => {
        if (!(reason instanceof ApiError && (reason.status === 403 || reason.status === 404))) throw reason;
        const classroom = await initialClassroom;
        if (!mounted || !classroom.is_owner) return null;
        if (reason.status !== 404) throw reason;
        return lessonPlanApi.create(roomCode, {
          subject: 'anatomy',
          title: classroom.name,
          objective: 'Nhận diện cấu trúc và vận dụng kiến thức Giải phẫu trong thực hành.',
        });
      })
      .then((result) => { if (mounted && result) setPlanDto(result); })
      .catch((reason: unknown) => { if (mounted) setMessage(reason instanceof Error ? reason.message : 'Không thể tải bài dạy.'); })
      .finally(() => { if (mounted) setPlanLoading(false); });

    const timer = window.setInterval(() => {
      void classroomApi.get(roomCode).then((result) => { if (mounted) setClassroom(result); }).catch(() => {});
    }, 5000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [roomCode]);

  useEffect(() => () => {
    if (quizSaveTimerRef.current) window.clearTimeout(quizSaveTimerRef.current);
  }, []);

  const reloadPlan = async () => {
    const result = await lessonPlanApi.get(roomCode);
    setPlanDto(result);
    return result;
  };

  const copyCode = async () => {
    await navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const joinSession = async () => {
    setActionPending(true);
    setMessage('');
    try {
      await classroomApi.joinSession(roomCode);
      router.push(`/spaces/${encodeURIComponent(roomCode)}/video`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể tham gia buổi học.');
    } finally {
      setActionPending(false);
    }
  };

  const startSession = async (resourceIds?: string[]) => {
    setActionPending(true);
    setMessage('');
    try {
      const updated = await classroomApi.startSession(roomCode, resourceIds);
      setClassroom(updated);
      setSessionPickerOpen(false);
      await classroomApi.joinSession(roomCode);
      router.push(`/spaces/${encodeURIComponent(roomCode)}/video`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể bắt đầu buổi học.');
    } finally {
      setActionPending(false);
    }
  };

  const endSession = async () => {
    setActionPending(true);
    setMessage('');
    try {
      await classroomApi.endSession(roomCode);
      setClassroom((current) => current ? { ...current, active_session: null } : current);
      setMessage('Buổi học đã kết thúc. Kịch bản vẫn được giữ để chỉnh sửa hoặc dùng lại.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể kết thúc buổi học.');
    } finally {
      setActionPending(false);
    }
  };

  const addFiles = async (files: FileList | null, requestedStepId?: string) => {
    if (!files?.length || !planDto?.sections.length || uploadingRef.current) return;
    const targetStepId = requestedStepId || selectedResource?.stepId || plan?.steps[0]?.id;
    if (!targetStepId) return;
    uploadingRef.current = true;
    setUploading(true);
    setUploadProgress(0);
    setMessage('Đang tải tài liệu lên…');
    try {
      const created = [];
      for (const [index, file] of Array.from(files).entries()) {
        setUploadProgress(0);
        const extension = file.name.split('.').pop()?.toLowerCase();
        const kind: MaterialKind = extension === 'pdf' ? 'pdf' : extension === 'doc' || extension === 'docx' ? 'doc' : 'slide';
        const form = new FormData();
        form.append('kind', kind);
        form.append('title', file.name);
        form.append('file', file);
        form.append('position', String((planDto.sections.find((item) => item.id === targetStepId)?.resources.length || 0) + index));
        form.append('metadata', JSON.stringify({ size_label: file.size > 1_048_576 ? `${(file.size / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB` }));
        created.push(await lessonPlanApi.createResource(roomCode, targetStepId, form, setUploadProgress));
      }
      await reloadPlan();
      setSelectedResourceKey(`material:${targetStepId}:${created[0].id}`);
      setMessage('Đã tải tài liệu lên.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể tải tài liệu lên.');
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const updateSelectedMaterial = (patch: Partial<LessonMaterial>) => {
    if (!selectedResource || selectedResource.kind === 'quiz' || !selectedStep) return;
    const apiPatch: Partial<LessonResourceDto> = {
      ...(patch.name !== undefined ? { title: patch.name } : {}),
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.durationMinutes !== undefined ? { duration_minutes: patch.durationMinutes } : {}),
      ...(patch.visibleToStudents !== undefined ? { visible_to_students: patch.visibleToStudents } : {}),
      ...(patch.allowDownload !== undefined ? { allow_download: patch.allowDownload } : {}),
      ...(patch.showPageNumber !== undefined ? { show_page_number: patch.showPageNumber } : {}),
      ...(patch.learningObjectives !== undefined ? { learning_objectives: patch.learningObjectives } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    };
    setPlanDto((current) => current ? replaceResource(current, selectedResource.material.id, apiPatch) : current);
    void lessonPlanApi.updateResource(roomCode, selectedResource.material.id, apiPatch).catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : 'Không thể lưu tài liệu.'));
  };

  const updateSelectedQuiz = (patch: Partial<LessonQuiz>) => {
    if (!selectedResource || selectedResource.kind !== 'quiz' || !selectedStep) return;
    if (!selectedStep.quiz.resourceId) return;
    const currentQuiz = selectedStep.quiz;
    const requestedTriggerResource = patch.triggerResourceId ?? currentQuiz.triggerResourceId;
    const triggerMaterial = selectedStep.materials.find((material) => (
      material.id === requestedTriggerResource || material.name === requestedTriggerResource
    ));
    const quiz = {
      question: patch.question ?? currentQuiz.question,
      options: patch.options ?? currentQuiz.options,
      correct_option: patch.correctOption ?? currentQuiz.correctOption,
      duration_seconds: patch.durationSeconds ?? currentQuiz.durationSeconds,
      trigger_mode: (patch.triggerMode ?? currentQuiz.triggerMode) === 'after_activity' ? 'after_resource' as const : (patch.triggerMode ?? currentQuiz.triggerMode) as 'manual' | 'at_minute' | 'at_slide',
      trigger_minute: patch.triggerMinute ?? currentQuiz.triggerMinute,
      delay_seconds: patch.delaySeconds ?? currentQuiz.delaySeconds,
      trigger_resource: triggerMaterial?.id ?? null,
      trigger_slide_number: patch.triggerSlideNumber ?? currentQuiz.triggerSlideNumber,
      success_threshold: selectedStep.successThreshold,
    };
    const resourcePatch = { title: patch.title ?? currentQuiz.title, quiz };
    setPlanDto((current) => current ? replaceResource(current, selectedStep.quiz.resourceId!, resourcePatch) : current);
    if (quizSaveTimerRef.current) window.clearTimeout(quizSaveTimerRef.current);
    const resourceId = selectedStep.quiz.resourceId;
    quizSaveTimerRef.current = window.setTimeout(() => {
      void lessonPlanApi.updateResource(roomCode, resourceId, resourcePatch).catch((reason: unknown) => {
        setMessage(reason instanceof Error ? reason.message : 'Không thể lưu quiz.');
        void reloadPlan();
      });
    }, 450);
  };

  const addActivity = async (requestedTitle?: string) => {
    if (!planDto) return;
    try {
      await lessonPlanApi.createSection(roomCode, { title: requestedTitle?.trim() || `Chủ đề Giải phẫu ${planDto.sections.length + 1}`, duration_minutes: 10 });
      await reloadPlan();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể thêm hoạt động.');
    }
  };

  const moveActivity = (stepId: string, direction: -1 | 1) => {
    if (!planDto) return;
    const index = planDto.sections.findIndex((item) => item.id === stepId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= planDto.sections.length) return;
    void Promise.all([
      lessonPlanApi.updateSection(roomCode, planDto.sections[index].id, { position: planDto.sections[target].position }),
      lessonPlanApi.updateSection(roomCode, planDto.sections[target].id, { position: planDto.sections[index].position }),
    ]).then(() => reloadPlan()).catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : 'Không thể sắp xếp hoạt động.'));
  };

  const deleteActivity = (stepId: string) => {
    if (!planDto || planDto.sections.length <= 1) return;
    void lessonPlanApi.deleteSection(roomCode, stepId).then(() => reloadPlan()).catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : 'Không thể xóa hoạt động.'));
  };

  const renameActivity = (stepId: string, title: string) => {
    setPlanDto((current) => current ? { ...current, sections: current.sections.map((section) => section.id === stepId ? { ...section, title } : section) } : current);
    void lessonPlanApi.updateSection(roomCode, stepId, { title }).catch((reason: unknown) => {
      setMessage(reason instanceof Error ? reason.message : 'Không thể đổi tên phần.');
      void reloadPlan();
    });
  };

  const renameResource = (resourceKey: string, title: string) => {
    const resource = resources.find((item) => item.key === resourceKey);
    const resourceId = resource?.kind === 'quiz' ? resource.quiz.resourceId : resource?.material.id;
    if (!resourceId) return;
    setPlanDto((current) => current ? replaceResource(current, resourceId, { title }) : current);
    void lessonPlanApi.updateResource(roomCode, resourceId, { title }).catch((reason: unknown) => {
      setMessage(reason instanceof Error ? reason.message : 'Không thể đổi tên nội dung.');
      void reloadPlan();
    });
  };

  const reorderActivity = (sourceStepId: string, targetStepId: string) => {
    if (!planDto || sourceStepId === targetStepId) return;
    const ordered = [...planDto.sections].sort((left, right) => left.position - right.position);
    const sourceIndex = ordered.findIndex((section) => section.id === sourceStepId);
    if (sourceIndex < 0) return;
    const [moved] = ordered.splice(sourceIndex, 1);
    const targetIndex = ordered.findIndex((section) => section.id === targetStepId);
    if (targetIndex < 0) return;
    ordered.splice(targetIndex, 0, moved);
    void Promise.all(ordered.map((section, position) => lessonPlanApi.updateSection(roomCode, section.id, { position })))
      .then(() => reloadPlan())
      .catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : 'Không thể sắp xếp phần.'));
  };

  const reorderResource = (sourceKey: string, targetStepId: string, targetKey?: string) => {
    const source = resources.find((item) => item.key === sourceKey);
    const target = targetKey ? resources.find((item) => item.key === targetKey) : undefined;
    if (!source || (target && target.stepId !== targetStepId) || sourceKey === targetKey) return;
    const sourceSection = planDto?.sections.find((item) => item.id === source.stepId);
    const targetSection = planDto?.sections.find((item) => item.id === targetStepId);
    if (!sourceSection || !targetSection) return;
    const sourceId = source.kind === 'quiz' ? source.quiz.resourceId : source.material.id;
    const targetId = target?.kind === 'quiz' ? target.quiz.resourceId : target?.material.id;
    if (!sourceId) return;
    const movedResource = sourceSection.resources.find((item) => item.id === sourceId);
    if (!movedResource) return;
    const targetResources = [...targetSection.resources]
      .filter((item) => item.id !== sourceId)
      .sort((left, right) => left.position - right.position);
    const targetIndex = targetId ? targetResources.findIndex((item) => item.id === targetId) : targetResources.length;
    targetResources.splice(targetIndex < 0 ? targetResources.length : targetIndex, 0, movedResource);
    const updates = targetResources.map((item, position) => lessonPlanApi.updateResource(roomCode, item.id, {
      position,
      ...(item.id === sourceId && source.stepId !== targetStepId ? { section: targetStepId } : {}),
    }));
    if (source.stepId !== targetStepId) {
      const remainingSourceResources = sourceSection.resources
        .filter((item) => item.id !== sourceId)
        .sort((left, right) => left.position - right.position);
      updates.push(...remainingSourceResources.map((item, position) => lessonPlanApi.updateResource(roomCode, item.id, { position })));
    }
    void Promise.all(updates)
      .then(() => reloadPlan())
      .catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : 'Không thể sắp xếp nội dung.'));
  };

  const deleteResource = (resourceKey: string) => {
    const resource = resources.find((item) => item.key === resourceKey);
    if (!resource) return;
    const id = resource.kind === 'quiz' ? resource.quiz.resourceId : resource.material.id;
    if (!id) return;
    void lessonPlanApi.deleteResource(roomCode, id).then(() => reloadPlan()).catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : 'Không thể xóa tài liệu.'));
  };

  const addQuiz = (stepId: string) => {
    const section = planDto?.sections.find((item) => item.id === stepId);
    if (!section) return;
    void lessonPlanApi.createResource(roomCode, section.id, {
      kind: 'quiz', title: 'Mini-quiz kiểm tra nhanh', position: section.resources.length,
      quiz: { question: 'Buồng tim nào bơm máu giàu oxy vào động mạch chủ để nuôi cơ thể?', options: ['Tâm thất trái', 'Tâm thất phải', 'Tâm nhĩ trái', 'Tâm nhĩ phải'], correct_option: 0, duration_seconds: 60, trigger_mode: 'manual', trigger_minute: 0, delay_seconds: 0, success_threshold: 70 },
    }).then(() => reloadPlan()).then(() => setSelectedResourceKey(`quiz:${section.id}`)).catch((reason: unknown) => setMessage(reason instanceof Error ? reason.message : 'Không thể thêm quiz.'));
  };

  const addAnatomyModel = async (model: AnatomyModelSummary) => {
    const section = planDto?.sections.find((item) => item.id === modelPickerStepId);
    if (!section) return;
    try {
      const created = await lessonPlanApi.createResource(roomCode, section.id, {
        kind: 'model_3d',
        title: model.title_vi || model.title,
        anatomy_model: model.sketchfab_uid,
        position: section.resources.length,
        duration_minutes: 15,
        visible_to_students: true,
        tags: ['Giải phẫu', 'Mô hình 3D', model.system || 'Tổng quan'],
      });
      await reloadPlan();
      setSelectedResourceKey(`material:${section.id}:${created.id}`);
      setModelPickerStepId(null);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể thêm mô hình 3D.');
    }
  };

  if (!loading && classroom && !classroom.is_owner) {
    return <MemberLobby classroom={classroom} roomCode={roomCode} copied={copied} actionPending={actionPending} message={message} onCopy={copyCode} onJoin={joinSession} />;
  }

  if (loading || !classroom) {
    return <StudioLoadState title={loading ? 'Đang tải không gian lớp học…' : 'Không thể mở không gian lớp học'} message={loading ? 'Đang lấy dữ liệu thật từ máy chủ.' : message} />;
  }

  if (planLoading || !plan) {
    return <StudioLoadState title={planLoading ? 'Đang tải nội dung bài dạy…' : 'Chưa tải được nội dung bài dạy'} message={planLoading ? 'Cây nội dung sẽ xuất hiện sau khi máy chủ phản hồi.' : message} />;
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col overflow-hidden bg-white xl:h-[calc(100dvh-64px)] xl:min-h-0">
      <header className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-stone-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/spaces" aria-label="Quay lại Không gian" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-[#1E3F82]"><BoxArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="truncate text-sm font-extrabold text-stone-900">Xưởng thiết kế bài dạy</h1><span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-extrabold text-violet-700">Giáo viên</span>{activeSession && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold uppercase text-rose-600">● Video LiveKit</span>}</div><button type="button" onClick={copyCode} className="mt-0.5 flex max-w-full items-center gap-1.5 text-[11px] font-semibold text-stone-500 hover:text-[#1E3F82]"><span className="truncate">{plan.title}</span><span className="text-stone-300">·</span><span className="font-extrabold tracking-wider text-[#1E3F82]">{roomCode}</span>{copied ? <Check2 className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}</button></div>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl bg-stone-50 px-2.5 py-2 text-[11px] font-bold text-stone-600 sm:px-3"><PeopleFill className="h-3.5 w-3.5 text-[#397BF6]" /><span className="hidden sm:inline">{classroom.member_count} người trong lớp</span><span className="sm:hidden">{classroom.member_count}</span></div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => setReportOpen(true)} className="flex h-9 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 hover:bg-violet-100"><BarChartFill className="h-3.5 w-3.5" /><span className="hidden lg:inline">Báo cáo</span></button>
          <button type="button" onClick={copyCode} className="flex h-9 items-center gap-2 rounded-xl bg-[#E8F0FB] px-3 text-xs font-bold text-[#1E3F82] hover:bg-[#D5E4F7]"><PersonPlusFill className="h-3.5 w-3.5" /><span className="hidden sm:inline">Mời học viên</span></button>
          {activeSession ? <button type="button" disabled={actionPending} onClick={joinSession} className="flex h-9 items-center gap-2 rounded-xl bg-[#1E3F82] px-3 text-xs font-bold text-white hover:bg-[#163070] disabled:opacity-50"><PersonVideo3 className="h-3.5 w-3.5" /><span className="hidden lg:inline">Vào phòng</span></button> : <button type="button" disabled={actionPending || loading || planLoading} onClick={() => setSessionPickerOpen(true)} className="flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Broadcast className="h-3.5 w-3.5" /><span className="hidden lg:inline">Bắt đầu buổi dạy</span></button>}
          {activeSession && <button type="button" disabled={actionPending} onClick={endSession} aria-label="Kết thúc phiên" title="Kết thúc phiên" className="flex h-9 items-center gap-2 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><StopCircle className="h-3.5 w-3.5" /><span className="hidden lg:inline">Kết thúc phiên</span></button>}
        </div>
      </header>

      {message && <div className="border-b border-[#D9E6FA] bg-[#EEF4FF] px-4 py-2 text-xs font-semibold text-[#1E3F82]">{message}</div>}
      {uploading && <div role="status" aria-live="polite" className="border-b border-blue-100 bg-blue-50 px-4 py-2"><div className="flex items-center justify-between text-xs font-semibold text-blue-800"><span>{uploadProgress === 100 ? 'Đã gửi xong. Đang lưu và xử lý tài liệu…' : 'Đang gửi tài liệu…'}</span><span>{uploadProgress ?? 0}%</span></div><progress value={uploadProgress ?? 0} max={100} className="mt-1 h-2 w-full accent-blue-700" /></div>}
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]"><EditableLessonTree steps={plan.steps} resources={resources} selectedKey={selectedResource?.key || ''} onSelect={setSelectedResourceKey} onAddFiles={addFiles} uploading={uploading} onAddQuiz={addQuiz} onAddModel={setModelPickerStepId} onAddActivity={addActivity} onMoveActivity={moveActivity} onDeleteActivity={deleteActivity} onDeleteResource={deleteResource} onRenameActivity={renameActivity} onRenameResource={renameResource} onReorderActivity={reorderActivity} onReorderResource={reorderResource} /><div className="relative min-h-0 min-w-0"><DocumentWorkspace resource={selectedResource} roomCode={roomCode} onUpdateQuiz={updateSelectedQuiz} />{selectedResource?.kind !== 'model_3d' && <LessonToolsRail key={selectedResource?.key || 'empty'} resource={selectedResource} step={selectedStep} onUpdateMaterial={updateSelectedMaterial} onUpdateQuiz={updateSelectedQuiz} />}</div></div>

      {modelPickerStepId && <AnatomyModelPicker sectionTitle={plan.steps.find((item) => item.id === modelPickerStepId)?.title || 'Hoạt động'} onClose={() => setModelPickerStepId(null)} onChoose={addAnatomyModel} />}
      <QuizReportPanel roomCode={roomCode} open={reportOpen} onClose={() => setReportOpen(false)} />
      {sessionPickerOpen && <SessionResourcePicker plan={planDto} pending={actionPending} onClose={() => setSessionPickerOpen(false)} onStart={(resourceIds) => void startSession(resourceIds)} />}
    </div>
  );
}

function replaceResource(plan: LessonPlanDto, resourceId: string, patch: Partial<LessonResourceDto>): LessonPlanDto {
  return {
    ...plan,
    sections: plan.sections.map((section) => ({
      ...section,
      resources: section.resources.map((resource) => resource.id === resourceId ? { ...resource, ...patch } : resource),
    })),
  };
}

function StudioLoadState({ title, message }: { title: string; message?: string }) {
  return <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-[#F5F7FB] p-6"><div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm"><span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-[#397BF6]/20 border-t-[#397BF6]" /><h1 className="mt-5 text-sm font-extrabold text-stone-900">{title}</h1>{message && <p className="mt-2 text-xs leading-5 text-stone-500">{message}</p>}</div></div>;
}

function MemberLobby({ classroom, roomCode, copied, actionPending, message, onCopy, onJoin }: { classroom: ClassroomDto; roomCode: string; copied: boolean; actionPending: boolean; message: string; onCopy: () => void; onJoin: () => void }) {
  const live = classroom.active_session;
  return <div className="flex min-h-[calc(100dvh-80px)] items-center justify-center rounded-2xl border border-stone-200 bg-[#F4F7FC] p-4">
    <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl shadow-blue-950/5">
      <div className="bg-[#102B5C] px-6 py-7 text-white">
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider">Phòng học Synapse</span>
        <h1 className="mt-4 text-2xl font-extrabold">{classroom.name}</h1>
        <button type="button" onClick={onCopy} className="mt-2 flex items-center gap-1.5 text-xs text-blue-100">Mã phòng <strong>{roomCode}</strong>{copied ? <Check2 /> : <Clipboard />}</button>
      </div>
      <div className="p-6">
        <div className={`rounded-2xl border p-4 ${live ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
          <p className={`text-sm font-extrabold ${live ? 'text-emerald-800' : 'text-amber-800'}`}>{live ? 'Buổi học đã bắt đầu' : 'Giáo viên đang chuẩn bị bài dạy'}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">{live ? 'Phòng học LiveKit đã mở. Bấm vào lớp để dùng mic, camera và chat.' : 'Trang này tự cập nhật. Nút vào lớp sẽ xuất hiện khi giáo viên bắt đầu.'}</p>
        </div>
        {message && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-800">{message}</p>}
        <button type="button" disabled={!live || actionPending} onClick={onJoin} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3F82] py-3 text-sm font-extrabold text-white hover:bg-[#163070] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"><PersonVideo3 className="h-4 w-4" />{live ? 'Vào lớp video' : 'Đang chờ giáo viên'}</button>
        <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-stone-400"><span>{classroom.member_count} thành viên</span><Link href="/spaces" className="hover:text-[#1E3F82]">Quay lại Không gian</Link></div>
      </div>
    </div>
  </div>;
}

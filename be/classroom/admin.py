from django.contrib import admin

from .models import (
    ClassMembership,
    Classroom,
    LessonPlan,
    LessonQuiz,
    LessonResource,
    LessonSection,
    LiveQuizResponse,
    LiveQuizRun,
    LiveSession,
    SessionAttendance,
)


class ClassMembershipInline(admin.TabularInline):
    model = ClassMembership
    extra = 0


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'purpose', 'owner', 'track', 'is_archived', 'created_at')
    list_filter = ('purpose', 'track', 'is_archived')
    search_fields = ('name', 'code', 'owner__email')
    inlines = [ClassMembershipInline]


@admin.register(LiveSession)
class LiveSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'classroom', 'status', 'participant_count', 'started_at', 'ended_at')
    list_filter = ('status',)
    search_fields = ('title', 'classroom__name', 'classroom__code', 'room_name')


@admin.register(SessionAttendance)
class SessionAttendanceAdmin(admin.ModelAdmin):
    list_display = ('session', 'user', 'join_count', 'joined_at', 'last_joined_at', 'left_at')
    list_filter = ('session__status',)
    search_fields = ('session__title', 'session__classroom__code', 'user__email')


@admin.register(LessonPlan)
class LessonPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject', 'classroom', 'updated_at')
    list_filter = ('subject',)
    search_fields = ('title', 'classroom__name', 'classroom__code')


@admin.register(LessonSection)
class LessonSectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'plan', 'position', 'duration_minutes', 'updated_at')
    list_filter = ('plan__subject',)
    search_fields = ('title', 'plan__title', 'plan__classroom__code')


@admin.register(LessonResource)
class LessonResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'kind', 'section', 'position', 'visible_to_students', 'updated_at')
    list_filter = ('kind', 'visible_to_students')
    search_fields = ('title', 'section__title', 'section__plan__classroom__code')


@admin.register(LessonQuiz)
class LessonQuizAdmin(admin.ModelAdmin):
    list_display = (
        'resource', 'trigger_mode', 'trigger_resource', 'trigger_slide_number',
        'duration_seconds', 'success_threshold',
    )
    list_filter = ('trigger_mode',)


@admin.register(LiveQuizRun)
class LiveQuizRunAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'session', 'status', 'opened_at', 'closes_at', 'started_by')
    list_filter = ('status',)


@admin.register(LiveQuizResponse)
class LiveQuizResponseAdmin(admin.ModelAdmin):
    list_display = ('run', 'user', 'selected_option', 'is_correct', 'submitted_at')
    list_filter = ('is_correct',)

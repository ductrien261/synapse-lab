from django.contrib import admin

from .models import Generation, Lesson


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'visibility', 'created_by', 'is_deleted', 'updated_at')
    list_filter = ('visibility', 'is_deleted')
    search_fields = ('title', 'slug')
    readonly_fields = ('content_hash', 'created_at', 'updated_at', 'deleted_at', 'reviewed_at', 'submitted_at')


@admin.register(Generation)
class GenerationAdmin(admin.ModelAdmin):
    list_display = ('id', 'request', 'user', 'status', 'tokens_used', 'repair_rounds', 'created_at')
    list_filter = ('status',)
    search_fields = ('request',)
    readonly_fields = ('request_hash', 'steps', 'state', 'heartbeat_at', 'created_at', 'updated_at')

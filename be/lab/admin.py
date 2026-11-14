from django.contrib import admin

from .models import Lesson


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'visibility', 'created_by', 'is_deleted', 'updated_at')
    list_filter = ('visibility', 'is_deleted')
    search_fields = ('title', 'slug')
    readonly_fields = ('content_hash', 'created_at', 'updated_at', 'deleted_at', 'reviewed_at', 'submitted_at')

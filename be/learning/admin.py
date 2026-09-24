from django.contrib import admin

from .models import LearningActivity, StudyDay, StudyNote


@admin.register(LearningActivity)
class LearningActivityAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'kind', 'track', 'visit_count', 'last_visited_at')
    list_filter = ('kind', 'track')
    search_fields = ('user__email', 'title', 'object_key')


@admin.register(StudyDay)
class StudyDayAdmin(admin.ModelAdmin):
    list_display = ('user', 'date')
    list_filter = ('date',)


@admin.register(StudyNote)
class StudyNoteAdmin(admin.ModelAdmin):
    list_display = ('user', 'kind', 'object_key', 'part_index', 'updated_at')
    search_fields = ('user__email', 'object_key', 'content')

from django.contrib import admin

from .models import ConceptMastery, LearnerProfile, Misconception, QuizAttempt, QuizItem, ReviewSession


@admin.register(QuizItem)
class QuizItemAdmin(admin.ModelAdmin):
    list_display = ('question', 'kind', 'structure', 'difficulty', 'status', 'source', 'served', 'correct_count', 'reports')
    list_filter = ('kind', 'status', 'source', 'difficulty')
    search_fields = ('question', 'structure__name_en', 'structure__name_vi')
    raw_id_fields = ('structure', 'anatomy_model', 'created_by')


@admin.register(Misconception)
class MisconceptionAdmin(admin.ModelAdmin):
    list_display = ('text', 'user', 'structure', 'evidence', 'status', 'updated_at')
    list_filter = ('status', 'source')


admin.site.register(LearnerProfile)
admin.site.register(ConceptMastery)
admin.site.register(ReviewSession)
admin.site.register(QuizAttempt)

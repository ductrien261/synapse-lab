from django.contrib import admin

from .models import AnswerCache, Conversation, TutorMessage


class MessageInline(admin.TabularInline):
    model = TutorMessage
    extra = 0
    fields = ('role', 'content', 'status', 'feedback', 'from_cache', 'created_at')
    readonly_fields = fields


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'anatomy_model', 'updated_at')
    search_fields = ('title', 'user__email')
    inlines = [MessageInline]


@admin.register(AnswerCache)
class AnswerCacheAdmin(admin.ModelAdmin):
    list_display = ('question', 'status', 'hit_count', 'created_at')
    search_fields = ('question',)

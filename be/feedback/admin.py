from django.contrib import admin

from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('kind', 'status', 'message', 'user', 'email', 'created_at')
    list_filter = ('kind', 'status')
    search_fields = ('message', 'email', 'page_url')

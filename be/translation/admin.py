from django.contrib import admin

from .models import Translation


@admin.register(Translation)
class TranslationAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'target_lang', 'provider', 'model', 'hit_count', 'created_at')
    list_filter = ('target_lang', 'provider')
    search_fields = ('source_text', 'translated_text')

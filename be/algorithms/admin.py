from django.contrib import admin

from .models import Algorithm, AlgorithmCategory, AlgorithmContent, AlgorithmReference


@admin.register(AlgorithmCategory)
class AlgorithmCategoryAdmin(admin.ModelAdmin):
    list_display = ('name_vi', 'name_en', 'key', 'order')


class AlgorithmContentInline(admin.StackedInline):
    model = AlgorithmContent
    extra = 0


class AlgorithmReferenceInline(admin.TabularInline):
    model = AlgorithmReference
    extra = 0
    raw_id_fields = ('chunk',)


@admin.register(Algorithm)
class AlgorithmAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'key', 'is_published', 'last_synced_at')
    list_filter = ('category', 'is_published')
    search_fields = ('name', 'key')
    inlines = [AlgorithmContentInline, AlgorithmReferenceInline]

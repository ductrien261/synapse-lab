from django.contrib import admin

from .models import (
    Algorithm, AlgorithmCategory, AlgorithmContent, AlgorithmDraftCandidate,
    AlgorithmReference, AlgorithmScanJob, AlgorithmSource,
)


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


@admin.register(AlgorithmSource)
class AlgorithmSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'kind', 'enabled', 'priority', 'allowed_domain', 'updated_at')
    list_filter = ('kind', 'enabled')
    search_fields = ('name', 'url', 'allowed_domain')


@admin.register(AlgorithmScanJob)
class AlgorithmScanJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'processed', 'total', 'succeeded', 'failed', 'created_at')
    readonly_fields = ('params', 'log', 'error')


@admin.register(AlgorithmDraftCandidate)
class AlgorithmDraftCandidateAdmin(admin.ModelAdmin):
    list_display = ('algorithm', 'status', 'job', 'created_at', 'reviewed_at')
    list_filter = ('status',)
    readonly_fields = ('fields', 'citations', 'source_ids', 'warnings', 'error')

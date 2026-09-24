from django.contrib import admin

from .models import AnatomyModel, AnatomyToolCollection, BodySystem, ImportJob, ModelAnnotation, Structure, StructureDraft, StructureReference


@admin.register(BodySystem)
class BodySystemAdmin(admin.ModelAdmin):
    list_display = ('name_vi', 'name_en', 'slug', 'order', 'is_published')
    prepopulated_fields = {'slug': ('name_en',)}


class ModelAnnotationInline(admin.TabularInline):
    model = ModelAnnotation
    extra = 0
    autocomplete_fields = ('structure',)


@admin.register(AnatomyModel)
class AnatomyModelAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'system', 'sketchfab_uid', 'is_published', 'last_synced_at')
    list_filter = ('system', 'is_published')
    search_fields = ('title', 'title_vi', 'sketchfab_uid')
    inlines = [ModelAnnotationInline]


class StructureReferenceInline(admin.TabularInline):
    model = StructureReference
    extra = 0
    raw_id_fields = ('chunk',)


@admin.register(Structure)
class StructureAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'name_en', 'system', 'status', 'updated_at')
    list_filter = ('status', 'system')
    search_fields = ('name_vi', 'name_en', 'latin_name')
    inlines = [StructureReferenceInline]


@admin.register(AnatomyToolCollection)
class AnatomyToolCollectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'suggested_system', 'candidate_count', 'imported_count', 'last_imported_at')


@admin.register(ImportJob)
class ImportJobAdmin(admin.ModelAdmin):
    list_display = ('kind', 'status', 'processed', 'total', 'created_count', 'failed_count', 'created_at')
    list_filter = ('kind', 'status')


@admin.register(StructureDraft)
class StructureDraftAdmin(admin.ModelAdmin):
    list_display = ('structure', 'status', 'llm_model', 'prompt_tokens', 'updated_at')
    list_filter = ('status',)
    search_fields = ('structure__name_en', 'name_vi')
    raw_id_fields = ('structure',)

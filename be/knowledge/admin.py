from django.contrib import admin

from .models import Document, DocumentChunk, IngestJob


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'source_type', 'scope', 'status', 'chunk_count', 'created_at')
    list_filter = ('source_type', 'status', 'scope', 'language')
    search_fields = ('title', 'authors', 'source_key')
    readonly_fields = ('id', 'file_size', 'mime_type', 'page_count', 'chunk_count', 'processed_at', 'created_at', 'updated_at')
    exclude = ('meta',)


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ('document', 'index', 'heading', 'page_start', 'token_count')
    list_filter = ('document',)
    search_fields = ('content', 'heading')
    exclude = ('embedding', 'search_vector')


@admin.register(IngestJob)
class IngestJobAdmin(admin.ModelAdmin):
    list_display = ('kind', 'status', 'document', 'processed', 'total', 'created_at')
    list_filter = ('kind', 'status')
    readonly_fields = [f.name for f in IngestJob._meta.fields]

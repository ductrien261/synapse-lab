from django.contrib import admin

from .models import Document, DocumentChunk


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'authors', 'year', 'scope', 'status', 'chunk_count', 'created_at')
    list_filter = ('status', 'scope', 'language')
    search_fields = ('title', 'authors')
    readonly_fields = ('id', 'file_size', 'mime_type', 'page_count', 'chunk_count', 'processed_at', 'created_at', 'updated_at')


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ('document', 'index', 'heading', 'page_start', 'page_end', 'token_count')
    list_filter = ('document',)
    search_fields = ('content', 'heading')
    exclude = ('embedding',)

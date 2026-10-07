from rest_framework import serializers

from .models import Document, IngestJob


class DocumentSerializer(serializers.ModelSerializer):
    section_count = serializers.IntegerField(read_only=True, default=0)
    index_mode = serializers.SerializerMethodField()

    def get_index_mode(self, obj):
        return obj.meta.get('index_mode', 'hybrid')

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'source_type', 'source_key', 'source_url', 'license_name', 'license_url',
            'authors', 'year', 'scope', 'language', 'status', 'error_message', 'chunk_count', 'section_count',
            'page_count', 'original_filename', 'file_size', 'index_mode', 'created_at', 'updated_at', 'processed_at',
        ]
        read_only_fields = [f for f in fields if f not in ('title', 'authors', 'year', 'scope')]


class IngestJobSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True, default='')

    class Meta:
        model = IngestJob
        fields = [
            'id', 'kind', 'status', 'document', 'document_title', 'total', 'processed', 'created_count',
            'skipped_count', 'failed_count', 'log', 'cancel_requested', 'created_at', 'updated_at', 'finished_at',
        ]

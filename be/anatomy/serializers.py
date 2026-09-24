from rest_framework import serializers

from core.models import ContentStatus
from users.permissions import is_admin

from .models import AnatomyModel, BodySystem, ModelAnnotation, Structure, StructureReference


class BodySystemSerializer(serializers.ModelSerializer):
    model_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = BodySystem
        fields = ['id', 'slug', 'name_vi', 'name_en', 'description', 'color', 'order', 'is_published', 'model_count']


class StructureReferenceSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True)
    citation = serializers.CharField(source='document.citation', read_only=True)

    class Meta:
        model = StructureReference
        fields = ['id', 'document', 'document_title', 'citation', 'page_start', 'page_end', 'excerpt']


class StructureSerializer(serializers.ModelSerializer):
    references = StructureReferenceSerializer(many=True, read_only=True)

    class Meta:
        model = Structure
        fields = [
            'id', 'name_en', 'name_vi', 'latin_name', 'system',
            'definition', 'function', 'clinical_note', 'status', 'references', 'updated_at',
        ]
        read_only_fields = ['updated_at']


class AnnotationSerializer(serializers.ModelSerializer):
    """Học viên chỉ thấy nội dung kiến thức khi cấu trúc đã được duyệt."""

    structure = serializers.SerializerMethodField()

    class Meta:
        model = ModelAnnotation
        fields = ['index', 'label', 'structure']

    def get_structure(self, obj):
        structure = obj.structure
        if structure is None:
            return None
        request = self.context.get('request')
        if structure.status != ContentStatus.PUBLISHED and not is_admin(getattr(request, 'user', None)):
            return {'id': structure.id, 'name_en': structure.name_en, 'name_vi': structure.name_vi, 'published': False}
        return {**StructureSerializer(structure, context=self.context).data, 'published': True}


class AnatomyModelListSerializer(serializers.ModelSerializer):
    system = serializers.SlugRelatedField(slug_field='slug', queryset=BodySystem.objects.all(), allow_null=True, required=False)
    annotation_count = serializers.IntegerField(read_only=True, default=0)
    embed_url = serializers.CharField(read_only=True)

    class Meta:
        model = AnatomyModel
        fields = [
            'id', 'sketchfab_uid', 'system', 'title', 'title_vi', 'thumbnail_url', 'embed_url',
            'author_name', 'license_label', 'is_published', 'order', 'annotation_count',
        ]


class AnatomyModelDetailSerializer(AnatomyModelListSerializer):
    annotations = AnnotationSerializer(many=True, read_only=True)
    sketchfab_url = serializers.CharField(read_only=True)
    system_detail = BodySystemSerializer(source='system', read_only=True)

    class Meta(AnatomyModelListSerializer.Meta):
        fields = AnatomyModelListSerializer.Meta.fields + [
            'description', 'tags', 'author_url', 'license_url', 'source_url', 'sketchfab_url',
            'system_detail', 'annotations', 'last_synced_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['last_synced_at', 'created_at', 'updated_at']


# ------------------------------------------------------------
# Dành cho trang quản trị
# ------------------------------------------------------------

from .models import AnatomyToolCollection, ImportJob  # noqa: E402


class AdminStructureSerializer(serializers.ModelSerializer):
    """Cấu trúc kèm số mô hình đang dùng chung."""

    model_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Structure
        fields = [
            'id', 'name_en', 'name_vi', 'latin_name', 'system',
            'definition', 'function', 'clinical_note', 'status', 'model_count', 'updated_at',
        ]
        read_only_fields = ['name_en', 'model_count', 'updated_at']


class AdminAnnotationSerializer(serializers.ModelSerializer):
    structure = serializers.SerializerMethodField()

    class Meta:
        model = ModelAnnotation
        fields = ['index', 'label', 'raw_content', 'structure']

    def get_structure(self, obj):
        if obj.structure is None:
            return None
        s = obj.structure
        return {
            'id': s.id, 'name_en': s.name_en, 'name_vi': s.name_vi, 'latin_name': s.latin_name,
            'definition': s.definition, 'function': s.function, 'clinical_note': s.clinical_note,
            'status': s.status, 'model_count': getattr(s, 'model_count', None),
        }


class AdminModelListSerializer(AnatomyModelListSerializer):
    filled_count = serializers.IntegerField(read_only=True, default=0)
    source_url = serializers.URLField(read_only=True)

    class Meta(AnatomyModelListSerializer.Meta):
        fields = AnatomyModelListSerializer.Meta.fields + ['filled_count', 'source_url', 'created_at', 'updated_at']


class AdminModelDetailSerializer(AnatomyModelDetailSerializer):
    annotations = serializers.SerializerMethodField()
    source_meta = serializers.JSONField(read_only=True)

    class Meta(AnatomyModelDetailSerializer.Meta):
        fields = AnatomyModelDetailSerializer.Meta.fields + ['source_meta']

    def get_annotations(self, obj):
        from django.db.models import Count

        qs = obj.annotations.select_related('structure').all()
        counts = dict(
            Structure.objects.filter(annotations__model=obj)
            .annotate(n=Count('annotations__model', distinct=True))
            .values_list('id', 'n')
        )
        data = []
        for a in qs:
            if a.structure:
                a.structure.model_count = counts.get(a.structure_id)
            data.append(AdminAnnotationSerializer(a).data)
        return data


class CollectionSerializer(serializers.ModelSerializer):
    suggested_system = serializers.SlugRelatedField(slug_field='slug', read_only=True)

    class Meta:
        model = AnatomyToolCollection
        fields = [
            'id', 'url', 'title', 'suggested_system', 'candidate_count', 'imported_count',
            'last_scanned_at', 'last_imported_at',
        ]


class ImportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportJob
        fields = [
            'id', 'kind', 'status', 'total', 'processed', 'created_count', 'skipped_count', 'failed_count',
            'log', 'cancel_requested', 'created_at', 'updated_at', 'finished_at',
        ]

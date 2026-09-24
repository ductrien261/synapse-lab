from rest_framework import serializers

from .models import Algorithm, AlgorithmCategory, AlgorithmContent, AlgorithmReference


class AlgorithmReferenceSerializer(serializers.ModelSerializer):
    citation = serializers.CharField(source='document.citation', read_only=True)

    class Meta:
        model = AlgorithmReference
        fields = ['id', 'document', 'citation', 'page_start', 'page_end', 'excerpt']


class AlgorithmContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlgorithmContent
        fields = [
            'summary', 'theory', 'time_best', 'time_average', 'time_worst', 'space',
            'applications', 'status', 'updated_at',
        ]
        read_only_fields = ['updated_at']


class AlgorithmSerializer(serializers.ModelSerializer):
    category_key = serializers.CharField(source='category.key', read_only=True)
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Algorithm
        fields = ['id', 'key', 'name', 'category_key', 'category_name', 'is_published', 'last_synced_at']

    def get_category_name(self, obj):
        return obj.category.name_vi or obj.category.name_en


class AlgorithmCategorySerializer(serializers.ModelSerializer):
    algorithms = AlgorithmSerializer(many=True, read_only=True)

    class Meta:
        model = AlgorithmCategory
        fields = ['id', 'key', 'name_en', 'name_vi', 'description', 'order', 'algorithms']

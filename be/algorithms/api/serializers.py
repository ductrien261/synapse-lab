from rest_framework import serializers

from algorithms.models import (
    Algorithm, AlgorithmCategory, AlgorithmContent, AlgorithmDraftCandidate,
    AlgorithmReference, AlgorithmScanJob, AlgorithmSource,
)
from algorithms.validators.simulation import validate_simulation
from algorithms.services.assets import asset_key, resolve_block_images


class AlgorithmReferenceSerializer(serializers.ModelSerializer):
    citation = serializers.CharField(source='document.citation', read_only=True)

    class Meta:
        model = AlgorithmReference
        fields = ['id', 'document', 'citation', 'page_start', 'page_end', 'excerpt']


class AlgorithmContentSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['lesson_blocks'] = resolve_block_images(data.get('lesson_blocks', []))
        return data

    def validate_application_scenarios(self, value):
        from algorithms.validators.applications import validate_application_scenarios
        return validate_application_scenarios(value)

    def validate_applications(self, value):
        if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
            raise serializers.ValidationError('Ứng dụng thực tế phải là danh sách văn bản.')
        return value

    def validate_simulation(self, value):
        value = validate_simulation(value)
        expected = self.context.get('algorithm_path')
        if expected is None and self.instance is not None:
            expected = self.instance.algorithm.path
        if value and expected and value['algorithm_path'] != expected:
            raise serializers.ValidationError('Mô phỏng không thuộc thuật toán đang biên soạn.')
        return value

    def validate_code_lesson(self, value):
        if value == {}:
            return value
        if not isinstance(value, dict) or set(value) != {'language', 'source', 'steps'}:
            raise serializers.ValidationError('Bài hướng dẫn code phải có language, source và steps.')
        if value['language'] != 'cpp' or not isinstance(value['source'], str) or not value['source'].strip() or len(value['source']) > 100000:
            raise serializers.ValidationError('Mã nguồn C++ không hợp lệ.')
        steps = value['steps']
        if not isinstance(steps, list) or not 1 <= len(steps) <= 300:
            raise serializers.ValidationError('Bài hướng dẫn phải có từ 1 đến 300 bước.')
        previous_end = 0
        line_count = len(value['source'].splitlines())
        for step in steps:
            if not isinstance(step, dict) or set(step) != {'start_line', 'end_line', 'title', 'note'}:
                raise serializers.ValidationError('Mỗi bước phải có dòng bắt đầu, kết thúc, tiêu đề và giải thích.')
            if type(step['start_line']) is not int or type(step['end_line']) is not int or not previous_end < step['start_line'] <= step['end_line'] <= line_count:
                raise serializers.ValidationError('Các bước phải theo thứ tự dòng mã nguồn, không chồng lấn.')
            if any(not isinstance(step[key], str) or not step[key].strip() for key in ['title', 'note']):
                raise serializers.ValidationError('Tiêu đề và giải thích không được để trống.')
            previous_end = step['end_line']
        return value

    def validate_lesson_fields(self, value):
        keys = {'title', 'summary', 'objectives', 'problem', 'inputOutput', 'example',
                'theory', 'pseudocode', 'complexity', 'applications', 'references'}
        if not isinstance(value, dict) or set(value) != keys or any(not isinstance(v, str) for v in value.values()):
            raise serializers.ValidationError('Nội dung bài học phải gồm đủ 11 mục dạng văn bản.')
        return value

    def validate_lesson_blocks(self, value):
        if not isinstance(value, list) or len(value) > 300:
            raise serializers.ValidationError('Danh sách nội dung không hợp lệ.')
        # API-only URLs must never be persisted when an editor saves a response.
        value = [{k: v for k, v in block.items() if k != 'image_url'}
                 if isinstance(block, dict) else block for block in value]
        keys = {'id', 'kind', 'title', 'text', 'image', 'alt', 'caption', 'source', 'attribution', 'answerType', 'options', 'answer', 'hint', 'solution'}
        kinds = {'theory', 'example', 'exercise'}
        ids = set()
        for block in value:
            if not isinstance(block, dict) or set(block) != keys or any(not isinstance(v, str) for v in block.values()):
                raise serializers.ValidationError('Mỗi mục phải có đủ thông tin dạng văn bản.')
            if block['kind'] not in kinds or block['answerType'] not in {'choice', 'short', 'essay'} or not block['id'] or block['id'] in ids:
                raise serializers.ValidationError('Loại nội dung hoặc mã mục không hợp lệ.')
            ids.add(block['id'])
            for key in ['image', 'source']:
                if key == 'image':
                    try:
                        if asset_key(block[key]):
                            continue
                    except ValueError as exc:
                        raise serializers.ValidationError(str(exc)) from exc
                if block[key] and not block[key].startswith('https://'):
                    raise serializers.ValidationError('Ảnh và nguồn phải sử dụng HTTPS.')
        return value

    class Meta:
        model = AlgorithmContent
        fields = [
            'summary', 'theory', 'time_best', 'time_average', 'time_worst', 'space',
            'applications', 'application_scenarios', 'status', 'updated_at', 'lesson_fields', 'lesson_blocks', 'code_lesson', 'simulation',
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
    name = serializers.SerializerMethodField()
    algorithms = AlgorithmSerializer(many=True, read_only=True)

    class Meta:
        model = AlgorithmCategory
        fields = ['id', 'key', 'name', 'name_en', 'name_vi', 'description', 'order', 'algorithms']

    def get_name(self, obj):
        return obj.name_vi or obj.name_en


class AlgorithmSourceSerializer(serializers.ModelSerializer):
    source_type = serializers.SerializerMethodField()
    source_url = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = AlgorithmSource
        fields = [
            'id', 'name', 'kind', 'source_type', 'source_url', 'allowed_domain',
            'license_name', 'description', 'enabled', 'priority', 'document',
        ]

    def get_source_type(self, obj):
        return obj.document.source_type if obj.document_id else 'url'

    def get_source_url(self, obj):
        return obj.document.source_url if obj.document_id else obj.url

    def get_description(self, obj):
        if not obj.document_id:
            return f'Tên miền được duyệt: {obj.allowed_domain}'
        where = obj.document.authors or obj.document.publisher
        return f'{where} · {obj.document.chunk_count} đoạn' if where else f'{obj.document.chunk_count} đoạn tài liệu'


class AlgorithmScanJobSerializer(serializers.ModelSerializer):
    candidate_ids = serializers.PrimaryKeyRelatedField(source='candidates', many=True, read_only=True)

    class Meta:
        model = AlgorithmScanJob
        fields = [
            'id', 'status', 'total', 'processed', 'succeeded', 'failed', 'log',
            'error', 'candidate_ids', 'created_at', 'updated_at', 'finished_at',
        ]


class AlgorithmDraftCandidateSerializer(serializers.ModelSerializer):
    algorithm_path = serializers.CharField(source='algorithm.path', read_only=True)
    algorithm_name = serializers.CharField(source='algorithm.name', read_only=True)

    class Meta:
        model = AlgorithmDraftCandidate
        fields = [
            'id', 'algorithm_path', 'algorithm_name', 'job', 'status', 'fields',
            'citations', 'source_ids', 'query', 'prompt_version', 'warnings',
            'error', 'created_at', 'updated_at', 'reviewed_at',
        ]

from rest_framework import serializers

from .models import LearningActivity, StudyNote


class LearningActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningActivity
        fields = [
            'id', 'track', 'kind', 'object_key', 'href', 'title', 'subtitle', 'group',
            'visit_count', 'first_visited_at', 'last_visited_at',
        ]
        read_only_fields = ['id', 'visit_count', 'first_visited_at', 'last_visited_at']
        # Bỏ kiểm tra unique mặc định: POST trùng bài học = cập nhật lượt xem
        validators = []


class StudyNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyNote
        fields = ['kind', 'object_key', 'part_index', 'content', 'updated_at']
        read_only_fields = ['updated_at']
        validators = []
        extra_kwargs = {'content': {'allow_blank': True, 'max_length': 10000}}

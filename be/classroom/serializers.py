import math
import re

from drf_spectacular.utils import extend_schema_field
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.storage import default_storage
from rest_framework import serializers

from anatomy.models import AnatomyModel

from .models import Classroom, LessonPlan, LessonQuiz, LessonResource, LessonSection, LiveSession


class LessonResourceReferenceField(serializers.PrimaryKeyRelatedField):
    """Accept the resource UUID and gracefully migrate old title-based drafts."""

    default_error_messages = {
        **serializers.PrimaryKeyRelatedField.default_error_messages,
        'ambiguous_title': 'Có nhiều tài liệu cùng tên; hãy chọn lại tài liệu kích hoạt.',
    }

    def to_internal_value(self, data):
        if isinstance(data, LessonResource):
            return data
        try:
            return super().to_internal_value(data)
        except (DjangoValidationError, serializers.ValidationError) as uuid_error:
            if not isinstance(data, str):
                raise uuid_error
            queryset = self.get_queryset()
            root_instance = getattr(self.root, 'instance', None)
            if isinstance(root_instance, LessonResource):
                queryset = queryset.filter(
                    section__plan__classroom_id=root_instance.section.plan.classroom_id,
                )
            matches = queryset.filter(title=data)[:2]
            if len(matches) == 1:
                return matches[0]
            if len(matches) > 1:
                self.fail('ambiguous_title')
            raise uuid_error


class LiveSessionSerializer(serializers.ModelSerializer):
    mode = serializers.SerializerMethodField()
    current_user_joined = serializers.SerializerMethodField()

    class Meta:
        model = LiveSession
        fields = [
            'id', 'title', 'status', 'participant_count', 'started_at', 'ended_at',
            'last_synced_at', 'mode', 'current_user_joined',
        ]

    @extend_schema_field(serializers.ChoiceField(choices=['livekit']))
    def get_mode(self, _obj):
        return 'livekit'

    @extend_schema_field(serializers.BooleanField)
    def get_current_user_joined(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return obj.attendances.filter(user=request.user, left_at__isnull=True).exists()


class ClassroomSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    is_owner = serializers.SerializerMethodField()
    active_session = serializers.SerializerMethodField()

    class Meta:
        model = Classroom
        fields = [
            'id', 'name', 'description', 'code', 'purpose', 'track', 'owner_email',
            'member_count', 'is_owner', 'is_archived', 'active_session', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'code', 'owner_email', 'member_count', 'is_owner', 'is_archived', 'active_session',
            'created_at', 'updated_at',
        ]

    @extend_schema_field(serializers.BooleanField)
    def get_is_owner(self, obj):
        request = self.context.get('request')
        return bool(request and obj.owner_id == request.user.id)

    @extend_schema_field(LiveSessionSerializer(allow_null=True))
    def get_active_session(self, obj):
        session = obj.sessions.filter(status=LiveSession.Status.LIVE).first()
        if not session:
            return None
        return LiveSessionSerializer(
            session,
            context={
                'request': self.context.get('request'),
            },
        ).data


class ClassroomUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classroom
        fields = ['name', 'description', 'is_archived']
        extra_kwargs = {
            'name': {'required': False, 'allow_blank': False},
            'description': {'required': False, 'allow_blank': True},
            'is_archived': {'required': False},
        }

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError('Tên lớp không được để trống.')
        return name


class JoinClassroomSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=8, trim_whitespace=True)

    def validate_code(self, value):
        return ''.join(value.split()).upper()


class StartSessionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    resource_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=False,
    )

    def validate_resource_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Danh sách nội dung không được trùng lặp.')
        return value


class StartPollSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=500, trim_whitespace=True)
    options = serializers.ListField(
        child=serializers.CharField(max_length=200, trim_whitespace=True),
        min_length=2,
        max_length=6,
    )
    duration_seconds = serializers.IntegerField(min_value=15, max_value=300, default=60)
    is_anonymous = serializers.BooleanField(default=True)

    def validate_options(self, value):
        options = [option.strip() for option in value]
        if any(not option for option in options):
            raise serializers.ValidationError('Lựa chọn không được để trống.')
        if len({option.casefold() for option in options}) != len(options):
            raise serializers.ValidationError('Các lựa chọn không được trùng nhau.')
        return options


class PollAnswerSerializer(serializers.Serializer):
    selected_option = serializers.IntegerField(min_value=0)


class WhiteboardSnapshotSerializer(serializers.Serializer):
    resource_id = serializers.UUIDField(required=False, allow_null=True)
    page = serializers.IntegerField(min_value=1, max_value=10000, default=1)
    strokes = serializers.JSONField(default=list)
    locked = serializers.BooleanField(default=True)

    def validate_strokes(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Danh sách nét vẽ không hợp lệ.')
        if len(value) > 300:
            raise serializers.ValidationError('Bảng chỉ hỗ trợ tối đa 300 nét vẽ.')
        normalized = []
        seen_ids = set()
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError('Nét vẽ không hợp lệ.')
            stroke_id = item.get('id')
            author_id = item.get('authorId')
            author_name = item.get('authorName')
            tool = item.get('tool')
            color = item.get('color')
            points = item.get('points')
            created_at = item.get('createdAt')
            if not isinstance(stroke_id, str) or not stroke_id or len(stroke_id) > 100 or stroke_id in seen_ids:
                raise serializers.ValidationError('Mã nét vẽ không hợp lệ hoặc bị trùng.')
            if not isinstance(author_id, str) or not author_id or len(author_id) > 255:
                raise serializers.ValidationError('Người tạo nét vẽ không hợp lệ.')
            if not isinstance(author_name, str) or not author_name.strip() or len(author_name) > 200:
                raise serializers.ValidationError('Tên người tạo nét vẽ không hợp lệ.')
            if tool not in {'pen', 'highlighter'}:
                raise serializers.ValidationError('Công cụ vẽ không hợp lệ.')
            if not isinstance(color, str) or not re.fullmatch(r'#[0-9A-Fa-f]{6}', color):
                raise serializers.ValidationError('Màu nét vẽ không hợp lệ.')
            if not isinstance(created_at, (int, float)) or isinstance(created_at, bool) or not math.isfinite(created_at):
                raise serializers.ValidationError('Thời gian tạo nét vẽ không hợp lệ.')
            if not isinstance(points, list) or not 2 <= len(points) <= 180:
                raise serializers.ValidationError('Số điểm của nét vẽ không hợp lệ.')
            normalized_points = []
            for point in points:
                if not isinstance(point, list) or len(point) != 2:
                    raise serializers.ValidationError('Tọa độ nét vẽ không hợp lệ.')
                if any(not isinstance(axis, (int, float)) or isinstance(axis, bool) or not math.isfinite(axis) or axis < 0 or axis > 1 for axis in point):
                    raise serializers.ValidationError('Tọa độ nét vẽ phải nằm trong khoảng 0–1.')
                normalized_points.append([float(point[0]), float(point[1])])
            seen_ids.add(stroke_id)
            normalized.append({
                'id': stroke_id,
                'authorId': author_id,
                'authorName': author_name.strip(),
                'tool': tool,
                'color': color.upper(),
                'points': normalized_points,
                'createdAt': created_at,
            })
        return normalized


class LessonQuizSerializer(serializers.ModelSerializer):
    trigger_resource = LessonResourceReferenceField(
        queryset=LessonResource.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = LessonQuiz
        fields = [
            'question', 'options', 'correct_option', 'duration_seconds', 'trigger_mode',
            'trigger_minute', 'delay_seconds', 'trigger_resource', 'trigger_slide_number',
            'success_threshold',
        ]

    def validate(self, attrs):
        options = attrs.get('options', getattr(self.instance, 'options', []))
        correct_option = attrs.get('correct_option', getattr(self.instance, 'correct_option', 0))
        if len(options) < 2:
            raise serializers.ValidationError({'options': 'Quiz cần ít nhất hai đáp án.'})
        if correct_option >= len(options):
            raise serializers.ValidationError({'correct_option': 'Đáp án đúng không nằm trong danh sách lựa chọn.'})
        trigger_resource = attrs.get('trigger_resource', getattr(self.instance, 'trigger_resource', None))
        trigger_slide_number = attrs.get(
            'trigger_slide_number', getattr(self.instance, 'trigger_slide_number', 1),
        )
        if trigger_resource and trigger_resource.kind not in {
            LessonResource.Kind.SLIDE,
            LessonResource.Kind.PDF,
        }:
            raise serializers.ValidationError({'trigger_resource': 'Quiz chỉ có thể gắn với slide hoặc PDF.'})
        if trigger_resource and trigger_slide_number > max(trigger_resource.preview_page_count, 1):
            raise serializers.ValidationError({'trigger_slide_number': 'Số slide vượt quá số trang của tài liệu.'})
        if self.instance and trigger_resource:
            quiz_classroom_id = self.instance.resource.section.plan.classroom_id
            trigger_classroom_id = trigger_resource.section.plan.classroom_id
            if quiz_classroom_id != trigger_classroom_id:
                raise serializers.ValidationError({'trigger_resource': 'Tài liệu kích hoạt phải thuộc cùng lớp học.'})
        return attrs


class LessonResourceSerializer(serializers.ModelSerializer):
    quiz = LessonQuizSerializer(required=False, allow_null=True)
    anatomy_model = serializers.SlugRelatedField(
        slug_field='sketchfab_uid', queryset=AnatomyModel.objects.filter(is_published=True),
        required=False, allow_null=True,
    )
    anatomy_model_detail = serializers.SerializerMethodField()
    preview_pdf_url = serializers.SerializerMethodField()
    preview_slide_urls = serializers.SerializerMethodField()

    class Meta:
        model = LessonResource
        fields = [
            'id', 'section', 'kind', 'title', 'description', 'file', 'external_url',
            'anatomy_model', 'anatomy_model_detail', 'duration_minutes', 'position',
            'visible_to_students', 'allow_download', 'show_page_number', 'learning_objectives',
            'tags', 'metadata', 'quiz', 'preview_status', 'preview_error',
            'preview_page_count', 'preview_pdf_url', 'preview_slide_urls',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'anatomy_model_detail', 'preview_status', 'preview_error',
            'preview_page_count', 'preview_pdf_url', 'preview_slide_urls',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {'position': {'required': False}, 'section': {'required': False}}

    def get_anatomy_model_detail(self, obj):
        model = obj.anatomy_model
        if not model:
            return None
        return {
            'sketchfab_uid': model.sketchfab_uid,
            'title': model.title_vi or model.title,
            'thumbnail_url': model.thumbnail_url,
            'embed_url': model.embed_url,
            'system': model.system.slug if model.system_id else None,
        }

    def _absolute_url(self, url):
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_preview_pdf_url(self, obj):
        if not obj.preview_pdf:
            return None
        try:
            return self._absolute_url(obj.preview_pdf.url)
        except ValueError:
            return None

    def get_preview_slide_urls(self, obj):
        urls = []
        for storage_name in obj.preview_slides or []:
            try:
                urls.append(self._absolute_url(default_storage.url(storage_name)))
            except ValueError:
                continue
        return urls

    def validate(self, attrs):
        kind = attrs.get('kind', getattr(self.instance, 'kind', None))
        uploaded_file = attrs.get('file')
        if self.instance is None and kind in {LessonResource.Kind.PDF, LessonResource.Kind.SLIDE, LessonResource.Kind.DOC} and not uploaded_file:
            raise serializers.ValidationError({'file': 'Hãy chọn tệp tài liệu để tải lên.'})
        anatomy_model = attrs.get('anatomy_model', getattr(self.instance, 'anatomy_model', None))
        quiz_data = attrs.get('quiz')
        if kind == LessonResource.Kind.MODEL_3D and not anatomy_model:
            raise serializers.ValidationError({'anatomy_model': 'Tài nguyên 3D phải chọn một mô hình Giải phẫu.'})
        if kind == LessonResource.Kind.QUIZ and not quiz_data and not hasattr(self.instance, 'quiz'):
            raise serializers.ValidationError({'quiz': 'Tài nguyên quiz cần nội dung câu hỏi.'})
        if kind == LessonResource.Kind.SLIDE and uploaded_file and not uploaded_file.name.lower().endswith('.pptx'):
            raise serializers.ValidationError({'file': 'Bài trình chiếu phải ở định dạng .pptx.'})
        return attrs

    def create(self, validated_data):
        quiz_data = validated_data.pop('quiz', None)
        resource = super().create(validated_data)
        if resource.kind == LessonResource.Kind.QUIZ and quiz_data:
            LessonQuiz.objects.create(resource=resource, **quiz_data)
        return resource

    def update(self, instance, validated_data):
        quiz_data = validated_data.pop('quiz', None)
        resource = super().update(instance, validated_data)
        if quiz_data is not None:
            quiz, _ = LessonQuiz.objects.get_or_create(
                resource=resource,
                defaults={
                    'question': quiz_data.get('question', 'Câu hỏi mới'),
                    'options': quiz_data.get('options', ['Đáp án A', 'Đáp án B']),
                },
            )
            serializer = LessonQuizSerializer(quiz, data=quiz_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return resource


class LessonSectionSerializer(serializers.ModelSerializer):
    resources = LessonResourceSerializer(many=True, read_only=True)

    class Meta:
        model = LessonSection
        fields = [
            'id', 'plan', 'title', 'objective', 'teacher_notes', 'duration_minutes',
            'position', 'resources', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'resources', 'created_at', 'updated_at']
        extra_kwargs = {'position': {'required': False}, 'plan': {'required': False}}


class LessonPlanSerializer(serializers.ModelSerializer):
    sections = LessonSectionSerializer(many=True, read_only=True)

    class Meta:
        model = LessonPlan
        fields = ['id', 'classroom', 'subject', 'title', 'objective', 'sections', 'created_at', 'updated_at']
        read_only_fields = ['id', 'classroom', 'sections', 'created_at', 'updated_at']

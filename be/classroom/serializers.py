from drf_spectacular.utils import extend_schema_field
from django.core.files.storage import default_storage
from rest_framework import serializers

from anatomy.models import AnatomyModel

from .models import Classroom, LessonPlan, LessonQuiz, LessonResource, LessonSection, LiveSession


class LiveSessionSerializer(serializers.ModelSerializer):
    mode = serializers.SerializerMethodField()
    current_user_joined = serializers.SerializerMethodField()

    class Meta:
        model = LiveSession
        fields = [
            'id', 'title', 'status', 'record', 'participant_count', 'started_at', 'ended_at',
            'last_synced_at', 'mode', 'current_user_joined',
        ]

    @extend_schema_field(serializers.ChoiceField(choices=['mock', 'live']))
    def get_mode(self, _obj):
        return 'live' if self.context.get('bbb_enabled') else 'mock'

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
                'bbb_enabled': self.context.get('bbb_enabled', False),
                'request': self.context.get('request'),
            },
        ).data


class JoinClassroomSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=8, trim_whitespace=True)

    def validate_code(self, value):
        return ''.join(value.split()).upper()


class StartSessionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    record = serializers.BooleanField(default=False)


class LessonQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonQuiz
        fields = [
            'question', 'options', 'correct_option', 'duration_seconds', 'trigger_mode',
            'trigger_minute', 'delay_seconds', 'success_threshold',
        ]

    def validate(self, attrs):
        options = attrs.get('options', getattr(self.instance, 'options', []))
        correct_option = attrs.get('correct_option', getattr(self.instance, 'correct_option', 0))
        if len(options) < 2:
            raise serializers.ValidationError({'options': 'Quiz cần ít nhất hai đáp án.'})
        if correct_option >= len(options):
            raise serializers.ValidationError({'correct_option': 'Đáp án đúng không nằm trong danh sách lựa chọn.'})
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

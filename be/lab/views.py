"""
Bài thực hành (lab).

GET    /api/lab/lessons/?scope=mine|public|trash   danh sách (mặc định mine); trash là bài đã xóa mềm của mình
POST   /api/lab/lessons/                           {spec} tạo bài riêng tư từ gói bài
GET    /api/lab/lessons/<slug>/                    chi tiết kèm spec (chủ bài, hoặc bài công khai, hoặc admin)
PATCH  /api/lab/lessons/<slug>/                    {spec} sửa bài của mình (bài đang chờ/công khai sẽ về riêng tư)
DELETE /api/lab/lessons/<slug>/                    xóa mềm
POST   /api/lab/lessons/<slug>/restore/            khôi phục bài đã xóa mềm
POST   /api/lab/lessons/<slug>/submit/             gửi đóng góp để admin duyệt
POST   /api/lab/lessons/<slug>/withdraw/           rút lại bài đang chờ duyệt
GET    /api/lab/admin/lessons/?visibility=pending  danh sách chờ duyệt (admin)
POST   /api/lab/admin/lessons/<slug>/review/       {action: approve|reject, note?} (admin)
"""

from django.db import IntegrityError, transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from users.permissions import IsAdminRole, is_admin

from . import services
from .models import Lesson
from .validators import validate_package


class LabWriteThrottle(UserRateThrottle):
    rate = '60/hour'


def _summary(lesson: Lesson, user) -> dict:
    return {
        'slug': lesson.slug,
        'title': lesson.title,
        'subtitle': lesson.subtitle,
        'visibility': lesson.visibility,
        'is_deleted': lesson.is_deleted,
        'is_mine': lesson.created_by_id == user.id,
        'author': (getattr(lesson.created_by, 'name', '') or '') if lesson.created_by else '',
        'review_note': lesson.review_note,
        'created_at': lesson.created_at,
        'updated_at': lesson.updated_at,
    }


def _detail(lesson: Lesson, user) -> dict:
    return {**_summary(lesson, user), 'spec': lesson.spec, 'schema_version': lesson.schema_version}


class SpecInput(serializers.Serializer):
    spec = serializers.DictField()

    def validate_spec(self, spec):
        errors = validate_package(spec)
        if errors:
            raise serializers.ValidationError(errors[:20])
        return spec


def _error(message: str, code: int = status.HTTP_409_CONFLICT) -> Response:
    return Response({'detail': message}, status=code)


class LessonListCreateView(APIView):
    throttle_classes = [LabWriteThrottle]

    def get_throttles(self):
        return super().get_throttles() if self.request.method == 'POST' else []

    def get(self, request):
        scope = request.query_params.get('scope', 'mine')
        if scope == 'public':
            qs = Lesson.objects.alive().filter(visibility=Lesson.Visibility.PUBLIC)
        elif scope == 'trash':
            qs = Lesson.objects.filter(created_by=request.user, is_deleted=True)
        elif scope == 'mine':
            qs = Lesson.objects.alive().filter(created_by=request.user)
        else:
            return _error('scope phải là mine, public hoặc trash.', status.HTTP_400_BAD_REQUEST)
        return Response([_summary(x, request.user) for x in qs.select_related('created_by')])

    def post(self, request):
        data = SpecInput(data=request.data)
        data.is_valid(raise_exception=True)
        spec = data.validated_data['spec']
        digest = services.content_hash(spec)
        mine = Lesson.objects.alive().filter(created_by=request.user, content_hash=digest).first()
        if mine:
            return _error(f'Bạn đã có bài giống hệt nội dung này: "{mine.title}".')
        public = services.find_duplicate(spec, public_only=True)
        if public:
            return _error(f'Đã có bài công khai trùng nội dung: "{public.title}". Hãy dùng bài đó.')
        try:
            with transaction.atomic():
                lesson = Lesson.objects.create(
                    slug=spec['slug'], title=spec['title'], subtitle=spec['subtitle'], schema_version=spec['schemaVersion'],
                    spec=spec, content_hash=digest, created_by=request.user,
                )
        except IntegrityError:
            return _error('Mã bài (slug) này đã được dùng. Hãy đổi slug.')
        return Response(_detail(lesson, request.user), status=status.HTTP_201_CREATED)


class LessonDetailView(APIView):
    def get_throttles(self):
        return super().get_throttles() if self.request.method == 'PATCH' else []

    throttle_classes = [LabWriteThrottle]

    def _get(self, request, slug) -> Lesson:
        lesson = get_object_or_404(Lesson.objects.select_related('created_by'), slug=slug)
        owner = lesson.created_by_id == request.user.id
        visible = owner or is_admin(request.user) or (lesson.visibility == Lesson.Visibility.PUBLIC and not lesson.is_deleted)
        if not visible:
            raise Http404
        return lesson

    def get(self, request, slug):
        return Response(_detail(self._get(request, slug), request.user))

    def patch(self, request, slug):
        lesson = get_object_or_404(Lesson, slug=slug, created_by=request.user, is_deleted=False)
        data = SpecInput(data=request.data)
        data.is_valid(raise_exception=True)
        spec = data.validated_data['spec']
        if spec['slug'] != lesson.slug:
            return _error('Không đổi được slug của bài đã tạo.', status.HTTP_400_BAD_REQUEST)
        digest = services.content_hash(spec)
        mine = Lesson.objects.alive().filter(created_by=request.user, content_hash=digest).exclude(pk=lesson.pk).first()
        if mine:
            return _error(f'Bạn đã có bài khác giống hệt nội dung này: "{mine.title}".')
        public = services.find_duplicate(spec, exclude_id=lesson.pk, public_only=True)
        if public:
            return _error(f'Đã có bài công khai trùng nội dung: "{public.title}".')
        lesson.title, lesson.subtitle, lesson.spec, lesson.content_hash = spec['title'], spec['subtitle'], spec, digest
        lesson.schema_version = spec['schemaVersion']
        # Sửa nội dung thì bản đã gửi hoặc đã công khai không còn là bản đã duyệt
        lesson.visibility = Lesson.Visibility.PRIVATE
        lesson.save()
        return Response(_detail(lesson, request.user))

    def delete(self, request, slug):
        lesson = get_object_or_404(Lesson, slug=slug, created_by=request.user, is_deleted=False)
        lesson.soft_delete(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class _OwnerAction(APIView):
    throttle_classes = [LabWriteThrottle]


class LessonRestoreView(_OwnerAction):
    def post(self, request, slug):
        lesson = get_object_or_404(Lesson, slug=slug, created_by=request.user, is_deleted=True)
        lesson.restore()
        return Response(_summary(lesson, request.user))


class LessonSubmitView(_OwnerAction):
    def post(self, request, slug):
        lesson = get_object_or_404(Lesson, slug=slug, created_by=request.user, is_deleted=False)
        try:
            services.submit_for_review(lesson)
        except services.SubmitError as err:
            return _error(str(err))
        return Response(_summary(lesson, request.user))


class LessonWithdrawView(_OwnerAction):
    def post(self, request, slug):
        lesson = get_object_or_404(Lesson, slug=slug, created_by=request.user, is_deleted=False)
        if lesson.visibility != Lesson.Visibility.PENDING:
            return _error('Chỉ rút lại được bài đang chờ duyệt.')
        lesson.visibility = Lesson.Visibility.PRIVATE
        lesson.save(update_fields=['visibility', 'updated_at'])
        return Response(_summary(lesson, request.user))


class AdminLessonListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        visibility = request.query_params.get('visibility', Lesson.Visibility.PENDING)
        if visibility not in Lesson.Visibility.values:
            return _error('visibility không hợp lệ.', status.HTTP_400_BAD_REQUEST)
        qs = Lesson.objects.alive().filter(visibility=visibility).select_related('created_by').order_by('submitted_at', 'id')
        return Response([_summary(x, request.user) for x in qs])


class AdminLessonReviewView(APIView):
    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        action = serializers.ChoiceField(choices=('approve', 'reject'))
        note = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='')

    def post(self, request, slug):
        lesson = get_object_or_404(Lesson, slug=slug)
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        approve = data.validated_data['action'] == 'approve'
        if not approve and not data.validated_data['note'].strip():
            return _error('Khi từ chối cần ghi lý do để người đóng góp sửa.', status.HTTP_400_BAD_REQUEST)
        try:
            services.review(lesson, request.user, approve=approve, note=data.validated_data['note'])
        except services.SubmitError as err:
            return _error(str(err))
        return Response(_summary(lesson, request.user))

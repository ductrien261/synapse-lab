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

POST   /api/lab/generations/                       {request} bắt đầu sinh bài (chạy nền); trả về lần sinh
GET    /api/lab/generations/                       các lần sinh gần đây của mình
GET    /api/lab/generations/<id>/                  tiến trình từng bước + bản xem trước; hỏi lại định kỳ
POST   /api/lab/generations/<id>/cancel/           hủy lần sinh đang chạy
"""

import hashlib
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import Http404
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from users.permissions import IsAdminRole, is_admin

from . import services
from .generation import runner
from .models import Generation, Lesson
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


# ------------------------------------------------------------------ Sinh bài bằng AI

def _gen_summary(g: Generation) -> dict:
    return {
        'id': g.id, 'request': g.request, 'status': g.status, 'is_active': g.is_active, 'stage': g.stage,
        'tokens_used': g.tokens_used, 'message': g.message, 'lesson_slug': g.lesson.slug if g.lesson_id else None,
        'created_at': g.created_at, 'updated_at': g.updated_at,
    }


def _gen_detail(g: Generation) -> dict:
    st = g.state or {}
    layout = st.get('layout') or {}
    return {
        **_gen_summary(g), 'steps': g.steps, 'repair_rounds': g.repair_rounds, 'errors': g.errors,
        'limits': {'max_repairs': getattr(settings, 'LAB_GEN_MAX_REPAIRS', 3), 'token_cap': getattr(settings, 'LAB_GEN_TOKEN_CAP', 60000)},
        # Bản xem trước theo từng bước đã xong, để giao diện hiện bài được dựng dần
        'preview': {'plan': st.get('plan'), 'parts': (st.get('parts') or {}).get('parts'), 'layout': layout.get('positions'), 'scene': layout.get('scene'),
                    'wiring': st.get('wiring'), 'exercises': (st.get('exercises') or {}).get('exercises'), 'package': st.get('package')},
    }


def _norm_request(text: str) -> str:
    return ' '.join(text.lower().split())


class GenerationListCreateView(APIView):
    throttle_classes = [LabWriteThrottle]

    class Input(serializers.Serializer):
        request = serializers.CharField(min_length=5, max_length=500, trim_whitespace=True)

    def get_throttles(self):
        return super().get_throttles() if self.request.method == 'POST' else []

    def get(self, request):
        qs = Generation.objects.filter(user=request.user).select_related('lesson')[:30]
        return Response([_gen_summary(g) for g in qs])

    def post(self, request):
        if getattr(settings, 'LAB_GEN_AGENTS', 'off') not in ('fake', 'ai'):
            return _error('Tính năng sinh bài chưa được bật.', status.HTTP_503_SERVICE_UNAVAILABLE)
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        text = data.validated_data['request']
        digest = hashlib.sha256(_norm_request(text).encode('utf-8')).hexdigest()
        today = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
        mine = Generation.objects.filter(user=request.user).select_related('lesson')

        active = mine.filter(status__in=Generation.ACTIVE).first()
        if active:
            if active.request_hash == digest:
                return Response(_gen_detail(active))
            return Response({'detail': 'Bạn đang có một lần sinh đang chạy. Hãy đợi hoặc hủy nó trước.', 'generation_id': active.id}, status=status.HTTP_409_CONFLICT)
        same = mine.filter(request_hash=digest, created_at__gte=today, status=Generation.Status.SUCCEEDED).first()
        if same:  # cùng yêu cầu trong ngày: dùng lại kết quả, không tốn thêm lượt
            return Response(_gen_detail(same))
        limit = getattr(settings, 'LAB_GEN_DAILY_LIMIT', 5)
        if not is_admin(request.user) and mine.filter(created_at__gte=today).exclude(status=Generation.Status.CANCELLED).count() >= limit:
            return _error(f'Bạn đã dùng hết {limit} lần sinh bài hôm nay. Hạn mức làm mới lúc 0h.', status.HTTP_429_TOO_MANY_REQUESTS)

        gen = Generation.objects.create(user=request.user, request=text, request_hash=digest, stage='plan')
        runner.start(gen.id)
        gen.refresh_from_db()
        return Response(_gen_detail(gen), status=status.HTTP_201_CREATED)


class GenerationDetailView(APIView):
    def _get(self, request, pk) -> Generation:
        gen = get_object_or_404(Generation.objects.select_related('lesson'), pk=pk)
        if gen.user_id != request.user.id and not is_admin(request.user):
            raise Http404
        return gen

    def get(self, request, pk):
        gen = self._get(request, pk)
        runner.ensure_running(gen)  # bị bỏ dở (ví dụ backend khởi động lại) thì chạy tiếp
        gen.refresh_from_db()
        return Response(_gen_detail(gen))


class GenerationCancelView(_OwnerAction):
    def post(self, request, pk):
        gen = get_object_or_404(Generation, pk=pk, user=request.user)
        if not gen.is_active:
            return _error('Lần sinh này đã kết thúc.')
        gen.cancel_requested = True
        gen.save(update_fields=['cancel_requested', 'updated_at'])
        stale = gen.heartbeat_at is None or timezone.now() - gen.heartbeat_at > timedelta(seconds=runner.stale_seconds())
        if stale:  # không có ai đang chạy: hủy luôn
            gen.status, gen.message = Generation.Status.CANCELLED, 'Bạn đã hủy lần sinh này.'
            gen.save(update_fields=['status', 'message', 'updated_at'])
        return Response(_gen_summary(gen))

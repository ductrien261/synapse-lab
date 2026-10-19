import io
from datetime import timedelta
from urllib.parse import urlsplit
from uuid import uuid4
import requests

import pymupdf as fitz
from PIL import Image
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, F, Max, OuterRef, Prefetch, Q
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ClassMembership,
    Classroom,
    LessonPlan,
    LessonQuiz,
    LessonResource,
    LessonSection,
    LivePoll,
    LivePollResponse,
    LiveQuizResponse,
    LiveQuizRun,
    LiveSession,
    SessionAttendance,
    SessionWhiteboardSnapshot,
)
from .livekit import create_video_token, delete_room
from .document_rendering import (
    cleanup_lesson_resource_files,
    render_lesson_resource_preview,
)
from .serializers import (
    ClassroomSerializer,
    ClassroomUpdateSerializer,
    JoinClassroomSerializer,
    LessonPlanSerializer,
    LessonResourceSerializer,
    LessonSectionSerializer,
    PollAnswerSerializer,
    StartSessionSerializer,
    StartPollSerializer,
    WhiteboardSnapshotSerializer,
)
from .quiz_runtime import (
    close_expired_quiz_runs,
    serialize_quiz_report_run,
    serialize_quiz_run,
)


PRESENTABLE_RESOURCE_KINDS = [
    LessonResource.Kind.PDF,
    LessonResource.Kind.DOC,
    LessonResource.Kind.SLIDE,
    LessonResource.Kind.MODEL_3D,
    LessonResource.Kind.VIDEO,
    LessonResource.Kind.LINK,
]


def classroom_queryset(user):
    membership = ClassMembership.objects.filter(classroom=OuterRef('pk'), user=user)
    return (
        Classroom.objects.annotate(is_member=Exists(membership))
        .filter(Q(owner=user) | Q(is_member=True), is_archived=False)
        .select_related('owner')
        .annotate(member_count=Count('memberships', distinct=True))
    )


def get_member_classroom(user, code):
    return get_object_or_404(classroom_queryset(user), code=code.upper())


def require_classroom_owner(classroom, user):
    if classroom.owner_id != user.id:
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied('Chỉ chủ lớp được chỉnh sửa nội dung bài dạy.')


def lesson_plan_queryset():
    return LessonPlan.objects.prefetch_related(
        Prefetch(
            'sections',
            queryset=LessonSection.objects.prefetch_related(
                Prefetch('resources', queryset=LessonResource.objects.select_related('anatomy_model__system', 'quiz')),
            ),
        ),
    )


def session_resource_queryset(classroom, session):
    """Resources enabled for this live session; legacy sessions keep the full lesson plan."""
    queryset = LessonResource.objects.filter(section__plan__classroom=classroom)
    if session.uses_resource_selection:
        queryset = queryset.filter(selected_for_sessions=session)
    return queryset


def serialize_classroom(classroom, request):
    return ClassroomSerializer(
        classroom,
        context={'request': request},
    ).data


def finish_session(session):
    now = timezone.now()
    session.quiz_runs.filter(status=LiveQuizRun.Status.OPEN).update(
        status=LiveQuizRun.Status.CLOSED,
        closed_at=now,
    )
    session.polls.filter(status=LivePoll.Status.OPEN).update(
        status=LivePoll.Status.CLOSED,
        closed_at=now,
    )
    session.status = LiveSession.Status.ENDED
    session.ended_at = now
    session.participant_count = 0
    session.last_synced_at = now
    session.save(update_fields=['status', 'ended_at', 'participant_count', 'last_synced_at', 'updated_at'])
    session.attendances.filter(left_at__isnull=True).update(left_at=now)


def prepare_pdf_resource(resource):
    try:
        with fitz.open(resource.file.path) as document:
            page_count = document.page_count
            if page_count < 1:
                raise ValueError('PDF không có trang.')
    except (fitz.FileDataError, ValueError, OSError, NotImplementedError):
        cleanup_lesson_resource_files(resource)
        resource.delete()
        return None
    resource.preview_page_count = page_count
    resource.save(update_fields=['preview_page_count', 'updated_at'])
    return resource


def render_pdf_resource_page(resource, page):
    cache_key = f'local-pdf-page:{resource.id}:{resource.updated_at.timestamp()}:{page}'
    image_bytes = cache.get(cache_key)
    if image_bytes is None:
        try:
            with fitz.open(resource.file.path) as document:
                if page < 1 or page > document.page_count:
                    raise Http404('Trang PDF không tồn tại.')
                pdf_page = document.load_page(page - 1)
                scale = min(2.0, max(1.25, 1400 / pdf_page.rect.width))
                pixmap = pdf_page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
                output = io.BytesIO()
                image.save(output, format='WEBP', quality=82, method=4)
                image_bytes = output.getvalue()
        except (fitz.FileDataError, ValueError, OSError, NotImplementedError):
            raise Http404('Không thể đọc trang PDF.')
        cache.set(cache_key, image_bytes, timeout=600)
    response = HttpResponse(image_bytes, content_type='image/webp')
    response['Cache-Control'] = 'private, max-age=300'
    return response


def sync_active_session(classroom):
    session = classroom.sessions.filter(status=LiveSession.Status.LIVE).first()
    if not session:
        return

    participant_count = session.attendances.filter(left_at__isnull=True).count()
    if participant_count != session.participant_count:
        session.participant_count = participant_count
        session.last_synced_at = timezone.now()
        session.save(update_fields=['participant_count', 'last_synced_at', 'updated_at'])


class ClassroomListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=ClassroomSerializer(many=True))
    def get(self, request):
        classrooms = classroom_queryset(request.user)
        return Response(ClassroomSerializer(
            classrooms,
            many=True,
            context={'request': request},
        ).data)

    @extend_schema(request=ClassroomSerializer, responses={201: ClassroomSerializer})
    def post(self, request):
        serializer = ClassroomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            classroom = serializer.save(owner=request.user)
            ClassMembership.objects.create(
                classroom=classroom,
                user=request.user,
                role=ClassMembership.Role.OWNER,
            )
        classroom.member_count = 1
        return Response(serialize_classroom(classroom, request), status=status.HTTP_201_CREATED)


class ClassroomJoinView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=JoinClassroomSerializer, responses=ClassroomSerializer)
    def post(self, request):
        serializer = JoinClassroomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        classroom = get_object_or_404(
            Classroom.objects.select_related('owner').annotate(member_count=Count('memberships')),
            code=serializer.validated_data['code'],
            is_archived=False,
        )
        ClassMembership.objects.get_or_create(classroom=classroom, user=request.user)
        classroom.member_count = classroom.memberships.count()
        return Response(serialize_classroom(classroom, request))


class ClassroomDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=ClassroomSerializer)
    def get(self, request, code):
        classroom = get_member_classroom(request.user, code)
        sync_active_session(classroom)
        return Response(serialize_classroom(classroom, request))

    @extend_schema(request=ClassroomUpdateSerializer, responses=ClassroomSerializer)
    def patch(self, request, code):
        classroom = get_member_classroom(request.user, code)
        require_classroom_owner(classroom, request.user)
        serializer = ClassroomUpdateSerializer(classroom, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        classroom = serializer.save()
        classroom.member_count = classroom.memberships.count()
        return Response(serialize_classroom(classroom, request))


class SessionStartView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=StartSessionSerializer, responses={200: ClassroomSerializer, 201: ClassroomSerializer})
    def post(self, request, code):
        classroom = get_member_classroom(request.user, code)
        if classroom.owner_id != request.user.id:
            return Response({'detail': 'Chỉ chủ phòng được bắt đầu buổi học.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = StartSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        existing = classroom.sessions.filter(status=LiveSession.Status.LIVE).first()
        if existing:
            return Response(serialize_classroom(classroom, request))

        title = serializer.validated_data.get('title', '').strip() or classroom.name
        requested_resource_ids = serializer.validated_data.get('resource_ids')
        selected_resources = None
        if requested_resource_ids is not None:
            selected_resources = list(LessonResource.objects.filter(
                section__plan__classroom=classroom,
                kind__in=[*PRESENTABLE_RESOURCE_KINDS, LessonResource.Kind.QUIZ],
                pk__in=requested_resource_ids,
            ))
            if len(selected_resources) != len(requested_resource_ids):
                return Response(
                    {'resource_ids': ['Có nội dung không tồn tại hoặc không thuộc lớp học này.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        try:
            with transaction.atomic():
                Classroom.objects.select_for_update().get(pk=classroom.pk)
                if classroom.sessions.filter(status=LiveSession.Status.LIVE).exists():
                    return Response(serialize_classroom(classroom, request))
                session = LiveSession(
                    classroom=classroom,
                    title=title,
                    created_by=request.user,
                    uses_resource_selection=requested_resource_ids is not None,
                )
                session.room_name = f'synapse-{session.id.hex}'
                session.save()
                if selected_resources is not None:
                    session.selected_resources.set(selected_resources)
        except IntegrityError:
            return Response({'detail': 'Phòng đã có một buổi học đang diễn ra.'}, status=status.HTTP_409_CONFLICT)
        return Response(serialize_classroom(classroom, request), status=status.HTTP_201_CREATED)


class SessionJoinView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name='JoinLiveSessionResponse',
            fields={
                'mode': serializers.ChoiceField(choices=['livekit']),
            },
        ),
    )
    def post(self, request, code):
        classroom = get_member_classroom(request.user, code)
        session = get_object_or_404(classroom.sessions, status=LiveSession.Status.LIVE)
        attendance, created = SessionAttendance.objects.get_or_create(session=session, user=request.user)
        if not created:
            SessionAttendance.objects.filter(pk=attendance.pk).update(
                left_at=None,
                join_count=F('join_count') + 1,
                last_joined_at=timezone.now(),
            )
        sync_active_session(classroom)
        return Response({'mode': 'livekit'})


class SessionVideoTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        classroom = get_member_classroom(request.user, code)
        session = get_object_or_404(classroom.sessions, status=LiveSession.Status.LIVE)
        if not session.attendances.filter(user=request.user, left_at__isnull=True).exists():
            return Response({'detail': 'Bạn cần vào phiên học trước.'}, status=status.HTTP_403_FORBIDDEN)

        token = create_video_token(
            request.user,
            session.room_name,
            role='moderator' if classroom.owner_id == request.user.id else 'member',
        )
        return Response({'url': settings.LIVEKIT_WS_URL, 'token': token})


def close_expired_poll(poll):
    if poll and poll.status == LivePoll.Status.OPEN and poll.closes_at <= timezone.now():
        poll.status = LivePoll.Status.CLOSED
        poll.closed_at = poll.closes_at
        poll.save(update_fields=['status', 'closed_at', 'updated_at'])
    return poll


def serialize_live_poll(poll, request, classroom):
    responses = list(poll.responses.select_related('user').all())
    own_response = next((item for item in responses if item.user_id == request.user.id), None)
    option_counts = [0 for _ in poll.options]
    for response in responses:
        if response.selected_option < len(option_counts):
            option_counts[response.selected_option] += 1
    participant_count = poll.session.attendances.exclude(user_id=classroom.owner_id).count()
    is_moderator = classroom.owner_id == request.user.id
    show_results = is_moderator or poll.status != LivePoll.Status.OPEN
    payload = {
        'id': str(poll.id),
        'question': poll.question,
        'options': poll.options,
        'duration_seconds': poll.duration_seconds,
        'is_anonymous': poll.is_anonymous,
        'status': poll.status,
        'opened_at': poll.opened_at.isoformat(),
        'closes_at': poll.closes_at.isoformat(),
        'closed_at': poll.closed_at.isoformat() if poll.closed_at else None,
        'remaining_ms': max(0, round((poll.closes_at - timezone.now()).total_seconds() * 1000)),
        'response_count': len(responses),
        'participant_count': participant_count,
        'selected_option': own_response.selected_option if own_response else None,
        'option_counts': option_counts if show_results else None,
    }
    if is_moderator and not poll.is_anonymous:
        payload['responses'] = [
            {
                'user_id': str(response.user_id),
                'name': response.user.full_name or response.user.email,
                'selected_option': response.selected_option,
                'submitted_at': response.submitted_at.isoformat(),
            }
            for response in responses
        ]
    return payload


class SessionPollView(APIView):
    permission_classes = [IsAuthenticated]

    def _context(self, request, code):
        classroom = get_member_classroom(request.user, code)
        session = get_object_or_404(classroom.sessions, status=LiveSession.Status.LIVE)
        if not session.attendances.filter(user=request.user, left_at__isnull=True).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Bạn cần vào phiên học trước.')
        return classroom, session

    def get(self, request, code):
        classroom, session = self._context(request, code)
        poll = close_expired_poll(
            session.polls.exclude(status=LivePoll.Status.DISMISSED).first(),
        )
        return Response({'poll': serialize_live_poll(poll, request, classroom) if poll else None})

    def post(self, request, code):
        classroom, session = self._context(request, code)
        action = request.data.get('action')

        if action == 'start':
            require_classroom_owner(classroom, request.user)
            serializer = StartPollSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            open_poll = close_expired_poll(session.polls.filter(status=LivePoll.Status.OPEN).first())
            if open_poll and open_poll.status == LivePoll.Status.OPEN:
                return Response({'detail': 'Đang có một poll diễn ra.'}, status=status.HTTP_409_CONFLICT)
            session.polls.filter(status=LivePoll.Status.CLOSED).update(status=LivePoll.Status.DISMISSED)
            try:
                poll = LivePoll.objects.create(
                    session=session,
                    question=serializer.validated_data['question'],
                    options=serializer.validated_data['options'],
                    duration_seconds=serializer.validated_data['duration_seconds'],
                    is_anonymous=serializer.validated_data['is_anonymous'],
                    closes_at=timezone.now() + timedelta(seconds=serializer.validated_data['duration_seconds']),
                    created_by=request.user,
                )
            except IntegrityError:
                return Response({'detail': 'Đang có một poll diễn ra.'}, status=status.HTTP_409_CONFLICT)
            return Response({'poll': serialize_live_poll(poll, request, classroom)}, status=status.HTTP_201_CREATED)

        poll = get_object_or_404(session.polls, pk=request.data.get('poll_id'))
        close_expired_poll(poll)

        if action == 'answer':
            if classroom.owner_id == request.user.id:
                return Response({'detail': 'Giáo viên không tham gia trả lời poll.'}, status=status.HTTP_403_FORBIDDEN)
            if poll.status != LivePoll.Status.OPEN:
                return Response({'detail': 'Poll đã kết thúc.'}, status=status.HTTP_409_CONFLICT)
            serializer = PollAnswerSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            selected_option = serializer.validated_data['selected_option']
            if selected_option >= len(poll.options):
                return Response({'selected_option': 'Lựa chọn không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            _, created = LivePollResponse.objects.get_or_create(
                poll=poll,
                user=request.user,
                defaults={'selected_option': selected_option},
            )
            if not created:
                return Response({'detail': 'Bạn đã trả lời poll này.'}, status=status.HTTP_409_CONFLICT)
            return Response({'poll': serialize_live_poll(poll, request, classroom)})

        require_classroom_owner(classroom, request.user)
        if action == 'close':
            if poll.status == LivePoll.Status.OPEN:
                poll.status = LivePoll.Status.CLOSED
                poll.closed_at = timezone.now()
                poll.save(update_fields=['status', 'closed_at', 'updated_at'])
            return Response({'poll': serialize_live_poll(poll, request, classroom)})
        if action == 'dismiss':
            poll.status = LivePoll.Status.DISMISSED
            if not poll.closed_at:
                poll.closed_at = timezone.now()
            poll.save(update_fields=['status', 'closed_at', 'updated_at'])
            return Response({'poll': None})
        return Response({'action': 'Thao tác poll không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)


class SessionWhiteboardView(APIView):
    permission_classes = [IsAuthenticated]

    def _context(self, request, code):
        classroom = get_member_classroom(request.user, code)
        session = get_object_or_404(classroom.sessions, status=LiveSession.Status.LIVE)
        if not session.attendances.filter(user=request.user, left_at__isnull=True).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Bạn cần vào phiên học trước.')
        return classroom, session

    @staticmethod
    def _resolve_board_context(classroom, session, resource_id, page):
        if not resource_id:
            return None, 'session', 1
        resource = get_object_or_404(
            session_resource_queryset(classroom, session),
            pk=resource_id,
            kind__in=[LessonResource.Kind.SLIDE, LessonResource.Kind.PDF],
        )
        max_page = max(resource.preview_page_count, 1)
        if page > max_page:
            raise serializers.ValidationError({'page': f'Tài liệu chỉ có {max_page} trang.'})
        return resource, f'resource:{resource.id}:page:{page}', page

    @staticmethod
    def _response(snapshot, resource, context_key, page):
        return {
            'context_key': context_key,
            'resource_id': str(resource.id) if resource else None,
            'page': page,
            'strokes': snapshot.strokes if snapshot else [],
            'locked': snapshot.locked if snapshot else True,
            'updated_at': snapshot.updated_at.isoformat() if snapshot else None,
        }

    def get(self, request, code):
        classroom, session = self._context(request, code)
        page_serializer = WhiteboardSnapshotSerializer(data={
            'resource_id': request.query_params.get('resource_id') or None,
            'page': request.query_params.get('page', 1),
            'strokes': [],
            'locked': True,
        })
        page_serializer.is_valid(raise_exception=True)
        resource, context_key, page = self._resolve_board_context(
            classroom,
            session,
            page_serializer.validated_data.get('resource_id'),
            page_serializer.validated_data['page'],
        )
        snapshot = SessionWhiteboardSnapshot.objects.filter(session=session, context_key=context_key).first()
        return Response(self._response(snapshot, resource, context_key, page))

    def put(self, request, code):
        classroom, session = self._context(request, code)
        require_classroom_owner(classroom, request.user)
        serializer = WhiteboardSnapshotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resource, context_key, page = self._resolve_board_context(
            classroom,
            session,
            serializer.validated_data.get('resource_id'),
            serializer.validated_data['page'],
        )
        snapshot, _ = SessionWhiteboardSnapshot.objects.update_or_create(
            session=session,
            context_key=context_key,
            defaults={
                'resource': resource,
                'page': page,
                'strokes': serializer.validated_data['strokes'],
                'locked': serializer.validated_data['locked'],
                'updated_by': request.user,
            },
        )
        return Response(self._response(snapshot, resource, context_key, page))


class SessionPresentationView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @staticmethod
    def _key(session):
        return f'local-presentation:{session.id}'

    @staticmethod
    def _scroll_key(session, resource_id, page):
        return f'local-presentation-scroll:{session.id}:{resource_id}:{page}'

    def _state(self, session):
        presentation = cache.get(self._key(session)) or {'resource_id': None, 'page': 1, 'on_stage': False}
        # Keep presentations created before stage_resource_id was introduced visible.
        if 'stage_resource_id' not in presentation:
            presentation['stage_resource_id'] = presentation['resource_id'] if presentation.get('on_stage') else None
            presentation['stage_page'] = presentation['page']
        return presentation

    def _context(self, request, code):
        classroom = get_member_classroom(request.user, code)
        session = get_object_or_404(classroom.sessions, status=LiveSession.Status.LIVE)
        if not session.attendances.filter(user=request.user, left_at__isnull=True).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Bạn cần vào phiên học trước.')
        return classroom, session, classroom.owner_id == request.user.id

    def _start_scheduled_quiz(self, presentation, session, quiz):
        if session.quiz_runs.filter(status=LiveQuizRun.Status.OPEN).exists():
            return False
        _, created = LiveQuizRun.objects.get_or_create(
            session=session,
            quiz=quiz,
            defaults={
                'closes_at': timezone.now() + timedelta(seconds=quiz.duration_seconds),
                'started_by': None,
            },
        )
        if not created:
            return False
        presentation.update(resource_id=str(quiz.resource_id), page=1, quiz_started=True)
        return True

    def _apply_quiz_automation(self, classroom, session, presentation):
        if session.quiz_runs.filter(status=LiveQuizRun.Status.OPEN).exists():
            presentation.pop('pending_quiz', None)
            return

        now = timezone.now()
        elapsed_minutes = max(0, int((now - session.started_at).total_seconds() // 60))
        completed_quiz_ids = set(session.quiz_runs.values_list('quiz_id', flat=True))
        after_resource_due = presentation.get('after_resource_due', {})
        quizzes = LessonQuiz.objects.filter(
            resource__in=session_resource_queryset(classroom, session),
        ).exclude(
            trigger_mode=LessonQuiz.TriggerMode.MANUAL,
        ).select_related('resource', 'trigger_resource').order_by(
            'resource__section__position', 'resource__position', 'resource__created_at',
        )

        for quiz in quizzes:
            if quiz.pk in completed_quiz_ids:
                continue
            due = False
            if quiz.trigger_mode == LessonQuiz.TriggerMode.AT_MINUTE:
                due = elapsed_minutes >= quiz.trigger_minute
            elif quiz.trigger_mode == LessonQuiz.TriggerMode.AT_SLIDE:
                due = (
                    presentation.get('on_stage')
                    and presentation.get('stage_resource_id') == str(quiz.trigger_resource_id)
                    and presentation.get('stage_page', 1) >= quiz.trigger_slide_number
                )
            elif quiz.trigger_mode == LessonQuiz.TriggerMode.AFTER_RESOURCE:
                due_at = after_resource_due.get(str(quiz.pk))
                due = isinstance(due_at, (int, float)) and now.timestamp() >= due_at

            pending_quiz = presentation.get('pending_quiz')
            if pending_quiz and pending_quiz.get('quiz_pk') == str(quiz.pk):
                if not due:
                    presentation.pop('pending_quiz', None)
                    cache.set(self._key(session), presentation, timeout=60 * 60 * 8)
                    pending_quiz = None
                elif now.timestamp() < pending_quiz.get('starts_at_timestamp', 0):
                    return

            if due and quiz.trigger_mode == LessonQuiz.TriggerMode.AT_SLIDE and not pending_quiz:
                starts_at = now + timedelta(seconds=5)
                presentation['pending_quiz'] = {
                    'quiz_pk': str(quiz.pk),
                    'quiz_id': str(quiz.resource_id),
                    'title': quiz.resource.title,
                    'trigger_mode': quiz.trigger_mode,
                    'starts_at': starts_at.isoformat(),
                    'starts_at_timestamp': starts_at.timestamp(),
                }
                cache.set(self._key(session), presentation, timeout=60 * 60 * 8)
                return

            if due and self._start_scheduled_quiz(presentation, session, quiz):
                presentation.pop('pending_quiz', None)
                after_resource_due.pop(str(quiz.pk), None)
                presentation['last_automation'] = {
                    'quiz_id': str(quiz.resource_id),
                    'trigger_mode': quiz.trigger_mode,
                    'triggered_at': now.isoformat(),
                }
                cache.set(self._key(session), presentation, timeout=60 * 60 * 8)
                return

    def _response(self, request, classroom, session, is_moderator):
        close_expired_quiz_runs(session)
        presentation = self._state(session)
        self._apply_quiz_automation(classroom, session, presentation)
        resource = None
        if presentation['resource_id']:
            resource = session_resource_queryset(classroom, session).select_related('quiz', 'anatomy_model__system').filter(
                pk=presentation['resource_id'],
            ).first()
        staged_resource = None
        if presentation.get('on_stage') and presentation.get('stage_resource_id'):
            staged_resource = session_resource_queryset(classroom, session).select_related('anatomy_model__system').filter(
                pk=presentation['stage_resource_id'],
                kind__in=PRESENTABLE_RESOURCE_KINDS,
            ).first()
        run = None
        if resource and resource.kind == LessonResource.Kind.QUIZ:
            run = LiveQuizRun.objects.filter(session=session, quiz__resource=resource).select_related(
                'quiz__resource', 'session__classroom',
            ).prefetch_related('responses').first()
            if not presentation.get('quiz_started', run is not None):
                run = None
                if not is_moderator:
                    resource = None
        if not is_moderator and (not resource or resource.kind != LessonResource.Kind.QUIZ):
            resource = staged_resource
        selected = LessonResourceSerializer(resource, context={'request': request}).data if resource else None
        stage = LessonResourceSerializer(staged_resource, context={'request': request}).data if staged_resource else None
        if selected and not is_moderator and selected.get('quiz'):
            selected['quiz'].pop('correct_option', None)
        resources = []
        if is_moderator:
            resources = [
                {
                    'id': str(item.id),
                    'title': item.title,
                    'kind': item.kind,
                    'section_title': item.section.title,
                    'trigger_mode': item.quiz.trigger_mode if item.kind == LessonResource.Kind.QUIZ else None,
                    'trigger_minute': item.quiz.trigger_minute if item.kind == LessonResource.Kind.QUIZ else None,
                    'delay_seconds': item.quiz.delay_seconds if item.kind == LessonResource.Kind.QUIZ else None,
                    'trigger_resource_id': str(item.quiz.trigger_resource_id) if item.kind == LessonResource.Kind.QUIZ and item.quiz.trigger_resource_id else None,
                    'trigger_resource_title': item.quiz.trigger_resource.title if item.kind == LessonResource.Kind.QUIZ and item.quiz.trigger_resource else None,
                    'trigger_slide_number': item.quiz.trigger_slide_number if item.kind == LessonResource.Kind.QUIZ else None,
                }
                for item in session_resource_queryset(classroom, session)
                .filter(kind__in=[*PRESENTABLE_RESOURCE_KINDS, LessonResource.Kind.QUIZ])
                .select_related('section', 'quiz__trigger_resource').order_by('section__position', 'position', 'created_at')
                if item.kind == LessonResource.Kind.QUIZ or (
                    item.kind in {LessonResource.Kind.VIDEO, LessonResource.Kind.LINK} and item.external_url
                ) or (
                    item.kind == LessonResource.Kind.MODEL_3D and item.anatomy_model_id
                ) or (
                    item.file and (item.kind != LessonResource.Kind.DOC or item.file.name.lower().endswith('.docx'))
                )
            ]
        pending_quiz = presentation.get('pending_quiz')
        upcoming_quiz = {
            'quiz_id': pending_quiz['quiz_id'],
            'title': pending_quiz['title'],
            'trigger_mode': pending_quiz['trigger_mode'],
            'starts_at': pending_quiz['starts_at'],
            'remaining_ms': max(0, round(
                (pending_quiz['starts_at_timestamp'] - timezone.now().timestamp()) * 1000,
            )),
        } if pending_quiz else None
        return Response({
            'is_moderator': is_moderator,
            'resources': resources,
            'selected': selected,
            'page': presentation.get('stage_page', presentation['page']) if not is_moderator and resource == staged_resource else presentation['page'],
            'on_stage': bool(staged_resource),
            'stage': stage,
            'stage_page': presentation.get('stage_page', presentation['page']),
            'stage_scroll': cache.get(self._scroll_key(
                session, presentation.get('stage_resource_id'), presentation.get('stage_page', presentation['page']),
            ), presentation.get('stage_scroll', 0)) if staged_resource else 0,
            'stage_annotations': presentation.get('annotations', {}).get(
                f"{presentation.get('stage_resource_id')}:{presentation.get('stage_page', presentation['page'])}",
                [],
            ) if staged_resource and staged_resource.kind == LessonResource.Kind.PDF else [],
            'active_run': serialize_quiz_run(run, request.user, moderator=is_moderator) if run else None,
            'upcoming_quiz': upcoming_quiz,
            'last_automation': presentation.get('last_automation'),
        })

    def get(self, request, code):
        classroom, session, is_moderator = self._context(request, code)
        return self._response(request, classroom, session, is_moderator)

    def post(self, request, code):
        classroom, session, is_moderator = self._context(request, code)
        action = request.data.get('action')
        presentation = self._state(session)
        if action == 'answer':
            if is_moderator:
                return Response({'detail': 'Giáo viên không gửi đáp án.'}, status=status.HTTP_403_FORBIDDEN)
            if not presentation.get('quiz_started', True):
                return Response({'detail': 'Quiz chưa được trình chiếu.'}, status=status.HTTP_409_CONFLICT)
            run = get_object_or_404(
                LiveQuizRun.objects.select_related('quiz__resource'),
                pk=request.data.get('run_id'), session=session,
                quiz__resource_id=presentation['resource_id'],
            )
            if run.status != LiveQuizRun.Status.OPEN or run.closes_at <= timezone.now():
                return Response({'detail': 'Quiz đã đóng.'}, status=status.HTTP_409_CONFLICT)
            try:
                option = int(request.data.get('selected_option'))
            except (TypeError, ValueError):
                return Response({'detail': 'Đáp án không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            if option < 0 or option >= len(run.quiz.options):
                return Response({'detail': 'Đáp án không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            _, created = LiveQuizResponse.objects.get_or_create(
                run=run, user=request.user,
                defaults={'selected_option': option, 'is_correct': option == run.quiz.correct_option},
            )
            if not created:
                return Response({'detail': 'Bạn đã gửi đáp án.'}, status=status.HTTP_409_CONFLICT)
            return self._response(request, classroom, session, is_moderator)

        if not is_moderator:
            return Response({'detail': 'Chỉ giáo viên được điều khiển nội dung.'}, status=status.HTTP_403_FORBIDDEN)
        if action == 'import_link':
            external_url = request.data.get('external_url')
            if not isinstance(external_url, str) or len(external_url) > 600:
                return Response({'detail': 'Liên kết không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            external_url = external_url.strip()
            try:
                parsed_url = urlsplit(external_url)
                if parsed_url.scheme != 'https' or not parsed_url.hostname or parsed_url.username or parsed_url.password:
                    raise ValueError
            except ValueError:
                return Response({'detail': 'Hãy nhập liên kết HTTPS hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            title = request.data.get('title')
            if title is not None and not isinstance(title, str):
                return Response({'detail': 'Tên liên kết không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            title = title.strip() if title else ''
            youtube_hosts = {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'}
            is_youtube = parsed_url.hostname.lower() in youtube_hosts
            plan, _ = LessonPlan.objects.get_or_create(
                classroom=classroom,
                defaults={'title': classroom.name, 'subject': LessonPlan.Subject.ANATOMY},
            )
            section = plan.sections.order_by('position', 'created_at').first()
            if section is None:
                section = LessonSection.objects.create(plan=plan, title='Tài liệu buổi học')
            serializer = LessonResourceSerializer(data={
                'kind': LessonResource.Kind.VIDEO if is_youtube else LessonResource.Kind.LINK,
                'title': title or ('Video YouTube' if is_youtube else parsed_url.hostname),
                'external_url': external_url,
                'position': section.resources.count(),
            }, context={'request': request})
            serializer.is_valid(raise_exception=True)
            resource = serializer.save(section=section)
            if session.uses_resource_selection:
                session.selected_resources.add(resource)
            presentation.update(resource_id=str(resource.id), page=1, quiz_started=False)
        elif action == 'upload':
            uploaded_file = request.FILES.get('file')
            filename = uploaded_file.name.lower() if uploaded_file else ''
            if not uploaded_file or not filename.endswith(('.pdf', '.docx')):
                return Response({'detail': 'Hãy chọn tệp PDF hoặc DOCX.'}, status=status.HTTP_400_BAD_REQUEST)
            if uploaded_file.size > 250 * 1024 * 1024:
                return Response({'detail': 'Tệp vượt giới hạn 250 MB.'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
            plan, _ = LessonPlan.objects.get_or_create(
                classroom=classroom,
                defaults={'title': classroom.name, 'subject': LessonPlan.Subject.ANATOMY},
            )
            section = plan.sections.order_by('position', 'created_at').first()
            if section is None:
                section = LessonSection.objects.create(plan=plan, title='Tài liệu buổi học')
            serializer = LessonResourceSerializer(data={
                'kind': LessonResource.Kind.DOC if filename.endswith('.docx') else LessonResource.Kind.PDF,
                'title': uploaded_file.name,
                'file': uploaded_file,
                'position': section.resources.count(),
            }, context={'request': request})
            serializer.is_valid(raise_exception=True)
            resource = serializer.save(section=section)
            if session.uses_resource_selection:
                session.selected_resources.add(resource)
            if resource.kind == LessonResource.Kind.PDF and prepare_pdf_resource(resource) is None:
                return Response({'detail': 'Không đọc được tệp PDF.'}, status=status.HTTP_400_BAD_REQUEST)
            presentation.update(resource_id=str(resource.id), page=1, quiz_started=False)
        elif action == 'clear':
            presentation.update(resource_id=None, page=1, quiz_started=False)
        elif action in {'show', 'start_quiz'}:
            resource = get_object_or_404(
                session_resource_queryset(classroom, session).select_related('quiz'),
                pk=request.data.get('resource_id'),
            )
            # Selecting content only prepares it; the teacher starts the presentation separately.
            if action == 'start_quiz' and resource.kind != LessonResource.Kind.QUIZ:
                return Response({'detail': 'Nội dung này không phải quiz.'}, status=status.HTTP_400_BAD_REQUEST)
            if action == 'show' and resource.kind != LessonResource.Kind.QUIZ:
                is_file = resource.kind in {LessonResource.Kind.PDF, LessonResource.Kind.DOC, LessonResource.Kind.SLIDE} and resource.file
                is_link = resource.kind in {LessonResource.Kind.VIDEO, LessonResource.Kind.LINK} and resource.external_url
                is_model = resource.kind == LessonResource.Kind.MODEL_3D and resource.anatomy_model_id
                if not (is_file or is_link or is_model):
                    return Response({'detail': 'Nội dung này chưa có tệp, liên kết hoặc mô hình hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            presentation.update(resource_id=str(resource.id), page=1, quiz_started=action == 'start_quiz')
            if action == 'start_quiz':
                quiz = get_object_or_404(LessonQuiz, resource=resource)
                run, created = LiveQuizRun.objects.get_or_create(
                    session=session, quiz=quiz,
                    defaults={
                        'closes_at': timezone.now() + timedelta(seconds=quiz.duration_seconds),
                        'started_by': request.user,
                    },
                )
                if not created and run.status == LiveQuizRun.Status.CLOSED:
                    if run.responses.exists():
                        return Response(
                            {'detail': 'Quiz này đã có câu trả lời trong phiên học. Hãy mở phiên học mới để phát lại.'},
                            status=status.HTTP_409_CONFLICT,
                        )
                    now = timezone.now()
                    run.status = LiveQuizRun.Status.OPEN
                    run.opened_at = now
                    run.closes_at = now + timedelta(seconds=quiz.duration_seconds)
                    run.closed_at = None
                    run.started_by = request.user
                    run.save(update_fields=['status', 'opened_at', 'closes_at', 'closed_at', 'started_by'])
        elif action in {'present', 'stop_present'}:
            resource_id = presentation['resource_id'] if action == 'present' else presentation.get('stage_resource_id')
            resource = session_resource_queryset(classroom, session).filter(
                pk=resource_id,
                kind__in=PRESENTABLE_RESOURCE_KINDS,
            ).first() if resource_id else None
            if not resource or not (resource.file or resource.external_url or resource.anatomy_model_id):
                return Response({'detail': 'Hãy chọn tài liệu hoặc mô hình trước khi trình chiếu.'}, status=status.HTTP_400_BAD_REQUEST)
            presentation['on_stage'] = action == 'present'
            if action == 'present':
                presentation['stage_resource_id'] = str(resource.id)
                presentation['stage_page'] = presentation['page']
                cache.set(self._scroll_key(session, str(resource.id), presentation['page']), 0, timeout=60 * 60 * 8)
            else:
                now_timestamp = timezone.now().timestamp()
                due = presentation.setdefault('after_resource_due', {})
                for quiz in LessonQuiz.objects.filter(
                    resource__in=session_resource_queryset(classroom, session),
                    trigger_mode=LessonQuiz.TriggerMode.AFTER_RESOURCE,
                    trigger_resource_id=resource.id,
                ):
                    if not session.quiz_runs.filter(quiz=quiz).exists():
                        due[str(quiz.pk)] = now_timestamp + quiz.delay_seconds
        elif action in {'page', 'stage_page'}:
            resource_id = presentation.get('stage_resource_id') if action == 'stage_page' else presentation['resource_id']
            resource = session_resource_queryset(classroom, session).filter(
                pk=resource_id,
            ).first() if resource_id else None
            if not resource or resource.kind not in {
                LessonResource.Kind.PDF, LessonResource.Kind.SLIDE,
            }:
                return Response({'detail': 'Chưa chiếu PDF hoặc slide.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                page = int(request.data.get('page'))
            except (TypeError, ValueError):
                return Response({'detail': 'Trang không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            max_page = max(resource.preview_page_count, 1)
            if page < 1 or page > max_page:
                return Response({'detail': 'Trang không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            if action == 'stage_page':
                if not presentation.get('on_stage'):
                    return Response({'detail': 'Chưa có tài liệu đang chiếu.'}, status=status.HTTP_400_BAD_REQUEST)
                presentation['stage_page'] = page
                cache.set(self._scroll_key(session, resource_id, page), 0, timeout=60 * 60 * 8)
                if presentation['resource_id'] == resource_id:
                    presentation['page'] = page
            else:
                presentation['page'] = page
                if presentation.get('on_stage') and presentation.get('stage_resource_id') == resource_id:
                    presentation['stage_page'] = page
                    cache.set(self._scroll_key(session, resource_id, page), 0, timeout=60 * 60 * 8)
        elif action == 'scroll':
            if not presentation.get('on_stage') or (
                presentation.get('stage_resource_id') != str(request.data.get('resource_id'))
                or presentation.get('stage_page') != request.data.get('page')
            ):
                return Response({'detail': 'Tài liệu đang chiếu đã thay đổi.'}, status=status.HTTP_409_CONFLICT)
            try:
                position = float(request.data.get('position'))
            except (TypeError, ValueError):
                return Response({'detail': 'Vị trí cuộn không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            if not 0 <= position <= 1:
                return Response({'detail': 'Vị trí cuộn không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            cache.set(self._scroll_key(session, presentation['stage_resource_id'], presentation['stage_page']), round(position, 4), timeout=60 * 60 * 8)
            return self._response(request, classroom, session, is_moderator)
        elif action in {'annotation_add', 'annotation_remove', 'annotation_undo'}:
            resource_id = presentation.get('stage_resource_id')
            page = presentation.get('stage_page')
            if not presentation.get('on_stage') or not session_resource_queryset(classroom, session).filter(
                pk=resource_id, kind=LessonResource.Kind.PDF,
            ).exists():
                return Response({'detail': 'Chưa chiếu PDF để ghi chú.'}, status=status.HTTP_400_BAD_REQUEST)
            if request.data.get('resource_id') != resource_id or request.data.get('page') != page:
                return Response({'detail': 'Trang PDF đang chiếu đã thay đổi.'}, status=status.HTTP_409_CONFLICT)
            key = f'{resource_id}:{page}'
            annotations = presentation.setdefault('annotations', {})
            page_annotations = list(annotations.get(key, []))
            if action == 'annotation_add':
                if len(page_annotations) >= 200:
                    return Response({'detail': 'Trang này đã có quá nhiều ghi chú.'}, status=status.HTTP_400_BAD_REQUEST)
                kind = request.data.get('kind')
                if kind not in {'pen', 'highlighter', 'text'}:
                    return Response({'detail': 'Công cụ ghi chú không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
                raw_points = request.data.get('points')
                if not isinstance(raw_points, list) or not 1 <= len(raw_points) <= 500:
                    return Response({'detail': 'Nét vẽ không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
                points = []
                for point in raw_points:
                    if not isinstance(point, list) or len(point) != 2 or any(
                        not isinstance(value, (int, float)) or isinstance(value, bool) or not 0 <= value <= 1
                        for value in point
                    ):
                        return Response({'detail': 'Tọa độ ghi chú không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
                    points.append([round(value, 4) for value in point])
                raw_text = request.data.get('text', '')
                if not isinstance(raw_text, str):
                    return Response({'detail': 'Nội dung ghi chú không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
                text = raw_text.strip()
                if kind == 'text' and (len(points) != 1 or not 1 <= len(text) <= 300):
                    return Response({'detail': 'Nội dung ghi chú không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
                if kind != 'text' and len(points) < 2:
                    return Response({'detail': 'Nét vẽ quá ngắn.'}, status=status.HTTP_400_BAD_REQUEST)
                page_annotations.append({
                    'id': str(uuid4()), 'kind': kind, 'points': points,
                    'text': text if kind == 'text' else '',
                })
            elif action == 'annotation_remove':
                page_annotations = [item for item in page_annotations if item['id'] != request.data.get('annotation_id')]
            elif page_annotations:
                page_annotations.pop()
            annotations[key] = page_annotations
        elif action == 'close_quiz':
            if not presentation['resource_id']:
                return Response({'detail': 'Chưa có quiz đang chiếu.'}, status=status.HTTP_400_BAD_REQUEST)
            LiveQuizRun.objects.filter(
                session=session, quiz__resource_id=presentation['resource_id'],
                status=LiveQuizRun.Status.OPEN,
            ).update(status=LiveQuizRun.Status.CLOSED, closed_at=timezone.now())
        else:
            return Response({'detail': 'Thao tác không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
        cache.set(self._key(session), presentation, timeout=60 * 60 * 8)
        return self._response(request, classroom, session, is_moderator)


class SessionPresentationPdfPageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, code, resource_id, page):
        classroom = get_member_classroom(request.user, code)
        session = get_object_or_404(classroom.sessions, status=LiveSession.Status.LIVE)
        if not session.attendances.filter(user=request.user, left_at__isnull=True).exists():
            return Response({'detail': 'Bạn cần vào phiên học trước.'}, status=status.HTTP_403_FORBIDDEN)
        presentation = cache.get(SessionPresentationView._key(session), {})
        is_staged = presentation.get('on_stage') and presentation.get(
            'stage_resource_id', presentation.get('resource_id')
        ) == str(resource_id)
        is_selected_by_owner = classroom.owner_id == request.user.id and presentation.get('resource_id') == str(resource_id)
        if not is_staged and not is_selected_by_owner:
            raise Http404('Tài liệu chưa được chiếu.')
        resource = get_object_or_404(
            session_resource_queryset(classroom, session), pk=resource_id, kind=LessonResource.Kind.PDF,
        )
        if not resource.file:
            raise Http404('Tài liệu chưa có tệp PDF.')
        return render_pdf_resource_page(resource, page)


class SessionQuizReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        classroom = get_member_classroom(request.user, code)
        require_classroom_owner(classroom, request.user)
        now = timezone.now()
        LiveQuizRun.objects.filter(
            session__classroom=classroom,
            status=LiveQuizRun.Status.OPEN,
            closes_at__lte=now,
        ).update(status=LiveQuizRun.Status.CLOSED, closed_at=now)

        sessions = list(
            classroom.sessions.prefetch_related(
                Prefetch(
                    'quiz_runs',
                    queryset=LiveQuizRun.objects.select_related(
                        'quiz__resource', 'session__classroom',
                    ).prefetch_related('responses__user'),
                ),
                'attendances',
            ).order_by('-started_at')
        )
        session_rows = []
        total_responses = 0
        total_correct = 0
        total_runs = 0
        for session in sessions:
            runs = [serialize_quiz_report_run(run) for run in session.quiz_runs.all()]
            response_count = sum(run['response_count'] for run in runs)
            correct_count = sum(run['correct_count'] for run in runs)
            total_runs += len(runs)
            total_responses += response_count
            total_correct += correct_count
            session_rows.append({
                'id': str(session.id),
                'title': session.title,
                'status': session.status,
                'started_at': session.started_at.isoformat(),
                'ended_at': session.ended_at.isoformat() if session.ended_at else None,
                'participant_count': session.attendances.exclude(
                    user_id=classroom.owner_id,
                ).count(),
                'quiz_count': len(runs),
                'response_count': response_count,
                'correct_count': correct_count,
                'accuracy_percent': round(correct_count * 100 / response_count) if response_count else 0,
                'runs': runs,
            })
        return Response({
            'summary': {
                'session_count': len(sessions),
                'quiz_run_count': total_runs,
                'response_count': total_responses,
                'correct_count': total_correct,
                'accuracy_percent': round(total_correct * 100 / total_responses) if total_responses else 0,
            },
            'sessions': session_rows,
        })


class LessonResourcePdfPageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, code, resource_id, page):
        classroom = get_member_classroom(request.user, code)
        require_classroom_owner(classroom, request.user)
        resource = get_object_or_404(
            LessonResource, pk=resource_id, kind=LessonResource.Kind.PDF,
            section__plan__classroom=classroom,
        )
        if not resource.file:
            raise Http404('Tài liệu chưa có tệp PDF.')
        return render_pdf_resource_page(resource, page)


class SessionLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request, code):
        classroom = get_member_classroom(request.user, code)
        session = classroom.sessions.filter(status=LiveSession.Status.LIVE).first()
        if not session:
            return Response(status=status.HTTP_204_NO_CONTENT)
        session.attendances.filter(user=request.user, left_at__isnull=True).update(left_at=timezone.now())
        sync_active_session(classroom)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SessionEndView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request, code):
        classroom = get_member_classroom(request.user, code)
        if classroom.owner_id != request.user.id:
            return Response({'detail': 'Chỉ chủ phòng được kết thúc buổi học.'}, status=status.HTTP_403_FORBIDDEN)
        session = get_object_or_404(classroom.sessions, status=LiveSession.Status.LIVE)
        try:
            delete_room(session.room_name)
        except requests.RequestException:
            return Response({'detail': 'Không thể đóng phòng LiveKit. Hãy thử lại.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        finish_session(session)
        return Response(status=status.HTTP_204_NO_CONTENT)


class LessonPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        classroom = get_member_classroom(request.user, code)
        plan = get_object_or_404(lesson_plan_queryset(), classroom=classroom)
        return Response(LessonPlanSerializer(plan, context={'request': request}).data)

    @transaction.atomic
    def post(self, request, code):
        classroom = get_member_classroom(request.user, code)
        require_classroom_owner(classroom, request.user)
        if hasattr(classroom, 'lesson_plan'):
            return Response(
                LessonPlanSerializer(classroom.lesson_plan, context={'request': request}).data,
                status=status.HTTP_200_OK,
            )
        serializer = LessonPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.save(classroom=classroom)
        LessonSection.objects.create(
            plan=plan,
            title='Tổng quan Giải phẫu',
            objective='Giới thiệu nội dung và mục tiêu của buổi học.',
            duration_minutes=10,
            position=0,
        )
        plan = lesson_plan_queryset().get(pk=plan.pk)
        return Response(LessonPlanSerializer(plan, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def patch(self, request, code):
        classroom = get_member_classroom(request.user, code)
        require_classroom_owner(classroom, request.user)
        plan = get_object_or_404(LessonPlan, classroom=classroom)
        serializer = LessonPlanSerializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, code):
        classroom = get_member_classroom(request.user, code)
        require_classroom_owner(classroom, request.user)
        plan = get_object_or_404(LessonPlan, classroom=classroom)
        for resource in LessonResource.objects.filter(section__plan=plan):
            cleanup_lesson_resource_files(resource)
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LessonSectionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        classroom = get_member_classroom(request.user, code)
        plan = get_object_or_404(LessonPlan, classroom=classroom)
        sections = plan.sections.prefetch_related('resources__quiz', 'resources__anatomy_model').all()
        return Response(LessonSectionSerializer(sections, many=True, context={'request': request}).data)

    def post(self, request, code):
        classroom = get_member_classroom(request.user, code)
        require_classroom_owner(classroom, request.user)
        plan = get_object_or_404(LessonPlan, classroom=classroom)
        serializer = LessonSectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        position = request.data.get('position')
        if position is None:
            current_max = plan.sections.aggregate(value=Max('position'))['value']
            position = (current_max if current_max is not None else -1) + 1
        serializer.save(plan=plan, position=position)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LessonSectionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, request, code, section_id):
        classroom = get_member_classroom(request.user, code)
        return classroom, get_object_or_404(LessonSection, pk=section_id, plan__classroom=classroom)

    def get(self, request, code, section_id):
        _, section = self._get(request, code, section_id)
        return Response(LessonSectionSerializer(section, context={'request': request}).data)

    def patch(self, request, code, section_id):
        classroom, section = self._get(request, code, section_id)
        require_classroom_owner(classroom, request.user)
        serializer = LessonSectionSerializer(section, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, code, section_id):
        classroom, section = self._get(request, code, section_id)
        require_classroom_owner(classroom, request.user)
        for resource in section.resources.all():
            cleanup_lesson_resource_files(resource)
        section.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LessonResourceListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, code, section_id):
        classroom = get_member_classroom(request.user, code)
        section = get_object_or_404(LessonSection, pk=section_id, plan__classroom=classroom)
        resources = section.resources.select_related('anatomy_model__system', 'quiz').all()
        return Response(LessonResourceSerializer(resources, many=True, context={'request': request}).data)

    def post(self, request, code, section_id):
        classroom = get_member_classroom(request.user, code)
        require_classroom_owner(classroom, request.user)
        uploaded_file = request.FILES.get('file')
        if uploaded_file and uploaded_file.size > 250 * 1024 * 1024:
            return Response({'detail': 'Tệp vượt giới hạn 250 MB.'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        section = get_object_or_404(LessonSection, pk=section_id, plan__classroom=classroom)
        serializer = LessonResourceSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        position = request.data.get('position')
        if position is None:
            current_max = section.resources.aggregate(value=Max('position'))['value']
            position = (current_max if current_max is not None else -1) + 1
        resource = serializer.save(section=section, position=position)
        if resource.kind == LessonResource.Kind.PDF and resource.file and prepare_pdf_resource(resource) is None:
            return Response({'detail': 'Không đọc được tệp PDF.'}, status=status.HTTP_400_BAD_REQUEST)
        if resource.kind == LessonResource.Kind.SLIDE and resource.file:
            render_lesson_resource_preview(resource)
        response_serializer = LessonResourceSerializer(resource, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class LessonResourceDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, request, code, resource_id):
        classroom = get_member_classroom(request.user, code)
        resource = get_object_or_404(
            LessonResource.objects.select_related('section__plan', 'anatomy_model__system', 'quiz'),
            pk=resource_id,
            section__plan__classroom=classroom,
        )
        return classroom, resource

    def get(self, request, code, resource_id):
        _, resource = self._get(request, code, resource_id)
        return Response(LessonResourceSerializer(resource, context={'request': request}).data)

    def patch(self, request, code, resource_id):
        classroom, resource = self._get(request, code, resource_id)
        require_classroom_owner(classroom, request.user)
        previous_file_name = resource.file.name if resource.file else ''
        previous_kind = resource.kind
        serializer = LessonResourceSerializer(
            resource, data=request.data, partial=True, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        resource = serializer.save()
        file_changed = 'file' in request.data
        kind_changed = resource.kind != previous_kind
        if file_changed and previous_file_name and previous_file_name != resource.file.name:
            resource.file.storage.delete(previous_file_name)
        if file_changed or kind_changed:
            render_lesson_resource_preview(resource)
        return Response(LessonResourceSerializer(resource, context={'request': request}).data)

    def delete(self, request, code, resource_id):
        classroom, resource = self._get(request, code, resource_id)
        require_classroom_owner(classroom, request.user)
        cleanup_lesson_resource_files(resource)
        resource.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

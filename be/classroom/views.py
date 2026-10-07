import io
from datetime import timedelta
from pathlib import Path

import pymupdf as fitz
from PIL import Image
from django.conf import settings
from django.core import signing
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, F, Max, OuterRef, Prefetch, Q
from django.http import FileResponse, Http404, HttpResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.utils.text import slugify
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
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
    LiveQuizResponse,
    LiveQuizRun,
    LiveSession,
    SessionAttendance,
)
from .document_rendering import (
    cleanup_lesson_resource_files,
    render_lesson_resource_preview,
)
from .bbb_documents import (
    build_bbb_pdf_reader_url,
    build_bbb_presentation_documents,
    resolve_bbb_resource_download,
)
from .serializers import (
    ClassroomSerializer,
    JoinClassroomSerializer,
    LessonPlanSerializer,
    LessonResourceSerializer,
    LessonSectionSerializer,
    StartSessionSerializer,
)
from .services import BigBlueButtonError, BigBlueButtonService
from .quiz_runtime import (
    build_bbb_quiz_runtime_url,
    close_expired_quiz_runs,
    resolve_bbb_quiz_participant,
    serialize_quiz_run,
)


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


def serialize_classroom(classroom, request):
    return ClassroomSerializer(
        classroom,
        context={'request': request, 'bbb_enabled': settings.BBB_ENABLED},
    ).data


def finish_session(session):
    now = timezone.now()
    session.status = LiveSession.Status.ENDED
    session.ended_at = now
    session.participant_count = 0
    session.last_synced_at = now
    session.save(update_fields=['status', 'ended_at', 'participant_count', 'last_synced_at', 'updated_at'])
    session.attendances.filter(left_at__isnull=True).update(left_at=now)


def sync_active_session(classroom):
    session = classroom.sessions.filter(status=LiveSession.Status.LIVE).first()
    if not session:
        return

    bbb = BigBlueButtonService()
    if not bbb.enabled:
        participant_count = session.attendances.filter(left_at__isnull=True).count()
        if participant_count != session.participant_count:
            session.participant_count = participant_count
            session.last_synced_at = timezone.now()
            session.save(update_fields=['participant_count', 'last_synced_at', 'updated_at'])
        return

    try:
        meeting = bbb.meeting_status(meeting_id=session.bbb_meeting_id)
    except BigBlueButtonError:
        return
    if not meeting['running']:
        # BBB reports a newly created, still-empty meeting as not running. Keep a
        # short join window so polling cannot close the room before the host enters.
        if session.started_at <= timezone.now() - timedelta(minutes=3):
            finish_session(session)
        return
    session.participant_count = meeting['participant_count']
    session.last_synced_at = timezone.now()
    session.save(update_fields=['participant_count', 'last_synced_at', 'updated_at'])


class BigBlueButtonStatusView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=inline_serializer(
            name='BigBlueButtonStatus',
            fields={
                'mode': serializers.ChoiceField(choices=['mock', 'live']),
                'enabled': serializers.BooleanField(),
                'configured': serializers.BooleanField(),
                'reachable': serializers.BooleanField(),
                'detail': serializers.CharField(allow_blank=True),
            },
        ),
    )
    def get(self, _request):
        bbb = BigBlueButtonService()
        detail = ''
        reachable = not bbb.enabled
        if bbb.enabled:
            if not bbb.configured:
                detail = 'BigBlueButton chưa được cấu hình đầy đủ.'
            else:
                try:
                    reachable = bbb.check_connection()
                except BigBlueButtonError as exc:
                    detail = str(exc)
        return Response({
            'mode': bbb.mode,
            'enabled': bbb.enabled,
            'configured': bbb.configured,
            'reachable': reachable,
            'detail': detail,
        })


class ClassroomListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=ClassroomSerializer(many=True))
    def get(self, request):
        classrooms = classroom_queryset(request.user)
        return Response(ClassroomSerializer(
            classrooms,
            many=True,
            context={'request': request, 'bbb_enabled': settings.BBB_ENABLED},
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
        bbb = BigBlueButtonService()
        try:
            with transaction.atomic():
                Classroom.objects.select_for_update().get(pk=classroom.pk)
                if classroom.sessions.filter(status=LiveSession.Status.LIVE).exists():
                    return Response(serialize_classroom(classroom, request))
                session = LiveSession(
                    classroom=classroom,
                    title=title,
                    record=serializer.validated_data['record'],
                    created_by=request.user,
                )
                session.bbb_meeting_id = f'synapse-{session.id.hex}'
                session.save()
            presentations = build_bbb_presentation_documents(classroom) if bbb.enabled else []
            bbb.create_meeting(
                meeting_id=session.bbb_meeting_id,
                name=title,
                record=session.record,
                presentations=presentations,
            )
        except (BigBlueButtonError, IntegrityError) as exc:
            if 'session' in locals() and session.pk:
                session.delete()
            detail = str(exc) if isinstance(exc, BigBlueButtonError) else 'Phòng đã có một buổi học đang diễn ra.'
            return Response({'detail': detail}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(serialize_classroom(classroom, request), status=status.HTTP_201_CREATED)


@method_decorator(xframe_options_exempt, name='dispatch')
class LessonResourceBbbDownloadView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, resource_id):
        token = request.query_params.get('token', '')
        try:
            resource, file_field = resolve_bbb_resource_download(resource_id, token)
            file_field.open('rb')
            source_bytes = file_field.read()
            with fitz.open(stream=source_bytes, filetype='pdf') as document:
                for page_index, page in enumerate(document):
                    page.insert_text(
                        (8, 8),
                        f'SYNAPSE_RESOURCE:{resource.id};SYNAPSE_PAGE:{page_index + 1}',
                        fontsize=1,
                        render_mode=3,
                    )
                presentation_bytes = document.tobytes(garbage=3, deflate=True)
        except (LessonResource.DoesNotExist, signing.BadSignature, signing.SignatureExpired, ValueError, OSError):
            raise Http404('Liên kết tài liệu không hợp lệ hoặc đã hết hạn.')
        finally:
            if 'file_field' in locals():
                file_field.close()
        filename = f'{slugify(Path(resource.title).stem) or "lesson"}.pdf'
        return FileResponse(
            io.BytesIO(presentation_bytes),
            as_attachment=request.query_params.get('inline') != '1',
            filename=filename,
            content_type='application/pdf',
        )


@method_decorator(xframe_options_exempt, name='dispatch')
class LessonResourceBbbReaderView(APIView):
    """Serve a controllable PDF reader whose scroll can be synchronized by BBB."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, resource_id):
        token = request.query_params.get('token', '')
        try:
            resource, file_field = resolve_bbb_resource_download(resource_id, token)
            file_field.open('rb')
            pdf_bytes = file_field.read()
        except (LessonResource.DoesNotExist, signing.BadSignature, signing.SignatureExpired, ValueError, OSError):
            raise Http404('Liên kết tài liệu không hợp lệ hoặc đã hết hạn.')
        finally:
            if 'file_field' in locals():
                file_field.close()

        try:
            with fitz.open(stream=pdf_bytes, filetype='pdf') as document:
                page_number = request.query_params.get('page')
                if page_number is None:
                    return render(request, 'classroom/bbb_pdf_reader.html', {
                        'title': resource.title,
                        'page_count': document.page_count,
                        'page_numbers': range(1, document.page_count + 1),
                        'page_url': request.build_absolute_uri(),
                    })

                page_index = int(page_number) - 1
                if page_index < 0 or page_index >= document.page_count:
                    raise Http404('Trang PDF không tồn tại.')
                page = document.load_page(page_index)
                scale = min(2.2, max(1.35, 1600 / page.rect.width))
                pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
                output = io.BytesIO()
                image.save(output, format='WEBP', quality=86, method=4)
        except (fitz.FileDataError, ValueError):
            raise Http404('Không thể đọc tài liệu PDF.')

        response = HttpResponse(output.getvalue(), content_type='image/webp')
        response['Cache-Control'] = 'private, max-age=3600'
        return response


class SessionJoinView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name='JoinLiveSessionResponse',
            fields={
                'mode': serializers.ChoiceField(choices=['mock', 'live']),
                'join_url': serializers.URLField(allow_null=True),
            },
        ),
    )
    def post(self, request, code):
        classroom = get_member_classroom(request.user, code)
        session = get_object_or_404(classroom.sessions, status=LiveSession.Status.LIVE)
        full_name = request.user.full_name or request.user.email
        try:
            pdf_reader_url = build_bbb_pdf_reader_url(classroom)
            is_moderator = classroom.owner_id == request.user.id
            quiz_runtime_url = build_bbb_quiz_runtime_url(
                session,
                request.user,
                moderator=is_moderator,
            )
            join_url = BigBlueButtonService().join_url(
                meeting_id=session.bbb_meeting_id,
                full_name=full_name,
                user_id=str(request.user.id),
                moderator=is_moderator,
                logout_url=f'{settings.SYNAPSE_LAB_URL}/spaces/{classroom.code}',
                user_data={
                    'genericLinkShare_initialUrl': pdf_reader_url,
                    'synapseQuiz_runtimeUrl': quiz_runtime_url,
                },
            )
        except BigBlueButtonError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        attendance, created = SessionAttendance.objects.get_or_create(session=session, user=request.user)
        if not created:
            SessionAttendance.objects.filter(pk=attendance.pk).update(
                left_at=None,
                join_count=F('join_count') + 1,
                last_joined_at=timezone.now(),
            )
        if not settings.BBB_ENABLED:
            session.participant_count = session.attendances.filter(left_at__isnull=True).count()
            session.last_synced_at = timezone.now()
            session.save(update_fields=['participant_count', 'last_synced_at', 'updated_at'])
        return Response({'mode': 'live' if settings.BBB_ENABLED else 'mock', 'join_url': join_url})


class BbbQuizRuntimeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def _context(self, request):
        token = request.query_params.get('token', '')
        try:
            return resolve_bbb_quiz_participant(token)
        except (
            KeyError,
            ObjectDoesNotExist,
            signing.BadSignature,
            signing.SignatureExpired,
        ):
            raise Http404('Phiên quiz không hợp lệ hoặc đã hết hạn.')

    def get(self, request):
        session, user, is_moderator = self._context(request)
        close_expired_quiz_runs(session)
        quizzes = LessonQuiz.objects.filter(
            resource__section__plan__classroom=session.classroom,
            trigger_mode=LessonQuiz.TriggerMode.AT_SLIDE,
            trigger_resource__isnull=False,
        ).select_related('resource', 'trigger_resource')
        schedule = [{
            'id': str(quiz.pk),
            'resource_id': str(quiz.resource_id),
            'title': quiz.resource.title,
            'trigger_resource_id': str(quiz.trigger_resource_id),
            'trigger_slide_number': quiz.trigger_slide_number,
        } for quiz in quizzes]

        run_id = request.query_params.get('run_id')
        runs = LiveQuizRun.objects.filter(session=session).select_related(
            'quiz__resource', 'session__classroom',
        ).prefetch_related('responses')
        run = runs.filter(pk=run_id).first() if run_id else runs.filter(
            status=LiveQuizRun.Status.OPEN,
        ).first()
        return Response({
            'is_moderator': is_moderator,
            'schedule': schedule,
            'active_run': serialize_quiz_run(run, user, moderator=is_moderator) if run else None,
        })

    def post(self, request):
        session, user, is_moderator = self._context(request)
        close_expired_quiz_runs(session)
        action = request.data.get('action')
        if action == 'start':
            if not is_moderator:
                return Response({'detail': 'Chỉ giáo viên được mở quiz.'}, status=status.HTTP_403_FORBIDDEN)
            quiz = get_object_or_404(
                LessonQuiz.objects.select_related('resource'),
                pk=request.data.get('quiz_id'),
                resource__section__plan__classroom=session.classroom,
            )
            with transaction.atomic():
                run, _ = LiveQuizRun.objects.get_or_create(
                    session=session,
                    quiz=quiz,
                    defaults={
                        'closes_at': timezone.now() + timedelta(seconds=quiz.duration_seconds),
                        'started_by': user,
                    },
                )
            return Response(serialize_quiz_run(run, user, moderator=True))

        run = get_object_or_404(
            LiveQuizRun.objects.select_related('quiz__resource', 'session__classroom'),
            pk=request.data.get('run_id'),
            session=session,
        )
        if action == 'answer':
            if is_moderator:
                return Response({'detail': 'Giáo viên không gửi đáp án trong màn hình điều phối.'}, status=status.HTTP_403_FORBIDDEN)
            if run.status != LiveQuizRun.Status.OPEN or run.closes_at <= timezone.now():
                return Response({'detail': 'Quiz đã đóng.'}, status=status.HTTP_409_CONFLICT)
            try:
                selected_option = int(request.data.get('selected_option'))
            except (TypeError, ValueError):
                return Response({'detail': 'Đáp án không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            if selected_option < 0 or selected_option >= len(run.quiz.options):
                return Response({'detail': 'Đáp án không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            response, created = LiveQuizResponse.objects.get_or_create(
                run=run,
                user=user,
                defaults={
                    'selected_option': selected_option,
                    'is_correct': selected_option == run.quiz.correct_option,
                },
            )
            if not created:
                return Response({'detail': 'Bạn đã gửi đáp án cho quiz này.'}, status=status.HTTP_409_CONFLICT)
            return Response(serialize_quiz_run(run, user, moderator=False))

        if action == 'close':
            if not is_moderator:
                return Response({'detail': 'Chỉ giáo viên được đóng quiz.'}, status=status.HTTP_403_FORBIDDEN)
            if run.status == LiveQuizRun.Status.OPEN:
                run.status = LiveQuizRun.Status.CLOSED
                run.closed_at = timezone.now()
                run.save(update_fields=['status', 'closed_at'])
            return Response(serialize_quiz_run(run, user, moderator=True))

        return Response({'detail': 'Thao tác quiz không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)


class SessionLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request, code):
        classroom = get_member_classroom(request.user, code)
        session = classroom.sessions.filter(status=LiveSession.Status.LIVE).first()
        if not session:
            return Response(status=status.HTTP_204_NO_CONTENT)
        session.attendances.filter(user=request.user, left_at__isnull=True).update(left_at=timezone.now())
        if not settings.BBB_ENABLED:
            session.participant_count = session.attendances.filter(left_at__isnull=True).count()
            session.last_synced_at = timezone.now()
            session.save(update_fields=['participant_count', 'last_synced_at', 'updated_at'])
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
            BigBlueButtonService().end_meeting(meeting_id=session.bbb_meeting_id)
        except BigBlueButtonError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
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
        section = get_object_or_404(LessonSection, pk=section_id, plan__classroom=classroom)
        serializer = LessonResourceSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        position = request.data.get('position')
        if position is None:
            current_max = section.resources.aggregate(value=Max('position'))['value']
            position = (current_max if current_max is not None else -1) + 1
        resource = serializer.save(section=section, position=position)
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

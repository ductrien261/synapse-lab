from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, F, Max, OuterRef, Prefetch, Q
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
    LessonResource,
    LessonSection,
    LiveSession,
    SessionAttendance,
)
from .document_rendering import (
    cleanup_lesson_resource_files,
    render_lesson_resource_preview,
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
            bbb.create_meeting(meeting_id=session.bbb_meeting_id, name=title, record=session.record)
        except (BigBlueButtonError, IntegrityError) as exc:
            if 'session' in locals() and session.pk:
                session.delete()
            detail = str(exc) if isinstance(exc, BigBlueButtonError) else 'Phòng đã có một buổi học đang diễn ra.'
            return Response({'detail': detail}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(serialize_classroom(classroom, request), status=status.HTTP_201_CREATED)


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
            join_url = BigBlueButtonService().join_url(
                meeting_id=session.bbb_meeting_id,
                full_name=full_name,
                user_id=str(request.user.id),
                moderator=classroom.owner_id == request.user.id,
                logout_url=f'{settings.SYNAPSE_LAB_URL}/spaces/{classroom.code}',
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

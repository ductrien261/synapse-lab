from datetime import timedelta

from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LearningActivity, StudyDay, StudyNote
from .serializers import LearningActivitySerializer, StudyNoteSerializer

WEEKDAY_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']


class ActivityView(APIView):
    """
    GET  /api/learning/activities/?track=cs&limit=20   lịch sử học, mới nhất trước
    POST /api/learning/activities/                      ghi nhận vừa mở một bài học
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = LearningActivity.objects.filter(user=request.user)
        track = request.query_params.get('track')
        if track:
            qs = qs.filter(track=track)
        try:
            limit = min(int(request.query_params.get('limit', 50)), 200)
        except ValueError:
            limit = 50
        return Response(LearningActivitySerializer(qs[:limit], many=True).data)

    def post(self, request):
        serializer = LearningActivitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        activity, created = LearningActivity.objects.get_or_create(
            user=request.user,
            kind=data['kind'],
            object_key=data['object_key'],
            defaults=data,
        )
        if not created:
            for field in ('href', 'title', 'subtitle', 'group', 'track'):
                if field in data:
                    setattr(activity, field, data[field])
            activity.visit_count = F('visit_count') + 1
            activity.save()
            activity.refresh_from_db()

        StudyDay.objects.get_or_create(user=request.user, date=timezone.localdate())
        return Response(
            LearningActivitySerializer(activity).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class SummaryView(APIView):
    """GET /api/learning/summary/?track=cs — chuỗi ngày học, 7 ngày gần nhất, mục tiêu tuần, số bài đã khám phá."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()
        days = set(
            StudyDay.objects.filter(user=user, date__gte=today - timedelta(days=366)).values_list('date', flat=True)
        )

        learned_today = today in days
        streak = 0
        cursor = today if learned_today else today - timedelta(days=1)
        while cursor in days:
            streak += 1
            cursor -= timedelta(days=1)

        last7 = []
        for offset in range(6, -1, -1):
            day = today - timedelta(days=offset)
            last7.append({
                'date': day.isoformat(),
                'label': WEEKDAY_VI[day.weekday()],
                'active': day in days,
                'is_today': day == today,
            })

        monday = today - timedelta(days=today.weekday())
        days_this_week = sum(1 for d in days if monday <= d <= today)

        activities = LearningActivity.objects.filter(user=user)
        track = request.query_params.get('track')
        if track:
            activities = activities.filter(track=track)

        return Response({
            'streak': streak,
            'learned_today': learned_today,
            'last7': last7,
            'days_this_week': days_this_week,
            'weekly_goal': user.weekly_goal,
            'explored_count': activities.count(),
        })


class NoteView(APIView):
    """
    GET /api/learning/notes/?kind=anatomy_model&object_key=<mã>   ghi chú của mình cho bài đó
    PUT /api/learning/notes/  {kind, object_key, part_index, content}
        -> tạo/cập nhật; content rỗng = xóa ghi chú
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = StudyNote.objects.filter(
            user=request.user,
            kind=request.query_params.get('kind', ''),
            object_key=request.query_params.get('object_key', ''),
        )
        return Response(StudyNoteSerializer(qs, many=True).data)

    def put(self, request):
        serializer = StudyNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        lookup = {
            'user': request.user,
            'kind': data['kind'],
            'object_key': data['object_key'],
            'part_index': data.get('part_index', StudyNote.WHOLE),
        }
        content = data.get('content', '').strip()
        if not content:
            StudyNote.objects.filter(**lookup).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        note, _ = StudyNote.objects.update_or_create(**lookup, defaults={'content': content})
        return Response(StudyNoteSerializer(note).data)

"""
POST  /api/feedback/                       gửi góp ý (ai cũng gửi được, có giới hạn tần suất)
GET   /api/feedback/admin/                 danh sách góp ý (admin)       ?status=&kind=
PATCH /api/feedback/admin/<id>/            đổi trạng thái / ghi chú
GET   /api/feedback/admin/answers/         câu trả lời AI được đánh giá  ?value=-1|1&reviewed=0|1
POST  /api/feedback/admin/answers/<id>/    {action: reviewed | purge_cache}
GET   /api/feedback/admin/quiz/            câu ôn tập bị báo / chờ duyệt
PATCH /api/feedback/admin/quiz/<id>/       {status: active|disabled, reset_reports?}
GET   /api/feedback/admin/summary/         số lượng cho các tab
"""

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from learner.models import QuizItem
from tutor.models import AnswerCache, TutorMessage
from users.permissions import IsAdminRole

from .models import Feedback


class FeedbackAnonThrottle(AnonRateThrottle):
    rate = '10/hour'


class FeedbackUserThrottle(UserRateThrottle):
    rate = '30/hour'


def _feedback_data(f: Feedback) -> dict:
    return {
        'id': f.id,
        'kind': f.kind,
        'message': f.message,
        'email': f.email or (f.user.email if f.user else ''),
        'user_name': (getattr(f.user, 'name', '') or '') if f.user else '',
        'is_guest': f.user_id is None,
        'page_url': f.page_url,
        'status': f.status,
        'admin_note': f.admin_note,
        'created_at': f.created_at,
    }


class SubmitFeedbackView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [FeedbackAnonThrottle, FeedbackUserThrottle]

    class Input(serializers.Serializer):
        kind = serializers.ChoiceField(choices=Feedback.Kind.choices, default=Feedback.Kind.OTHER)
        message = serializers.CharField(min_length=5, max_length=3000, trim_whitespace=True)
        email = serializers.EmailField(required=False, allow_blank=True)
        page_url = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        user = request.user if request.user.is_authenticated else None
        Feedback.objects.create(
            user=user,
            email=v.get('email', ''),
            kind=v['kind'],
            message=v['message'],
            page_url=v.get('page_url', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:300],
        )
        return Response({'ok': True}, status=status.HTTP_201_CREATED)


class AdminFeedbackListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = Feedback.objects.select_related('user')
        p = request.query_params
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        if p.get('kind'):
            qs = qs.filter(kind=p['kind'])
        counts = dict(Feedback.objects.values_list('status').annotate(n=Count('id')))
        return Response({'counts': counts, 'results': [_feedback_data(f) for f in qs[:300]]})


class AdminFeedbackDetailView(APIView):
    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        status = serializers.ChoiceField(choices=Feedback.Status.choices, required=False)
        admin_note = serializers.CharField(required=False, allow_blank=True, max_length=3000)

    def patch(self, request, pk):
        f = get_object_or_404(Feedback, pk=pk)
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        for key, value in data.validated_data.items():
            setattr(f, key, value)
        f.handled_by = request.user
        f.save()
        return Response(_feedback_data(f))


def _question_for(m: TutorMessage) -> str:
    prev = (
        TutorMessage.objects.filter(conversation_id=m.conversation_id, role='user', created_at__lte=m.created_at)
        .order_by('-created_at')
        .values_list('content', flat=True)
        .first()
    )
    return prev or ''


class AdminAnswersView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        p = request.query_params
        qs = (
            TutorMessage.objects.filter(role='assistant', feedback__isnull=False)
            .select_related('conversation__user', 'conversation__anatomy_model')
            .order_by('-created_at')
        )
        if p.get('value') in ('1', '-1'):
            qs = qs.filter(feedback=int(p['value']))
        if p.get('reviewed') in ('0', '1'):
            qs = qs.filter(feedback_reviewed=p['reviewed'] == '1')
        results = []
        for m in qs[:200]:
            model = m.conversation.anatomy_model
            results.append({
                'id': m.id,
                'value': m.feedback,
                'note': m.feedback_note,
                'reviewed': m.feedback_reviewed,
                'question': _question_for(m),
                'answer': m.content,
                'status': m.status,
                'from_cache': m.from_cache,
                'citations': m.citations,
                'model': {'uid': model.sketchfab_uid, 'title': model.title_vi or model.title} if model else None,
                'user_email': m.conversation.user.email,
                'created_at': m.created_at,
            })
        return Response({'results': results})


class AdminAnswerActionView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        m = get_object_or_404(TutorMessage, pk=pk, role='assistant')
        action = request.data.get('action')
        purged = 0
        if action == 'purge_cache':
            # Không cho câu trả lời này được dùng lại cho người khác
            purged, _ = AnswerCache.objects.filter(answer=m.content).delete()
        elif action != 'reviewed':
            return Response({'detail': 'Thao tác không hợp lệ.'}, status=400)
        m.feedback_reviewed = True
        m.save(update_fields=['feedback_reviewed'])
        return Response({'reviewed': True, 'purged': purged})


def _quiz_data(q: QuizItem) -> dict:
    return {
        'id': q.id,
        'kind': q.kind,
        'question': q.question,
        'options': q.options,
        'correct_index': q.correct_index,
        'explanation': q.explanation,
        'status': q.status,
        'reports': q.reports,
        'served': q.served,
        'correct_count': q.correct_count,
        'structure': {'id': q.structure_id, 'name': q.structure.name_vi or q.structure.name_en},
        'created_at': q.created_at,
    }


class AdminQuizView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = QuizItem.objects.select_related('structure').filter(Q(reports__gt=0) | Q(status=QuizItem.Status.REVIEW))
        if request.query_params.get('status'):
            qs = qs.filter(status=request.query_params['status'])
        return Response({'results': [_quiz_data(q) for q in qs.order_by('-reports', '-created_at')[:200]]})


class AdminQuizDetailView(APIView):
    permission_classes = [IsAdminRole]

    class Input(serializers.Serializer):
        status = serializers.ChoiceField(choices=QuizItem.Status.choices, required=False)
        reset_reports = serializers.BooleanField(required=False, default=False)

    def patch(self, request, pk):
        q = get_object_or_404(QuizItem.objects.select_related('structure'), pk=pk)
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        if 'status' in v:
            q.status = v['status']
        if v.get('reset_reports'):
            q.reports = 0
        q.save(update_fields=['status', 'reports'])
        return Response(_quiz_data(q))


class AdminSummaryView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        answers = TutorMessage.objects.filter(role='assistant', feedback__isnull=False)
        return Response({
            'feedback_new': Feedback.objects.filter(status=Feedback.Status.NEW).count(),
            'answers_down_open': answers.filter(feedback=-1, feedback_reviewed=False).count(),
            'answers_up': answers.filter(feedback=1).count(),
            'answers_down': answers.filter(feedback=-1).count(),
            'quiz_open': QuizItem.objects.filter(Q(status=QuizItem.Status.REVIEW) | Q(reports__gt=0, status=QuizItem.Status.ACTIVE)).count(),
        })

"""API hồ sơ học tập ("AI hiểu gì về bạn") + phiên ôn tập thích ứng."""

from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_gateway.services import AIError
from anatomy.models import AnatomyModel
from users.permissions import is_admin

from .models import ConceptMastery, LearnerProfile, Misconception, QuizAttempt, QuizItem, ReviewSession
from .services import (
    ReviewError, due_count, get_item, grade, mastery_rows, plan_session, profile_of, public_item, reset_profile,
)


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearnerProfile
        fields = ['level', 'style', 'goals', 'updated_at']
        read_only_fields = ['updated_at']


class LearnerProfileView(APIView):
    """GET / PATCH / DELETE /api/learner/profile/  — "AI hiểu gì về bạn" (xem, sửa, xóa được)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        rows = mastery_rows(user)
        attempts = QuizAttempt.objects.filter(user=user)
        total = attempts.count()
        return Response({
            'preferences': ProfileSerializer(profile_of(user)).data,
            'choices': {
                'level': LearnerProfile.Level.choices,
                'style': LearnerProfile.Style.choices,
            },
            'stats': {
                'concepts': len(rows),
                'mastered': sum(1 for r in rows if r['box'] >= 4),
                'due_now': due_count(user),
                'attempts': total,
                'accuracy': round(attempts.filter(correct=True).count() / total, 3) if total else None,
            },
            'mastery': rows,
            'misconceptions': [
                {
                    'id': m.id, 'text': m.text, 'evidence': m.evidence, 'status': m.status, 'source': m.source,
                    'structure': (m.structure.name_vi or m.structure.name_en) if m.structure else '',
                    'updated_at': m.updated_at,
                }
                for m in Misconception.objects.filter(user=user).select_related('structure')[:50]
            ],
        })

    def patch(self, request):
        serializer = ProfileSerializer(profile_of(request.user), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        reset_profile(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MisconceptionView(APIView):
    """PATCH {status: active|resolved} / DELETE /api/learner/misconceptions/<id>/"""

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        m = get_object_or_404(Misconception, pk=pk, user=request.user)
        value = request.data.get('status')
        if value not in Misconception.Status.values:
            return Response({'detail': 'Trạng thái không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
        m.status = value
        m.save(update_fields=['status', 'updated_at'])
        return Response({'id': m.id, 'status': m.status})

    def delete(self, request, pk):
        get_object_or_404(Misconception, pk=pk, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DueView(APIView):
    """GET /api/learner/due/  -> số bộ phận đến hạn ôn lại (cho dashboard)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'due': due_count(request.user), 'concepts': ConceptMastery.objects.filter(user=request.user).count()})


def _session_data(s: ReviewSession) -> dict:
    return {
        'id': str(s.id), 'plan': s.plan, 'position': s.position, 'correct': s.correct,
        'finished': s.finished_at is not None, 'model_uid': s.anatomy_model.sketchfab_uid if s.anatomy_model else None,
    }


class StartReviewView(APIView):
    """POST /api/learner/review/start/  {model_uid, size?}"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        qs = AnatomyModel.objects.all() if is_admin(request.user) else AnatomyModel.objects.filter(is_published=True)
        model = get_object_or_404(qs, sketchfab_uid=request.data.get('model_uid', ''))
        try:
            size = max(3, min(10, int(request.data.get('size') or 5)))
        except (TypeError, ValueError):
            size = 5
        try:
            session = plan_session(request.user, model, size)
        except ReviewError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_session_data(session), status=status.HTTP_201_CREATED)


class ReviewItemView(APIView):
    """POST /api/learner/review/<id>/item/  -> câu hỏi ở vị trí hiện tại (AI ra đề nếu kho chưa có)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        session = get_object_or_404(ReviewSession, pk=pk, user=request.user)
        if session.finished_at or session.position >= len(session.plan):
            return Response({'detail': 'Phiên ôn tập đã kết thúc.'}, status=status.HTTP_409_CONFLICT)
        entry = session.plan[session.position]
        if entry.get('item_id'):
            item = QuizItem.objects.filter(pk=entry['item_id']).select_related('structure').first()
        else:
            item = None
        if item is None:
            try:
                item = get_item(request.user, session, entry)
            except (ReviewError, AIError) as exc:
                return Response({'detail': str(exc)}, status=getattr(exc, 'status_code', status.HTTP_502_BAD_GATEWAY))
            session.plan[session.position] = {**entry, 'item_id': item.id, 'kind': item.kind}
            session.save(update_fields=['plan'])
        return Response({'position': session.position, 'total': len(session.plan), 'reason': entry.get('reason', ''),
                         'item': public_item(item)})


class ReviewAnswerView(APIView):
    """POST /api/learner/review/<id>/answer/  {item_id, answer: {choice} | {picked_index} | {text}}"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        session = get_object_or_404(ReviewSession, pk=pk, user=request.user)
        if session.finished_at or session.position >= len(session.plan):
            return Response({'detail': 'Phiên ôn tập đã kết thúc.'}, status=status.HTTP_409_CONFLICT)
        entry = session.plan[session.position]
        item_id = request.data.get('item_id')
        if entry.get('item_id') != item_id:
            return Response({'detail': 'Câu hỏi không khớp với phiên ôn tập.'}, status=status.HTTP_409_CONFLICT)
        item = get_object_or_404(QuizItem.objects.select_related('structure'), pk=item_id)
        answer = request.data.get('answer') if isinstance(request.data.get('answer'), dict) else {}
        try:
            result = grade(request.user, session, item, answer)
        except (ReviewError, AIError) as exc:
            return Response({'detail': str(exc)}, status=getattr(exc, 'status_code', status.HTTP_502_BAD_GATEWAY))
        session.refresh_from_db()
        return Response({**result, 'session': _session_data(session)})


class ReportItemView(APIView):
    """POST /api/learner/items/<id>/report/  — báo câu hỏi sai; 3 lần -> tự tắt chờ admin xem."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        item = get_object_or_404(QuizItem, pk=pk)
        item.reports += 1
        if item.reports >= 3 and item.source == 'ai':
            item.status = QuizItem.Status.REVIEW
        item.save(update_fields=['reports', 'status'])
        return Response({'reported': True})


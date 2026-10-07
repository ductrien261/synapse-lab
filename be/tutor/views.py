"""
API gia sư "Hỏi AI".

POST /api/tutor/ask/  {question, model_uid?, part_index?, conversation_id?}
    -> text/event-stream. Sự kiện: meta, status, token, replace, done, error
"""

import json

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from ai_gateway.models import AIRequest
from ai_gateway.services import AIError, call_ai, iter_sse, open_ai_stream, record, record_cached
from anatomy.models import AnatomyModel
from users.permissions import is_admin

from .models import AnswerCache, Conversation, TutorMessage
from .services import cache_key, cacheable, cached_answer, history, learner_context, model_parts


class EventStreamRenderer(BaseRenderer):
    """
    Cho DRF chấp nhận header Accept: text/event-stream (không có -> lỗi 406).
    Luồng trả lời thật là StreamingHttpResponse nên không đi qua đây; chỉ lỗi (400/429...) mới dùng -> trả JSON.
    """

    media_type = 'text/event-stream'
    format = 'sse'
    charset = 'utf-8'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return json.dumps(data, ensure_ascii=False, default=str).encode('utf-8')


class AskThrottle(UserRateThrottle):
    rate = '20/min'


def _sse(event: str, data: dict) -> str:
    return f'event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n'


def _stream_response(gen) -> StreamingHttpResponse:
    res = StreamingHttpResponse(gen, content_type='text/event-stream; charset=utf-8')
    res['Cache-Control'] = 'no-cache'
    res['X-Accel-Buffering'] = 'no'
    return res


def message_data(m: TutorMessage) -> dict:
    qc = m.quick_check
    if qc and 'answered_index' not in qc:
        qc = {k: v for k, v in qc.items() if k not in ('correct_index', 'explanation')}  # chưa trả lời -> ẩn đáp án
    activity = m.action_data
    if activity and m.action_kind == 'quiz' and isinstance(activity.get('questions'), list):
        activity = {
            **activity,
            'questions': [
                question if 'answered_index' in question else {
                    k: v for k, v in question.items()
                    if k not in ('correct_index', 'explanation', 'source_quote', 'source_n')
                }
                for question in activity['questions']
            ],
        }
    elif activity and m.action_kind in ('quiz', 'scenario') and 'answered_index' not in activity:
        activity = {k: v for k, v in activity.items() if k not in ('correct_index', 'explanation')}
    return {
        'id': m.id, 'role': m.role, 'content': m.content, 'status': m.status, 'part_index': m.part_index,
        'citations': m.citations, 'highlights': m.highlights, 'suggestions': m.suggestions,
        'from_cache': m.from_cache, 'feedback': m.feedback, 'quick_check': qc,
        'action_kind': m.action_kind, 'action_data': activity, 'created_at': m.created_at,
    }


class ActionView(APIView):
    """Create a sourced anatomy activity and save it in the tutor conversation."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [AskThrottle]

    class Input(serializers.Serializer):
        action = serializers.ChoiceField(choices=['quiz', 'scenario', 'summary', 'flashcards'])
        model_uid = serializers.CharField(max_length=32)
        part_index = serializers.IntegerField(required=False, allow_null=True, min_value=0)
        conversation_id = serializers.UUIDField(required=False, allow_null=True)
        topic = serializers.CharField(max_length=160, required=False, allow_blank=True)
        style = serializers.ChoiceField(choices=['clinic', 'imaging'], required=False, default='clinic')
        question_count = serializers.IntegerField(required=False, default=5, min_value=1, max_value=10)
        quiz_style = serializers.ChoiceField(choices=['theory', 'application', 'practice'], required=False, default='theory')
        card_count = serializers.IntegerField(required=False, default=5, min_value=1, max_value=10)
        focus_note = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def post(self, request):
        serializer = self.Input(data=request.data)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        qs = AnatomyModel.objects.all() if is_admin(request.user) else AnatomyModel.objects.filter(is_published=True)
        model = get_object_or_404(qs, sketchfab_uid=v['model_uid'])
        conversation = None
        if v.get('conversation_id'):
            conversation = get_object_or_404(Conversation, pk=v['conversation_id'], user=request.user,
                                             anatomy_model=model)
        part_index = v.get('part_index')
        part = next((p for p in model_parts(model) if p['index'] == part_index), None)
        subject = v.get('topic') or (part or {}).get('name_vi') or (part or {}).get('name_en') or model.title_vi or model.title
        labels = {'quiz': 'Trắc nghiệm', 'scenario': 'Tình huống', 'summary': 'Tóm tắt', 'flashcards': 'Flashcard'}
        question = f"{labels[v['action']]} về {subject}"
        if v['action'] == 'quiz':
            question = f"Tạo {v['question_count']} câu trắc nghiệm về {subject}"
        elif v['action'] == 'flashcards':
            question = f"Tạo {v['card_count']} flashcard về {subject}"
            if v.get('focus_note'):
                question += f" · {v['focus_note']}"
        question = question[:1000]
        try:
            result = call_ai('/v1/tutor/action', {
                'action': v['action'], 'model_title': model.title_vi or model.title,
                'part': part, 'topic': v.get('topic', ''), 'style': v['style'],
                'question_count': v['question_count'], 'quiz_style': v['quiz_style'],
                'card_count': v['card_count'], 'focus_note': v.get('focus_note', ''),
            }, user=request.user, feature='tutor')
        except AIError as exc:
            return Response({'detail': str(exc)}, status=exc.status_code)
        if result.get('status') != 'ok':
            return Response({'detail': result.get('error') or 'Chưa tạo được nội dung có nguồn.'},
                            status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        if v['action'] == 'quiz' and (
            not isinstance(result.get('data'), dict)
            or not isinstance(result['data'].get('questions'), list)
            or len(result['data']['questions']) != v['question_count']
        ):
            return Response({'detail': 'Bộ câu hỏi chưa đúng số lượng yêu cầu. Vui lòng thử lại.'},
                            status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        if v['action'] == 'flashcards' and (
            not isinstance(result.get('data'), dict)
            or not isinstance(result['data'].get('cards'), list)
            or len(result['data']['cards']) != v['card_count']
        ):
            return Response({'detail': 'Bộ flashcard chưa đúng số lượng yêu cầu. Vui lòng thử lại.'},
                            status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        if conversation is None:
            conversation = Conversation.objects.create(user=request.user, anatomy_model=model, title=question[:200])
        user_message = TutorMessage.objects.create(conversation=conversation, role='user', content=question,
                                                  part_index=part_index)
        activity = result['data']
        if v['action'] == 'quiz':
            content = '\n'.join(item['question'] for item in activity['questions'])
        elif v['action'] == 'scenario':
            content = activity['question']
        elif v['action'] == 'summary':
            content = '\n'.join(activity['items'])
        else:
            content = '\n'.join(f"{card['front']} — {card['back']}" for card in activity['cards'])
        msg = TutorMessage.objects.create(
            conversation=conversation, role='assistant', content=content, status='ok',
            part_index=part_index, citations=result['citations'], action_kind=v['action'], action_data=activity,
        )
        Conversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now())
        return Response({'conversation_id': str(conversation.pk), 'user_message': message_data(user_message),
                         'message': message_data(msg)},
                        status=status.HTTP_201_CREATED)


class ActionAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        msg = get_object_or_404(TutorMessage, pk=pk, conversation__user=request.user,
                                role='assistant', action_kind__in=('quiz', 'scenario'))
        data = msg.action_data or {}
        questions = data.get('questions') if msg.action_kind == 'quiz' else None
        try:
            question_index = int(request.data.get('question_index', 0))
        except (TypeError, ValueError):
            return Response({'detail': 'Câu hỏi không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
        if questions is not None and question_index not in range(len(questions)):
            return Response({'detail': 'Câu hỏi không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
        target = questions[question_index] if questions is not None else data
        try:
            choice = int(request.data.get('choice'))
        except (TypeError, ValueError):
            return Response({'detail': 'Đáp án không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
        if choice not in range(len(target.get('options', []))):
            return Response({'detail': 'Đáp án không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
        if 'answered_index' not in target:
            target['answered_index'] = choice
            target['correct'] = choice == target['correct_index']
            msg.action_data = data
            msg.save(update_fields=['action_data'])
        return Response(message_data(msg)['action_data'])


class AskView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer, EventStreamRenderer]
    throttle_classes = [AskThrottle]

    class Input(serializers.Serializer):
        question = serializers.CharField(max_length=1000, trim_whitespace=True)
        model_uid = serializers.CharField(max_length=32, required=False, allow_blank=True)
        part_index = serializers.IntegerField(required=False, allow_null=True, min_value=0)
        conversation_id = serializers.UUIDField(required=False, allow_null=True)

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        user = request.user

        model = None
        if v.get('model_uid'):
            qs = AnatomyModel.objects.all() if is_admin(user) else AnatomyModel.objects.filter(is_published=True)
            model = get_object_or_404(qs, sketchfab_uid=v['model_uid'])

        if v.get('conversation_id'):
            conversation = get_object_or_404(Conversation, pk=v['conversation_id'], user=user)
        else:
            conversation = Conversation.objects.create(user=user, anatomy_model=model, title=v['question'][:200])

        parts = model_parts(model)
        part_index = v.get('part_index')
        part = next((p for p in parts if p['index'] == part_index), None)
        past = history(conversation)
        learner = learner_context(user, model)
        key = cache_key(v['question'], model.sketchfab_uid if model else '', part_index, learner['track'],
                        f"{learner.get('level', '')}|{learner.get('style', '')}")
        use_cache = not past and cacheable(learner)

        # 1) Câu hỏi đầu tiên đã có người hỏi (và người học chưa có ghi nhận riêng) -> trả lời ngay, 0 token
        cached = cached_answer(key) if use_cache else None
        if cached:
            TutorMessage.objects.create(conversation=conversation, role='user', content=v['question'], part_index=part_index)
            msg = TutorMessage.objects.create(
                conversation=conversation, role='assistant', content=cached.answer, status=cached.status,
                citations=cached.citations, highlights=cached.highlights, suggestions=cached.suggestions, from_cache=True,
            )
            AnswerCache.objects.filter(pk=cached.pk).update(hit_count=cached.hit_count + 1)
            record_cached(user, 'tutor')
            Conversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now())

            def replay():
                yield _sse('meta', {'conversation_id': str(conversation.pk)})
                yield _sse('token', {'text': cached.answer})
                yield _sse('done', message_data(msg))

            return _stream_response(replay())

        # 2) Gọi gia sư (stream)
        payload = {
            'question': v['question'], 'history': past, 'learner': learner,
            'model_title': (model.title_vi or model.title) if model else '', 'part': part, 'parts': parts, 'scope': 'med',
        }
        try:
            upstream = open_ai_stream('/v1/tutor/ask', payload, user=user, feature='tutor')
        except AIError as exc:
            return Response({'detail': str(exc)}, status=exc.status_code)

        TutorMessage.objects.create(conversation=conversation, role='user', content=v['question'], part_index=part_index)
        started = timezone.now()

        def relay():
            yield _sse('meta', {'conversation_id': str(conversation.pk)})
            finished = False
            try:
                for event, body in iter_sse(upstream):
                    if event in ('token', 'replace', 'status'):
                        yield _sse(event, {'text': body.get('text', '')})
                    elif event == 'done':
                        finished = True
                        latency = int((timezone.now() - started).total_seconds() * 1000)
                        req = record(user, 'tutor', body.get('meta'), latency_ms=latency)
                        status_ = body.get('status') or 'ok'
                        msg = TutorMessage.objects.create(
                            conversation=conversation, role='assistant', content=body.get('answer', ''),
                            status=status_ if status_ in TutorMessage.Status.values else 'ok',
                            citations=body.get('citations', []), highlights=body.get('highlights', []),
                            suggestions=body.get('suggestions', []), ai_request=req,
                        )
                        if use_cache and status_ == 'ok':
                            AnswerCache.objects.update_or_create(key=key, defaults={
                                'question': v['question'], 'answer': msg.content, 'citations': msg.citations,
                                'highlights': msg.highlights, 'suggestions': msg.suggestions, 'status': status_,
                                'prompt_version': body.get('prompt_version', ''), 'hit_count': 0,
                            })
                        Conversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now())
                        yield _sse('done', message_data(msg))
                    elif event == 'error':
                        finished = True
                        record(user, 'tutor', body.get('meta'), status=AIRequest.Status.ERROR, error=body.get('message', ''))
                        yield _sse('error', {'message': body.get('message') or 'Gia sư đang gặp lỗi.'})
            finally:
                upstream.close()
                if not finished:
                    record(user, 'tutor', None, status=AIRequest.Status.ERROR, counted=False, error='Mất kết nối giữa chừng')

        return _stream_response(relay())


class ConversationListView(APIView):
    """GET /api/tutor/conversations/?model=<uid>"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Conversation.objects.filter(user=request.user)
        if request.query_params.get('model'):
            qs = qs.filter(anatomy_model__sketchfab_uid=request.query_params['model'])
        return Response([
            {'id': str(c.id), 'title': c.title, 'updated_at': c.updated_at} for c in qs[:30]
        ])


class ConversationDetailView(APIView):
    """GET / DELETE /api/tutor/conversations/<id>/"""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        c = get_object_or_404(Conversation, pk=pk, user=request.user)
        return Response({'id': str(c.id), 'title': c.title, 'messages': [message_data(m) for m in c.messages.all()]})

    def delete(self, request, pk):
        get_object_or_404(Conversation, pk=pk, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FeedbackView(APIView):
    """POST /api/tutor/messages/<id>/feedback/  {value: 1 | -1 | 0, note?}"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        m = get_object_or_404(TutorMessage, pk=pk, conversation__user=request.user, role='assistant')
        value = request.data.get('value')
        m.feedback = value if value in (1, -1) else None
        m.feedback_note = str(request.data.get('note') or '')[:500]
        m.save(update_fields=['feedback', 'feedback_note'])
        return Response({'feedback': m.feedback})


class QuickCheckView(APIView):
    """
    POST /api/tutor/messages/<id>/quick-check/          -> tạo 1 câu trắc nghiệm từ nguồn của câu trả lời
    POST /api/tutor/messages/<id>/quick-check/answer/  {choice} -> chấm
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action=None):
        m = get_object_or_404(TutorMessage, pk=pk, conversation__user=request.user, role='assistant')
        if action == 'answer':
            qc = m.quick_check or {}
            try:
                choice = int(request.data.get('choice'))
            except (TypeError, ValueError):
                return Response({'detail': 'choice không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)
            if 'correct_index' not in qc:
                return Response({'detail': 'Chưa có câu hỏi.'}, status=status.HTTP_400_BAD_REQUEST)
            if 'answered_index' not in qc:
                qc['answered_index'] = choice
                qc['correct'] = choice == qc['correct_index']
                qc['answered_at'] = timezone.now().isoformat()
                m.quick_check = qc
                m.save(update_fields=['quick_check'])
                _update_mastery_from_quick_check(request.user, m, qc['correct'])
            return Response(message_data(m)['quick_check'])

        if m.quick_check:
            return Response(message_data(m)['quick_check'])
        if not m.citations:
            return Response({'detail': 'Câu trả lời này không có nguồn giáo trình để ra câu hỏi.'}, status=status.HTTP_400_BAD_REQUEST)
        question = m.conversation.messages.filter(role='user', created_at__lte=m.created_at).order_by('-created_at').first()
        try:
            data = call_ai('/v1/tutor/quick-check', {
                'topic': question.content if question else '',
                'answer': m.content,
                'sources': [{'heading': c.get('heading', ''), 'excerpt': c.get('excerpt', '')} for c in m.citations],
            }, user=request.user, feature='quiz')
        except AIError as exc:
            return Response({'detail': str(exc)}, status=exc.status_code)
        if data.get('status') != 'ok':
            return Response({'detail': data.get('error') or 'Chưa tạo được câu hỏi.'}, status=status.HTTP_502_BAD_GATEWAY)
        # Nguồn trong câu hỏi đánh số theo danh sách citations của câu trả lời -> đổi về số [n] gốc
        mapping = {i: c['n'] for i, c in enumerate(m.citations, start=1)}
        explanation = data['explanation']
        for i, n in sorted(mapping.items(), reverse=True):
            explanation = explanation.replace(f'[{i}]', f'[§{n}]')
        m.quick_check = {
            'question': data['question'], 'options': data['options'], 'correct_index': data['correct_index'],
            'explanation': explanation.replace('[§', '['),
        }
        m.save(update_fields=['quick_check'])
        return Response(message_data(m)['quick_check'])


def _update_mastery_from_quick_check(user, message: TutorMessage, correct: bool):
    """Kiểm tra nhanh về bộ phận đang chọn -> cập nhật hồ sơ học tập của bộ phận đó."""
    from learner.services import record_result

    question = message.conversation.messages.filter(role='user', created_at__lte=message.created_at).order_by('-created_at').first()
    model = message.conversation.anatomy_model
    if not question or question.part_index is None or model is None:
        return
    annotation = model.annotations.filter(index=question.part_index, structure__isnull=False).select_related('structure').first()
    if annotation:
        record_result(user, annotation.structure, 1.0 if correct else 0.0)

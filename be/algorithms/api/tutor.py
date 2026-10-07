"""Learning actions for published algorithm lessons only."""

from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from ai_gateway.services import AIError, call_ai
from algorithms.models import AlgorithmContent
from core.models import ContentStatus
from knowledge.models import Document


class AlgorithmTutorThrottle(UserRateThrottle):
    rate = '10/min'


class AlgorithmTutorView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AlgorithmTutorThrottle]

    class Input(serializers.Serializer):
        class CodeSelection(serializers.Serializer):
            start_line = serializers.IntegerField(min_value=1)
            end_line = serializers.IntegerField(min_value=1)
            source = serializers.CharField(max_length=12000, required=False)

        class QuizOptions(serializers.Serializer):
            count = serializers.IntegerField(min_value=1, max_value=5)
            difficulty = serializers.ChoiceField(choices=('easy', 'medium', 'hard'))
            focus = serializers.ChoiceField(choices=('mixed', 'problem', 'principle', 'trace', 'complexity', 'application'))
            topic = serializers.CharField(max_length=200, required=False, allow_blank=True)

        class ScenarioOptions(serializers.Serializer):
            topic = serializers.CharField(max_length=160)
            style = serializers.ChoiceField(choices=('trace', 'application'))

        class FlashcardOptions(serializers.Serializer):
            topic = serializers.CharField(max_length=160)
            count = serializers.IntegerField(min_value=1, max_value=10)
            focus = serializers.CharField(max_length=200, required=False, allow_blank=True)

        action = serializers.ChoiceField(choices=('ask', 'quiz', 'scenario', 'summary', 'hint', 'explain_code', 'flashcards'))
        question = serializers.CharField(max_length=500, required=False, allow_blank=True)
        frame = serializers.DictField(required=False, allow_null=True)
        quiz_options = QuizOptions(required=False)
        scenario_options = ScenarioOptions(required=False)
        flashcard_options = FlashcardOptions(required=False)
        code_selection = CodeSelection(required=False)

        def validate(self, attrs):
            if attrs['action'] == 'ask' and not attrs.get('question', '').strip():
                raise serializers.ValidationError({'question': 'Hãy nhập câu hỏi trước khi gửi.'})
            if attrs['action'] == 'hint' and not attrs.get('frame'):
                raise serializers.ValidationError({'frame': 'Hãy chọn một bước mô phỏng trước khi xin gợi ý.'})
            if attrs['action'] == 'quiz' and not attrs.get('quiz_options'):
                raise serializers.ValidationError({'quiz_options': 'Hãy chọn số câu, độ khó và nội dung trước khi tạo.'})
            if attrs['action'] == 'scenario' and not attrs.get('scenario_options'):
                raise serializers.ValidationError({'scenario_options': 'Hãy chọn chủ đề và kiểu tình huống trước khi tạo.'})
            if attrs['action'] == 'flashcards' and not attrs.get('flashcard_options'):
                raise serializers.ValidationError({'flashcard_options': 'Hãy chọn chủ đề và số thẻ trước khi tạo.'})
            if attrs['action'] == 'explain_code' and not attrs.get('code_selection'):
                raise serializers.ValidationError({'code_selection': 'Hãy chọn một đoạn mã trước khi xin giải thích.'})
            return attrs

    def post(self, request, category_key, algorithm_key):
        input_data = self.Input(data=request.data)
        input_data.is_valid(raise_exception=True)
        content = get_object_or_404(
            AlgorithmContent.objects.select_related('algorithm__category'),
            algorithm__category__key=category_key,
            algorithm__key=algorithm_key,
            algorithm__is_published=True,
            status=ContentStatus.PUBLISHED,
        )
        theory = [block for block in content.lesson_blocks
                  if isinstance(block, dict) and block.get('kind') == 'theory' and str(block.get('text', '')).strip()]
        if not theory:
            return Response({'detail': 'Bài học này chưa có lý thuyết để AI tham chiếu.'}, status=status.HTTP_409_CONFLICT)

        code_selection = None
        source = ''
        if input_data.validated_data['action'] == 'explain_code':
            selected = input_data.validated_data['code_selection']
            lesson_source = str(content.code_lesson.get('source', ''))
            approved_sources = {lesson_source}
            for trace in content.simulation.get('samples', {}).values():
                code = trace.get('code', {}) if isinstance(trace, dict) else {}
                if code.get('language') == 'cpp' and isinstance(code.get('source'), str):
                    approved_sources.add(code['source'])
            source = selected.get('source') or lesson_source
            if not source or source not in approved_sources:
                return Response({'detail': 'Đoạn mã không thuộc bài học đã xuất bản.'}, status=status.HTTP_400_BAD_REQUEST)
            lines = source.splitlines()
            start, end = selected['start_line'], selected['end_line']
            if end < start or end - start >= 30 or end > len(lines):
                return Response({'detail': 'Chỉ chọn tối đa 30 dòng thuộc mã nguồn của bài học.'}, status=status.HTTP_400_BAD_REQUEST)
            code_selection = {
                'start_line': start,
                'end_line': end,
                'code': '\n'.join(f'{i + 1}: {lines[i]}' for i in range(start - 1, end)),
            }

        raw_frame = {} if input_data.validated_data['action'] == 'flashcards' else input_data.validated_data.get('frame') or {}
        frame = {
            'message': str(raw_frame.get('message', ''))[:400],
            'code_line': str(raw_frame.get('code_line', ''))[:20],
            'values': str(raw_frame.get('values', ''))[:800],
        } if raw_frame else None
        sources = [
            {'title': str(block.get('title', 'Bài học'))[:120], 'text': str(block['text'])[:1100],
             'url': str(block.get('source', ''))[:600], 'kind': 'lesson'}
            for block in theory[:8]
        ]
        references = content.algorithm.references.select_related('document', 'chunk').filter(
            document__status=Document.Status.READY, document__scope=Document.Scope.CS,
        )[:6]
        for reference in references:
            excerpt = (reference.chunk.content if reference.chunk_id else reference.excerpt).strip()
            if excerpt:
                sources.append({
                    'title': reference.document.title[:120], 'text': excerpt[:1100],
                    'url': (reference.chunk.url if reference.chunk_id else '') or reference.document.source_url,
                    'kind': 'document',
                })
        lesson = {
            'name': content.algorithm.name,
            'theory': [{'title': block['title'][:120], 'text': block['text'][:1100]} for block in theory[:8]],
            'sources': sources,
            'pseudocode': str(content.lesson_fields.get('pseudocode', ''))[:1800],
            'code': (source if code_selection else str(content.code_lesson.get('source', '')))[:3000],
            'complexity': {'best': content.time_best, 'average': content.time_average,
                           'worst': content.time_worst, 'space': content.space},
        }
        try:
            result = call_ai('/v1/algorithm-tutor/generate', {
                'action': input_data.validated_data['action'],
                'question': input_data.validated_data.get('question', ''),
                'quiz_options': input_data.validated_data.get('quiz_options'),
                'scenario_options': input_data.validated_data.get('scenario_options'),
                'flashcard_options': input_data.validated_data.get('flashcard_options'),
                'code_selection': code_selection,
                'frame': frame,
                'lesson': lesson,
            }, user=request.user, feature='algorithm_tutor')
        except AIError as exc:
            return Response({'detail': str(exc)}, status=exc.status_code)
        return Response({key: value for key, value in result.items() if key != 'meta'})

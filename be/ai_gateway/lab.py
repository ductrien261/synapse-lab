"""Trợ lý giải thích cho Phòng thí nghiệm ảo.

Frontend gửi trạng thái mô phỏng đã tính sẵn; trợ lý chỉ đọc và giải thích, không tính vật lý.
"""

import json

from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .services import AIError, call_ai

MAX_STATE_CHARS = 4000


class LabExplainThrottle(UserRateThrottle):
    rate = '10/min'


class LabExplainView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [LabExplainThrottle]

    class Input(serializers.Serializer):
        lab = serializers.ChoiceField(choices=('arm', 'car', 'iot'))
        mode = serializers.ChoiceField(choices=('explain', 'ask', 'hint'))
        stage = serializers.CharField(max_length=40, required=False, allow_blank=True)
        state = serializers.DictField()
        question = serializers.CharField(max_length=500, required=False, allow_blank=True)

        def validate_state(self, value):
            if len(json.dumps(value, ensure_ascii=False)) > MAX_STATE_CHARS:
                raise serializers.ValidationError('Trạng thái mô phỏng quá lớn.')
            return value

        def validate(self, attrs):
            if attrs['mode'] == 'ask' and not attrs.get('question', '').strip():
                raise serializers.ValidationError({'question': 'Hãy nhập câu hỏi trước khi gửi.'})
            return attrs

    def post(self, request):
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        try:
            result = call_ai('/v1/lab/explain', {
                'lab': v['lab'], 'mode': v['mode'], 'stage': v.get('stage', ''),
                'state': v['state'], 'question': v.get('question', ''),
            }, user=request.user, feature='lab_explain')
        except AIError as exc:
            return Response({'detail': str(exc)}, status=exc.status_code)
        return Response({key: value for key, value in result.items() if key != 'meta'})

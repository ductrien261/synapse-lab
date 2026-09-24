from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from ai_gateway.services import AIError

from .services import MAX_CHARS, translate


class TranslateThrottle(UserRateThrottle):
    rate = '30/min'


class TranslateRequest(serializers.Serializer):
    text = serializers.CharField(max_length=MAX_CHARS, trim_whitespace=True)
    target = serializers.ChoiceField(choices=['vi', 'en'], default='vi')


class TranslateView(APIView):
    """POST /api/translate/  {text, target='vi'} -> {translated, cached}"""

    permission_classes = [IsAuthenticated]
    throttle_classes = [TranslateThrottle]

    def post(self, request):
        body = TranslateRequest(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            translated, cached = translate(body.validated_data['text'], body.validated_data['target'], request.user)
        except AIError as exc:  # hết hạn mức (429), service AI chưa chạy (503), lỗi khác (502)
            return Response({'detail': str(exc)}, status=exc.status_code)
        return Response({'translated': translated, 'cached': cached})

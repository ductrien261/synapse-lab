from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .services import MAX_CHARS, TranslationError, TranslationNotConfigured, translate


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
            translated, cached = translate(body.validated_data['text'], body.validated_data['target'])
        except TranslationNotConfigured as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except TranslationError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'translated': translated, 'cached': cached})

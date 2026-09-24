"""API: hạn mức của tôi + trang admin "AI & Chi phí"."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdminRole

from .models import AIRequest, AISettings, ModelPrice, UserAIQuota
from .services import ai_health, day_start, quota_status

User = get_user_model()


class MyQuotaView(APIView):
    """GET /api/ai/quota/  -> {unlimited, limit, used, remaining, resets_at}"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(quota_status(request.user).as_dict())


# ------------------------------------------------------------
# Admin
# ------------------------------------------------------------

def _range(request) -> tuple[int, timezone.datetime]:
    try:
        days = max(1, min(90, int(request.query_params.get('days') or 7)))
    except ValueError:
        days = 7
    return days, day_start() - timedelta(days=days - 1)


def _totals(qs) -> dict:
    agg = qs.aggregate(
        requests=Count('id'),
        input_tokens=Sum('input_tokens'),
        output_tokens=Sum('output_tokens'),
        embed_tokens=Sum('embed_tokens'),
        llm_calls=Sum('llm_calls'),
        cost_usd=Sum('cost_usd'),
        avg_latency_ms=Avg('latency_ms', filter=~Q(status=AIRequest.Status.CACHED)),
        errors=Count('id', filter=Q(status=AIRequest.Status.ERROR)),
        cached=Count('id', filter=Q(status=AIRequest.Status.CACHED)),
        quota_blocked=Count('id', filter=Q(status=AIRequest.Status.QUOTA)),
    )
    out = {k: (v or 0) for k, v in agg.items()}
    out['cost_usd'] = float(out['cost_usd'] or Decimal('0'))
    out['avg_latency_ms'] = int(out['avg_latency_ms'] or 0)
    out['tokens'] = out['input_tokens'] + out['output_tokens']
    out['error_rate'] = round(out['errors'] / out['requests'], 4) if out['requests'] else 0
    return out


class OverviewView(APIView):
    """GET /api/ai/admin/overview/?days=7"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        days, since = _range(request)
        qs = AIRequest.objects.filter(created_at__gte=since)

        daily_rows = {
            r['day']: r
            for r in qs.annotate(day=TruncDate('created_at')).values('day').annotate(
                requests=Count('id'), input_tokens=Sum('input_tokens'), output_tokens=Sum('output_tokens'), cost=Sum('cost_usd'),
            )
        }
        daily = []
        for i in range(days):
            d = (since + timedelta(days=i)).date()
            r = daily_rows.get(d, {})
            daily.append({
                'date': d.isoformat(), 'requests': r.get('requests', 0),
                'input_tokens': r.get('input_tokens') or 0, 'output_tokens': r.get('output_tokens') or 0,
                'cost_usd': float(r.get('cost') or 0),
            })

        by_feature = [
            {**{k: (v or 0) for k, v in r.items()}, 'cost_usd': float(r['cost_usd'] or 0)}
            for r in qs.values('feature').annotate(
                requests=Count('id'), input_tokens=Sum('input_tokens'), output_tokens=Sum('output_tokens'),
                cost_usd=Sum('cost_usd'), errors=Count('id', filter=Q(status=AIRequest.Status.ERROR)),
                cached=Count('id', filter=Q(status=AIRequest.Status.CACHED)),
            ).order_by('-requests')
        ]

        default_limit = AISettings.get().default_daily_tokens
        overrides = dict(UserAIQuota.objects.values_list('user_id', 'daily_tokens'))
        top_users = []
        for r in (
            qs.filter(user__isnull=False).values('user_id', 'user__email', 'user__first_name', 'user__last_name', 'user__role')
            .annotate(requests=Count('id'), input_tokens=Sum('input_tokens'), output_tokens=Sum('output_tokens'), cost_usd=Sum('cost_usd'))
            .order_by('-output_tokens', '-input_tokens')[:10]
        ):
            limit = overrides.get(r['user_id'])
            top_users.append({
                'id': str(r['user_id']), 'email': r['user__email'],
                'name': f"{r['user__first_name']} {r['user__last_name']}".strip(), 'role': r['user__role'],
                'requests': r['requests'], 'tokens': (r['input_tokens'] or 0) + (r['output_tokens'] or 0),
                'cost_usd': float(r['cost_usd'] or 0),
                'daily_limit': limit if limit is not None else default_limit, 'custom_limit': limit is not None,
            })

        priced = {(p.provider, p.model) for p in ModelPrice.objects.all()}
        used_models = set()
        for steps in qs.exclude(steps=[]).values_list('steps', flat=True)[:500]:
            for s in steps or []:
                if s.get('model'):
                    used_models.add((s.get('provider', ''), s['model']))
        missing = [{'provider': p, 'model': m} for p, m in sorted(used_models - priced)]

        return Response({
            'days': days,
            'totals': _totals(qs),
            'today': _totals(AIRequest.objects.filter(created_at__gte=day_start())),
            'daily': daily,
            'by_feature': by_feature,
            'top_users': top_users,
            'missing_prices': missing,
            'service': ai_health(),
        })


class RequestLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True, default='')
    total_tokens = serializers.IntegerField(read_only=True)

    class Meta:
        model = AIRequest
        fields = [
            'id', 'user', 'user_email', 'feature', 'status', 'counted', 'input_tokens', 'output_tokens', 'embed_tokens',
            'total_tokens', 'llm_calls', 'cost_usd', 'latency_ms', 'models_used', 'steps', 'trace_id', 'trace_url',
            'error', 'created_at',
        ]


class RequestLogView(APIView):
    """GET /api/ai/admin/requests/?feature=&status=&user=&page=1"""

    permission_classes = [IsAdminRole]
    PAGE = 50

    def get(self, request):
        p = request.query_params
        qs = AIRequest.objects.select_related('user')
        if p.get('feature'):
            qs = qs.filter(feature=p['feature'])
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        if p.get('user'):
            qs = qs.filter(Q(user__email__icontains=p['user']) | Q(user__first_name__icontains=p['user']) | Q(user__last_name__icontains=p['user']))
        try:
            page = max(1, int(p.get('page') or 1))
        except ValueError:
            page = 1
        total = qs.count()
        rows = qs[(page - 1) * self.PAGE: page * self.PAGE]
        return Response({'count': total, 'page': page, 'page_size': self.PAGE, 'results': RequestLogSerializer(rows, many=True).data})


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISettings
        fields = ['default_daily_tokens', 'llm_judge_enabled', 'updated_at']
        read_only_fields = ['updated_at']


class SettingsView(APIView):
    """GET / PATCH /api/ai/admin/settings/"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(SettingsSerializer(AISettings.get()).data)

    def patch(self, request):
        serializer = SettingsSerializer(AISettings.get(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelPrice
        fields = ['id', 'provider', 'model', 'input_per_million', 'output_per_million', 'updated_at']
        read_only_fields = ['updated_at']


class PriceListView(APIView):
    """GET / POST /api/ai/admin/prices/"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        return Response(PriceSerializer(ModelPrice.objects.all(), many=True).data)

    def post(self, request):
        serializer = PriceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PriceDetailView(APIView):
    """PATCH / DELETE /api/ai/admin/prices/<id>/"""

    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        serializer = PriceSerializer(get_object_or_404(ModelPrice, pk=pk), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        get_object_or_404(ModelPrice, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserQuotaView(APIView):
    """PUT /api/ai/admin/users/<id>/quota/  {daily_tokens: số | null (= dùng mặc định)}"""

    permission_classes = [IsAdminRole]

    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        value = request.data.get('daily_tokens')
        if value in (None, ''):
            UserAIQuota.objects.filter(user=user).delete()
        else:
            try:
                value = int(value)
            except (TypeError, ValueError):
                return Response({'detail': 'daily_tokens phải là số nguyên.'}, status=status.HTTP_400_BAD_REQUEST)
            if value < 0 or value > 10_000_000:
                return Response({'detail': 'Hạn mức không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
            UserAIQuota.objects.update_or_create(user=user, defaults={'daily_tokens': value})
        return Response(quota_status(user).as_dict())

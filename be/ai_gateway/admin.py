from django.contrib import admin

from .models import AIRequest, AISettings, ModelPrice, UserAIQuota


@admin.register(AIRequest)
class AIRequestAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'feature', 'status', 'user', 'input_tokens', 'output_tokens', 'cost_usd', 'latency_ms')
    list_filter = ('feature', 'status')
    search_fields = ('user__email', 'trace_id')
    readonly_fields = [f.name for f in AIRequest._meta.fields]


admin.site.register(AISettings)
admin.site.register(ModelPrice)
admin.site.register(UserAIQuota)

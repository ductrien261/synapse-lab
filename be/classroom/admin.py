from django.contrib import admin

from .models import ClassMembership, Classroom


class ClassMembershipInline(admin.TabularInline):
    model = ClassMembership
    extra = 0


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'owner', 'track', 'is_archived', 'created_at')
    list_filter = ('track', 'is_archived')
    search_fields = ('name', 'code', 'owner__email')
    inlines = [ClassMembershipInline]

from django.urls import path

from .views import (
    ClassroomDetailView,
    ClassroomJoinView,
    LessonPlanView,
    LessonResourceDetailView,
    LessonResourceListCreateView,
    LessonSectionDetailView,
    LessonSectionListCreateView,
    ClassroomListCreateView,
    BigBlueButtonStatusView,
    SessionEndView,
    SessionJoinView,
    SessionLeaveView,
    SessionStartView,
)

urlpatterns = [
    path('', ClassroomListCreateView.as_view(), name='classroom-list-create'),
    path('join/', ClassroomJoinView.as_view(), name='classroom-join'),
    path('bbb/status/', BigBlueButtonStatusView.as_view(), name='bbb-status'),
    path('<str:code>/', ClassroomDetailView.as_view(), name='classroom-detail'),
    path('<str:code>/lesson-plan/', LessonPlanView.as_view(), name='lesson-plan'),
    path('<str:code>/lesson-plan/sections/', LessonSectionListCreateView.as_view(), name='lesson-section-list-create'),
    path('<str:code>/lesson-plan/sections/<uuid:section_id>/', LessonSectionDetailView.as_view(), name='lesson-section-detail'),
    path('<str:code>/lesson-plan/sections/<uuid:section_id>/resources/', LessonResourceListCreateView.as_view(), name='lesson-resource-list-create'),
    path('<str:code>/lesson-plan/resources/<uuid:resource_id>/', LessonResourceDetailView.as_view(), name='lesson-resource-detail'),
    path('<str:code>/sessions/start/', SessionStartView.as_view(), name='session-start'),
    path('<str:code>/sessions/join/', SessionJoinView.as_view(), name='session-join'),
    path('<str:code>/sessions/leave/', SessionLeaveView.as_view(), name='session-leave'),
    path('<str:code>/sessions/end/', SessionEndView.as_view(), name='session-end'),
]

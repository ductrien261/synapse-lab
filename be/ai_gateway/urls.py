from django.urls import path

from . import views as v

urlpatterns = [
    path('quota/', v.MyQuotaView.as_view()),
    path('admin/overview/', v.OverviewView.as_view()),
    path('admin/requests/', v.RequestLogView.as_view()),
    path('admin/settings/', v.SettingsView.as_view()),
    path('admin/prices/', v.PriceListView.as_view()),
    path('admin/prices/<int:pk>/', v.PriceDetailView.as_view()),
    path('admin/users/<uuid:pk>/quota/', v.UserQuotaView.as_view()),
]

from django.urls import path
from . import views

urlpatterns = [
    path('reports/', views.FileReportView.as_view(), name='report-create'),
    path('reports/queue/', views.ReportListView.as_view(), name='report-queue'),
    path('reports/<int:pk>/', views.ReportDetailView.as_view(), name='report-detail'),
    path('reports/<int:pk>/action/', views.TakeActionView.as_view(), name='report-action'),
]

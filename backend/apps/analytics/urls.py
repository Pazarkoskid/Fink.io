from django.urls import path
from . import views

urlpatterns = [
    path('leaderboard/', views.LeaderboardView.as_view(), name='leaderboard'),
    path('me/', views.MyStatsView.as_view(), name='my-stats'),
    path('quiz/<int:pk>/', views.QuizAnalyticsView.as_view(), name='quiz-analytics'),
    path('platform/', views.PlatformStatsView.as_view(), name='platform-stats'),
]

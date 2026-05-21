from django.urls import path
from . import views

urlpatterns = [
    # listing & search
    path('', views.QuizListView.as_view(), name='quiz-list'),
    path('mine/', views.MyQuizzesView.as_view(), name='my-quizzes'),
    path('saved/', views.SavedQuizzesView.as_view(), name='saved-quizzes'),

    # manual create
    path('create/', views.QuizCreateView.as_view(), name='quiz-create'),

    # AI generate
    path('generate/', views.GenerateQuizFromMaterialView.as_view(), name='quiz-generate'),

    # detail / edit / delete
    path('<int:pk>/', views.QuizDetailView.as_view(), name='quiz-detail'),
    path('<int:pk>/publish/', views.PublishQuizView.as_view(), name='quiz-publish'),
    path('<int:pk>/like/', views.ToggleLikeView.as_view(), name='quiz-like'),
    path('<int:pk>/save/', views.ToggleSaveView.as_view(), name='quiz-save'),

    # play
    path('<int:pk>/play/', views.StartPlayView.as_view(), name='quiz-play'),
    path('<int:pk>/submit/', views.SubmitAttemptView.as_view(), name='quiz-submit'),

    # history
    path('attempts/', views.MyAttemptsView.as_view(), name='my-attempts'),
]

from django.urls import path
from . import views

urlpatterns = [
    # Subjects
    path('subjects/', views.SubjectListView.as_view(), name='subject-list'),
    path('subjects/<int:pk>/', views.SubjectDetailView.as_view(), name='subject-detail'),

    # Public databases catalog
    path('databases/', views.PublicMaterialListView.as_view(), name='material-databases'),
    path('databases/by-user/<int:user_id>/', views.UserMaterialsView.as_view(), name='material-by-user'),

    # Material CRUD (own)
    path('', views.MaterialListCreateView.as_view(), name='material-list'),
    path('<int:pk>/', views.MaterialDetailView.as_view(), name='material-detail'),
    path('<int:pk>/re-extract/', views.MaterialReExtractView.as_view(), name='material-re-extract'),

    # Engagement
    path('<int:pk>/like/', views.ToggleMaterialLikeView.as_view(), name='material-like'),
    path('<int:pk>/save/', views.ToggleSaveMaterialView.as_view(), name='material-save'),
    path('<int:pk>/download/', views.TrackDownloadView.as_view(), name='material-download'),

    # Saved (my)
    path('saved/', views.MySavedMaterialsView.as_view(), name='material-saved'),
]
